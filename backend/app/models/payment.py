import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    MOMO_VNPAY = "momo_vnpay"


class PaymentStatus(str, enum.Enum):
    COMPLETED = "completed"
    PENDING = "pending"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    membership_id = Column(
        Integer,
        ForeignKey("memberships.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    payment_method = Column(
        Enum(PaymentMethod, native_enum=False),
        nullable=False,
        default=PaymentMethod.CASH,
    )
    status = Column(
        Enum(PaymentStatus, native_enum=False),
        nullable=False,
        default=PaymentStatus.COMPLETED,
        index=True,
    )
    transaction_code = Column(String(100), unique=True, nullable=True)

    # Constraints
    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_payment_amount_non_negative"),
    )

    # Relationships
    membership = relationship("Membership", back_populates="payments")
