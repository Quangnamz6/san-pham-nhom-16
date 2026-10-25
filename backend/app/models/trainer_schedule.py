import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    Text,
    ForeignKey,
    Enum,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class TrainerScheduleStatus(str, enum.Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TrainerSchedule(Base):
    __tablename__ = "trainer_schedules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pt_id = Column(
        Integer,
        ForeignKey("trainers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    member_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        Enum(TrainerScheduleStatus, native_enum=False),
        nullable=False,
        default=TrainerScheduleStatus.BOOKED,
        index=True,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Database Constraints chống trùng lịch PT ở cấp CSDL
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="chk_pt_schedule_time_order"),
        UniqueConstraint("pt_id", "start_time", name="uq_pt_exact_start_time"),
    )

    # Relationships
    pt = relationship("Trainer")
    member = relationship("User")
