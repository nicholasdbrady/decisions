from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "JEV Command Canvas"
    app_environment: str = "development"
    allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    decision_endpoint: AnyHttpUrl = AnyHttpUrl(
        "https://your-foundry-resource.services.ai.azure.com/providers/microsoft/v1/systemone"
    )
    decision_model_deployment: str = "Decision-1"
    decision_token_scope: str = "https://cognitiveservices.azure.com/.default"
    decision_timeout_seconds: float = 8.0

    foundry_project_endpoint: AnyHttpUrl = AnyHttpUrl(
        "https://your-foundry-resource.services.ai.azure.com/api/projects/your-project"
    )
    foundry_model_deployment: str = "gpt-6-luna"
    foundry_openai_base_url: AnyHttpUrl = AnyHttpUrl(
        "https://your-foundry-resource.services.ai.azure.com/api/projects/your-project/openai/v1"
    )
    foundry_tenant_id: str | None = None
    foundry_subscription_id: str | None = None
    foundry_token_scope: str = "https://ai.azure.com/.default"
    foundry_reasoning_effort: str = "low"
    foundry_timeout_seconds: float = 45.0
    foundry_code_timeout_seconds: float = 120.0
    decision_ingredient_threshold: float = 0.72

    otel_enabled: bool = True
    otel_service_name: str = "jev-command-canvas"
    otel_service_version: str = "0.1.0"
    # This is a demo, so prompts, card values, and Python the model ran are captured.
    otel_sensitive_data: bool = False
    otel_console_exporters: bool = False
    otel_exporter_otlp_endpoint: str | None = None
    otel_excluded_urls: str = "health"
    otel_use_foundry_app_insights: bool = True
    applicationinsights_connection_string: str | None = None

    # External data providers. Missing keys degrade the card, never break it.
    openxchangerates_app_id: str | None = None
    openweather_api_key: str | None = None
    # Weather questions that name no place are asked about here.
    default_place_name: str = "Redmond"
    default_place_state: str | None = "WA"
    default_place_country: str = "US"
    default_place_lat: float = 47.6740
    default_place_lon: float = -122.1215
    default_country: str = "US"
    default_subdivision: str | None = None
    default_weather_units: str = "imperial"
    currency_cache_seconds: float = 3600.0
    weather_cache_seconds: float = 600.0
    provider_timeout_seconds: float = 6.0

    classification_confidence_threshold: float = 0.58
    classification_margin_threshold: float = 0.12
    classification_hysteresis_margin: float = 0.08


@lru_cache
def get_settings() -> Settings:
    return Settings()
