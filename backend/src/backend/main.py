from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from agent_framework_ag_ui import add_agent_framework_fastapi_endpoint
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend import units
from backend.a2ui_agent import A2uiCanvasAgent, Services
from backend.authored_agent import build_authored_agent
from backend.compute import convert_units
from backend.config import get_settings
from backend.contracts import ClassificationRequest, ClassificationResult
from backend.expand import (
    ExpandRequest,
    ExpandResponse,
    ExpansionService,
    build_expansion_service,
)
from backend.extract import ExtractionService, ExtractRequest, ExtractResponse
from backend.jev import (
    DecideRequest,
    DecideResponse,
    JevProtocolError,
    JudgeRequest,
    JudgeResponse,
    OpenRouterJevClassifier,
)
from backend.luna import FoundryTokenProvider, LunaClient
from backend.providers import Providers
from backend.telemetry import configure_telemetry, instrument_app, telemetry_state


class ConvertRequest(BaseModel):
    value: float
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    luna = LunaClient(settings, FoundryTokenProvider(settings))
    app.state.providers = Providers.build(settings)
    app.state.jev_classifier = OpenRouterJevClassifier(settings)
    app.state.expansion = build_expansion_service(settings, luna)
    app.state.extraction = ExtractionService(luna, app.state.providers)
    yield


settings = get_settings()
configure_telemetry(settings)
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
instrument_app(app, settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
add_agent_framework_fastapi_endpoint(
    app,
    A2uiCanvasAgent(
        Services(
            lambda: {
                "jev_classifier": app.state.jev_classifier,
                "extraction": app.state.extraction,
                "providers": getattr(app.state, "providers", None),
            }
        )
    ),
    path="/api/ag-ui",
    allow_origins=settings.allowed_origins,
)
# Baseline for the Phase 0 latency comparison: Luna authors the surface itself.
add_agent_framework_fastapi_endpoint(
    app,
    build_authored_agent(settings),
    path="/api/ag-ui/authored",
    allow_origins=settings.allowed_origins,
    a2ui_config={"inject_a2ui_tool": True},
)


@app.get("/health")
async def health(request: Request) -> dict[str, object]:
    providers: Providers | None = getattr(request.app.state, "providers", None)
    return {
        "status": "ok",
        "environment": settings.app_environment,
        "jev_configured": bool(settings.openrouter_api_key),
        "jev_model": settings.jev_model,
        "foundry_project_endpoint": str(settings.foundry_project_endpoint),
        "foundry_model_deployment": settings.foundry_model_deployment,
        "providers": providers.status() if providers else {},
        "telemetry": telemetry_state(),
    }


@app.post("/api/classify", response_model=ClassificationResult)
async def classify(
    payload: ClassificationRequest,
    request: Request,
) -> ClassificationResult:
    classifier: OpenRouterJevClassifier = request.app.state.jev_classifier
    try:
        return await classifier.classify(payload)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except JevProtocolError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@app.post("/api/expand", response_model=ExpandResponse)
async def expand(payload: ExpandRequest, request: Request) -> ExpandResponse:
    service: ExpansionService = request.app.state.expansion
    return await service.expand(payload)


@app.post("/api/extract", response_model=ExtractResponse)
async def extract(payload: ExtractRequest, request: Request) -> ExtractResponse:
    service: ExtractionService = request.app.state.extraction
    return await service.extract(payload)


@app.get("/api/units")
async def unit_catalog() -> dict[str, object]:
    """The curated unit taxonomy behind the convert card's dropdowns."""
    return {"categories": units.catalog()}


@app.post("/api/convert")
async def convert(payload: ConvertRequest, request: Request) -> dict[str, object]:
    """Recompute a conversion when someone drives the card's controls directly."""
    providers: Providers | None = getattr(request.app.state, "providers", None)
    return await convert_units(payload.value, payload.source, payload.target, providers)


@app.post("/api/judge", response_model=JudgeResponse)
async def judge(payload: JudgeRequest, request: Request) -> JudgeResponse:
    classifier: OpenRouterJevClassifier = request.app.state.jev_classifier
    try:
        return await classifier.judge(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except JevProtocolError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@app.post("/api/decide", response_model=DecideResponse)
async def decide(payload: DecideRequest, request: Request) -> DecideResponse:
    """Let JEV settle a closed-set presentation question instead of hardcoding one."""
    classifier: OpenRouterJevClassifier = request.app.state.jev_classifier
    try:
        return await classifier.decide(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except JevProtocolError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


def run() -> None:
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
