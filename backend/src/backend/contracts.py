from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class SchemaId(StrEnum):
    EVENT = "event"
    REMINDER = "reminder"
    SHOPPING = "shopping"
    CHECKLIST = "checklist"
    TIMER = "timer"
    COUNTDOWN = "countdown"
    HABIT = "habit"
    NOTE = "note"
    CALC = "calc"
    COLOR = "color"
    SPLIT = "split"
    EXPENSE = "expense"
    CONVERT = "convert"
    RANDOM = "random"
    CONTACT = "contact"
    GOAL = "goal"
    BOOKMARK = "bookmark"
    POLL = "poll"
    TRIP = "trip"
    WEATHER = "weather"
    PASSWORD = "password"


class LifecycleStatus(StrEnum):
    DRAFT = "draft"
    READY = "ready"
    SAVED = "saved"
    COMPLETED = "completed"
    ERROR = "error"


class ViewAction(ContractModel):
    id: str
    label: str
    kind: Literal["primary", "secondary", "destructive"] = "secondary"
    disabled: bool = False


class BaseView(ContractModel):
    contract_version: Literal["1.0"] = "1.0"
    generation: int = Field(ge=0)
    title: str
    status: LifecycleStatus = LifecycleStatus.DRAFT
    actions: list[ViewAction] = Field(default_factory=list)


class EventData(ContractModel):
    title: str = ""
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    location: str | None = None
    attendees: list[str] = Field(default_factory=list)
    notes: str | None = None


class EventView(BaseView):
    kind: Literal[SchemaId.EVENT] = Field(default=SchemaId.EVENT, alias="schema")
    data: EventData


class ReminderData(ContractModel):
    text: str = ""
    due_at: datetime | None = None
    recurrence: str | None = None
    completed: bool = False


class ReminderView(BaseView):
    kind: Literal[SchemaId.REMINDER] = Field(default=SchemaId.REMINDER, alias="schema")
    data: ReminderData


class ChecklistItem(ContractModel):
    id: str
    text: str
    completed: bool = False


class ChecklistData(ContractModel):
    items: list[ChecklistItem] = Field(default_factory=list)


class ChecklistView(BaseView):
    kind: Literal[SchemaId.CHECKLIST] = Field(
        default=SchemaId.CHECKLIST, alias="schema"
    )
    data: ChecklistData


class ShoppingData(ContractModel):
    items: list[ChecklistItem] = Field(default_factory=list)
    store: str | None = None


class ShoppingView(BaseView):
    kind: Literal[SchemaId.SHOPPING] = Field(default=SchemaId.SHOPPING, alias="schema")
    data: ShoppingData


class CountdownData(ContractModel):
    target: str = ""
    target_date: datetime | None = None


class CountdownView(BaseView):
    kind: Literal[SchemaId.COUNTDOWN] = Field(
        default=SchemaId.COUNTDOWN, alias="schema"
    )
    data: CountdownData


class NoteData(ContractModel):
    title: str = ""
    body: str = ""
    tags: list[str] = Field(default_factory=list)


class NoteView(BaseView):
    kind: Literal[SchemaId.NOTE] = Field(default=SchemaId.NOTE, alias="schema")
    data: NoteData


class CalcData(ContractModel):
    expression: str = ""
    result: float | None = None


class CalcView(BaseView):
    kind: Literal[SchemaId.CALC] = Field(default=SchemaId.CALC, alias="schema")
    data: CalcData


class TimerData(ContractModel):
    label: str = ""
    duration_seconds: int = Field(default=0, ge=0)
    remaining_seconds: int = Field(default=0, ge=0)
    running: bool = False


class TimerView(BaseView):
    kind: Literal[SchemaId.TIMER] = Field(default=SchemaId.TIMER, alias="schema")
    data: TimerData


class HabitData(ContractModel):
    name: str = ""
    cadence: str = ""
    target_count: int = Field(default=1, ge=1)
    completed_count: int = Field(default=0, ge=0)


class HabitView(BaseView):
    kind: Literal[SchemaId.HABIT] = Field(default=SchemaId.HABIT, alias="schema")
    data: HabitData


class ColorSwatch(ContractModel):
    hex: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    label: str


class ColorData(ContractModel):
    source: str = ""
    swatches: list[ColorSwatch] = Field(default_factory=list)


class ColorView(BaseView):
    kind: Literal[SchemaId.COLOR] = Field(default=SchemaId.COLOR, alias="schema")
    data: ColorData


class SplitParticipant(ContractModel):
    name: str
    share: float = Field(ge=0)


class SplitData(ContractModel):
    amount: float = Field(default=0, ge=0)
    currency: str = "USD"
    participants: list[SplitParticipant] = Field(default_factory=list)


class SplitView(BaseView):
    kind: Literal[SchemaId.SPLIT] = Field(default=SchemaId.SPLIT, alias="schema")
    data: SplitData


