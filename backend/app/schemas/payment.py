from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.payment import PaymentMethod, PaymentStatus


class PaymentBase(BaseModel):
    membership_id: int
    amount: Decimal = Field(..., ge=0, examples=[2500000.00])
    payment_method: PaymentMethod = PaymentMethod.CASH
    status: PaymentStatus = PaymentStatus.COMPLETED
    transaction_code: Optional[str] = Field(None, examples=["VNPAY-20261025-99881"])


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    transaction_code: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: int
    payment_date: datetime

    class Config:
        from_attributes = True
