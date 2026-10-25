import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    LATE = "late"
    ABSENT = "absent"


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    member_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    schedule_id = Column(
        Integer,
        ForeignKey("workout_schedules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    check_in_time = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    status = Column(
        Enum(AttendanceStatus, native_enum=False),
        nullable=False,
        default=AttendanceStatus.PRESENT,
        index=True,
    )
    is_valid_entry = Column(Boolean, default=True, nullable=False)  # Kiểm soát lượt tập hợp lệ hay cảnh báo
    validation_message = Column(String(255), nullable=True)         # Thông điệp kiểm tra (VD: 'Gói tập hợp lệ', 'Gói tập đã hết hạn')
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    member = relationship("User", back_populates="attendances")
    schedule = relationship("WorkoutSchedule", back_populates="attendances")
