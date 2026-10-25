import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, Enum, CheckConstraint, String, Float
from sqlalchemy.orm import relationship
from app.core.database import Base


class MembershipStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    PENDING = "pending"
    CANCELLED = "cancelled"


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    package_id = Column(
        Integer,
        ForeignKey("packages.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(
        Enum(MembershipStatus, native_enum=False),
        nullable=False,
        default=MembershipStatus.PENDING,
        index=True,
    )
    max_sessions = Column(Integer, nullable=True)          # Tổng số lượt tập được phép (nếu là gói theo lượt)
    remaining_sessions = Column(Integer, nullable=True)    # Số lượt tập còn lại
    goal_notes = Column(String(255), nullable=True)        # Mục tiêu tập luyện
    target_weight_kg = Column(Float, nullable=True)        # Số kg tăng/giảm mục tiêu
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Constraints
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="chk_membership_dates_valid"),
    )

    # Relationships
    user = relationship("User", back_populates="memberships")
    package = relationship("Package", back_populates="memberships")
    payments = relationship(
        "Payment", back_populates="membership", cascade="all, delete-orphan"
    )