class ExpenseData(ContractModel):
    description: str = ""
    amount: float = Field(default=0, ge=0)
    currency: str = "USD"
    category: str | None = None
    merchant: str | None = None


class ExpenseView(BaseView):
    kind: Literal[SchemaId.EXPENSE] = Field(
        default=SchemaId.EXPENSE, alias="schema"
    )
    data: ExpenseData


class ConvertData(ContractModel):
    value: float = 0
    from_unit: str = ""
    to_unit: str = ""
    result: float | None = None


class ConvertView(BaseView):
    kind: Literal[SchemaId.CONVERT] = Field(
        default=SchemaId.CONVERT, alias="schema"
    )
    data: ConvertData


class RandomData(ContractModel):
    kind: str = "dice"
    options: list[str] = Field(default_factory=list)
    result: str | None = None


class RandomView(BaseView):
    kind: Literal[SchemaId.RANDOM] = Field(default=SchemaId.RANDOM, alias="schema")
    data: RandomData


class PasswordData(ContractModel):
    length: int = 16
    uppercase: bool = True
    lowercase: bool = True
    numbers: bool = True
    symbols: bool = True
    exclude_similar: bool = False
    exclude_ambiguous: bool = False


class PasswordView(BaseView):
    kind: Literal[SchemaId.PASSWORD] = Field(default=SchemaId.PASSWORD, alias="schema")
    data: PasswordData


class ContactData(ContractModel):
    name: str = ""
    email: str | None = None
    phone: str | None = None
    organization: str | None = None
    notes: str | None = None


class ContactView(BaseView):
    kind: Literal[SchemaId.CONTACT] = Field(
        default=SchemaId.CONTACT, alias="schema"
    )
    data: ContactData


class GoalData(ContractModel):
    title: str = ""
    target: str | None = None
    target_date: datetime | None = None
    progress_percent: float = Field(default=0, ge=0, le=100)


class GoalView(BaseView):
    kind: Literal[SchemaId.GOAL] = Field(default=SchemaId.GOAL, alias="schema")
    data: GoalData


class BookmarkData(ContractModel):
    url: str = ""
    title: str = ""
    description: str | None = None
    tags: list[str] = Field(default_factory=list)


class BookmarkView(BaseView):
    kind: Literal[SchemaId.BOOKMARK] = Field(
        default=SchemaId.BOOKMARK, alias="schema"
    )
    data: BookmarkData


class PollOption(ContractModel):
    id: str
    label: str
    votes: int = Field(default=0, ge=0)


class PollData(ContractModel):
    question: str = ""
    options: list[PollOption] = Field(default_factory=list)
    allow_multiple: bool = False


class PollView(BaseView):
    kind: Literal[SchemaId.POLL] = Field(default=SchemaId.POLL, alias="schema")
    data: PollData


class TripData(ContractModel):
    destination: str = ""
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    travelers: list[str] = Field(default_factory=list)
    notes: str | None = None


class TripView(BaseView):
    kind: Literal[SchemaId.TRIP] = Field(default=SchemaId.TRIP, alias="schema")
    data: TripData


UIViewValue = Annotated[
    EventView
    | ReminderView
    | ShoppingView
    | ChecklistView
    | TimerView
    | CountdownView
    | HabitView
    | NoteView
    | CalcView
    | ColorView
    | SplitView
    | ExpenseView
    | ConvertView
    | RandomView
    | ContactView
    | GoalView
    | BookmarkView
    | PollView
    | TripView
    | PasswordView,
    Field(discriminator="kind"),
]


class UIView(RootModel[UIViewValue]):
    root: UIViewValue


class ClassificationRequest(ContractModel):
    text: str = Field(min_length=1, max_length=4000)
    generation: int = Field(default=0, ge=0)
    current_schema: SchemaId | None = None


class CandidateProbability(ContractModel):
    kind: SchemaId = Field(alias="schema")
    probability: float = Field(ge=0, le=1)


class SwitchDecision(ContractModel):
    accepted: bool
    selected_schema: SchemaId | None
    reason: Literal[
        "initial_match",
        "same_schema",
        "below_confidence_threshold",
        "below_margin_threshold",
        "hysteresis_hold",
        "clear_switch",
    ]
    confidence: float = Field(ge=0, le=1)
    margin: float = Field(ge=0, le=1)


class ClassificationDiagnostics(ContractModel):
    request_id: str | None = None
    provider: str
    model: str
    latency_ms: int = Field(ge=0)
    input_tokens: int | None = Field(default=None, ge=0)
    output_tokens: int | None = Field(default=None, ge=0)
    cost: float | None = Field(default=None, ge=0)
    needs_clarification: float = Field(ge=0, le=1)
    has_enough_evidence: float = Field(ge=0, le=1)
    signals: dict[str, float] = Field(default_factory=dict)


class ClassificationResult(ContractModel):
    generation: int
    candidates: list[CandidateProbability]
    decision: SwitchDecision
    diagnostics: ClassificationDiagnostics
