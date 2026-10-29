import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, Text, ForeignKey, Enum, CheckConstraint, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class ScheduleStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    CHECKED_IN = "checked_in"


class WorkoutSchedule(Base):
    __tablename__ = "workout_schedules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    member_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pt_id = Column(
        Integer,
        ForeignKey("trainers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        Enum(ScheduleStatus, native_enum=False),
        nullable=False,
        default=ScheduleStatus.SCHEDULED,
        index=True,
    )
    notes = Column(Text, nullable=True)
    is_reminder_sent = Column(
        Boolean, nullable=False, default=False, server_default="0", index=True
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Constraints
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="chk_schedule_time_order"),
    )

    # Relationships
    member = relationship(
        "User", foreign_keys=[member_id], back_populates="member_schedules"
    )
    pt = relationship("Trainer", foreign_keys=[pt_id], back_populates="assigned_schedules")
    attendances = relationship("Attendance", back_populates="schedule")
