import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class PromptType(str, enum.Enum):
    RECOMMEND_WORKOUT = "recommend_workout"
    GENERATE_REMINDER = "generate_reminder"
    SUMMARIZE_PROGRESS = "summarize_progress"
    WORKOUT_PLAN = "workout_plan"
    DIET_RECOMMENDATION = "diet_recommendation"
    PROGRESS_ANALYSIS = "progress_analysis"
    GENERAL_CHAT = "general_chat"


class AILog(Base):
    __tablename__ = "ai_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    prompt_type = Column(
        Enum(PromptType, native_enum=False),
        nullable=False,
        default=PromptType.RECOMMEND_WORKOUT,
        index=True,
    )
    input_data = Column(JSON, nullable=False)
    ai_response = Column(JSON, nullable=False)
    model_name = Column(String(100), nullable=False, default="gpt-4o-mini")
    tokens_used = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)  # Hiệu năng phản hồi của AI tính bằng milliseconds
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="ai_logs")
