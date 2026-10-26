import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class HourlyBookingType(str, enum.Enum):
    SELF_PRACTICE = "self_practice"
    PT_SESSION = "pt_session"


class HourlyBookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HourlyBooking(Base):
    __tablename__ = "hourly_bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booking_type = Column(String(50), nullable=False, default=HourlyBookingType.SELF_PRACTICE)
    package_title = Column(String(200), nullable=False)
    trainer_id = Column(
        Integer,
        ForeignKey("trainers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    booking_date = Column(String(50), nullable=False)  # Format: YYYY-MM-DD
    time_slot = Column(String(100), nullable=False)   # E.g: "08:00 - 10:00"
    duration_hours = Column(Integer, nullable=False, default=1)
    price = Column(Numeric(12, 2), nullable=False, default=0)
    status = Column(String(50), nullable=False, default=HourlyBookingStatus.CONFIRMED)
    payment_method = Column(String(50), nullable=False, default="vietqr_transfer")
    transaction_code = Column(String(100), nullable=True)
    ticket_code = Column(String(100), nullable=True, unique=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    trainer = relationship("Trainer", foreign_keys=[trainer_id])
