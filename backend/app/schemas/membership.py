from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator
from app.models.membership import MembershipStatus
from app.schemas.package import PackageResponse


class MembershipBase(BaseModel):
    user_id: int
    package_id: int
    start_date: date
    end_date: date
    status: MembershipStatus = MembershipStatus.PENDING
    goal_notes: Optional[str] = None
    target_weight_kg: Optional[float] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be greater than or equal to start_date")
        return self


class MembershipCreate(MembershipBase):
    pass


class MembershipUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[MembershipStatus] = None
    goal_notes: Optional[str] = None
    target_weight_kg: Optional[float] = None


class MembershipRenewRequest(BaseModel):
    duration_days: int = Field(default=30, ge=1, le=730, description="Số ngày gia hạn thêm")
    custom_amount: Optional[Decimal] = None
    target_weight_kg: Optional[float] = None
    goal_notes: Optional[str] = None
    payment_method: str = "transfer"
    transaction_code: Optional[str] = None


class MembershipResponse(MembershipBase):
    id: int
    created_at: datetime
    package: Optional[PackageResponse] = None
    days_left: Optional[int] = None
    goal_notes: Optional[str] = None
    target_weight_kg: Optional[float] = None

    class Config:
        from_attributes = True
