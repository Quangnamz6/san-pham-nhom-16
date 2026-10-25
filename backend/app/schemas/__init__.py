from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    Token,
    TokenPayload,
    LoginRequest,
)
from app.schemas.package import PackageCreate, PackageUpdate, PackageResponse
from app.schemas.membership import (
    MembershipCreate,
    MembershipUpdate,
    MembershipResponse,
)
from app.schemas.trainer import TrainerCreate, TrainerUpdate, TrainerResponse
from app.schemas.workout_schedule import (
    WorkoutScheduleCreate,
    WorkoutScheduleUpdate,
    WorkoutScheduleResponse,
)
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceUpdate,
    AttendanceResponse,
)
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.schemas.dashboard import (
    MemberDetailResponse,
    MembershipRenewalRequest,
    DashboardStatsResponse,
)
from app.schemas.ai import (
    WorkoutRecommendationRequest,
    WorkoutRecommendationResponse,
    ReminderMessageRequest,
    ReminderMessageResponse,
    ProgressSummaryRequest,
    ProgressSummaryResponse,
)
from app.schemas.ai_log import (
    AIWorkoutRequest,
    AIDietRequest,
    AILogCreate,
    AILogResponse,
)

__all__ = [
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "Token",
    "TokenPayload",
    "LoginRequest",
    "PackageCreate",
    "PackageUpdate",
    "PackageResponse",
    "MembershipCreate",
    "MembershipUpdate",
    "MembershipResponse",
    "TrainerCreate",
    "TrainerUpdate",
    "TrainerResponse",
    "WorkoutScheduleCreate",
    "WorkoutScheduleUpdate",
    "WorkoutScheduleResponse",
    "AttendanceCreate",
    "AttendanceUpdate",
    "AttendanceResponse",
    "PaymentCreate",
    "PaymentUpdate",
    "PaymentResponse",
    "MemberDetailResponse",
    "MembershipRenewalRequest",
    "DashboardStatsResponse",
    "WorkoutRecommendationRequest",
    "WorkoutRecommendationResponse",
    "ReminderMessageRequest",
    "ReminderMessageResponse",
    "ProgressSummaryRequest",
    "ProgressSummaryResponse",
    "AIWorkoutRequest",
    "AIDietRequest",
    "AILogCreate",
    "AILogResponse",
]
