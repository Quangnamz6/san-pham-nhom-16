from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel
from app.schemas.user import UserResponse
from app.schemas.package import PackageResponse
from app.schemas.membership import MembershipResponse


class MemberFilterParams(BaseModel):
    query: Optional[str] = None
    status: Optional[str] = None
    skip: int = 0
    limit: int = 50


class MemberDetailResponse(UserResponse):
    active_membership: Optional[MembershipResponse] = None
    total_checkins: int = 0
    total_spent: Decimal = Decimal("0.00")


class MembershipRenewalRequest(BaseModel):
    membership_id: Optional[int] = None
    user_id: Optional[int] = None
    package_id: int
    duration_days: Optional[int] = None
    custom_amount: Optional[Decimal] = None
    target_weight_kg: Optional[float] = None
    goal_notes: Optional[str] = None
    payment_method: str = "cash"
    transaction_code: Optional[str] = None


class ExpiringMemberItem(BaseModel):
    user_id: int
    full_name: str
    email: str
    phone: Optional[str]
    package_name: str
    end_date: date
    days_left: int


class DashboardStatsResponse(BaseModel):
    total_members: int
    new_members_this_month: int
    active_memberships: int
    expiring_soon_count: int
    expiring_members: List[ExpiringMemberItem]
    total_revenue: Decimal
    revenue_this_month: Decimal
    today_checkins: int
    today_schedules: int
