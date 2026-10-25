from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.database import get_db
from app.core.deps import get_current_staff
from app.models.user import User, UserRole
from app.models.membership import Membership, MembershipStatus
from app.models.package import Package
from app.models.payment import Payment, PaymentStatus
from app.models.attendance import Attendance
from app.models.workout_schedule import WorkoutSchedule
from app.schemas.dashboard import DashboardStatsResponse, ExpiringMemberItem

router = APIRouter()


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """
    Thống kê tổng quan cho Admin và Lễ tân:
    - Tổng hội viên và số hội viên mới trong tháng
    - Số lượng và danh sách hội viên sắp hết hạn gói tập trong 7 ngày
    - Tổng doanh thu và doanh thu tháng hiện tại
    - Số lượt điểm danh check-in và lịch tập PT trong ngày
    """
    today = date.today()
    first_day_of_month = today.replace(day=1)
    seven_days_later = today + timedelta(days=7)

    # 1. Members count
    total_members = (
        db.query(func.count(User.id))
        .filter(User.role == UserRole.MEMBER)
        .scalar() or 0
    )

    new_members_this_month = (
        db.query(func.count(User.id))
        .filter(
            User.role == UserRole.MEMBER,
            User.created_at >= datetime.combine(first_day_of_month, datetime.min.time()),
        )
        .scalar() or 0
    )

    # 2. Active memberships count
    active_memberships = (
        db.query(func.count(Membership.id))
        .filter(
            Membership.status == MembershipStatus.ACTIVE,
            Membership.end_date >= today,
        )
        .scalar() or 0
    )

    # 3. Expiring soon memberships (within 7 days)
    expiring_query = (
        db.query(Membership, User, Package)
        .join(User, Membership.user_id == User.id)
        .join(Package, Membership.package_id == Package.id)
        .filter(
            Membership.status == MembershipStatus.ACTIVE,
            Membership.end_date >= today,
            Membership.end_date <= seven_days_later,
        )
        .order_by(Membership.end_date.asc())
        .all()
    )

    expiring_members = []
    for mem, user, pkg in expiring_query:
        days_left = (mem.end_date - today).days
        expiring_members.append(
            ExpiringMemberItem(
                user_id=user.id,
                full_name=user.full_name,
                email=user.email,
                phone=user.phone,
                package_name=pkg.name,
                end_date=mem.end_date,
                days_left=days_left,
            )
        )

    # 4. Revenue calculation
    total_revenue = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.status == PaymentStatus.COMPLETED)
        .scalar() or Decimal("0.00")
    )

    revenue_this_month = (
        db.query(func.sum(Payment.amount))
        .filter(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.payment_date >= datetime.combine(first_day_of_month, datetime.min.time()),
        )
        .scalar() or Decimal("0.00")
    )

    # 5. Today's check-ins and schedules
    today_checkins = (
        db.query(func.count(Attendance.id))
        .filter(
            Attendance.check_in_time >= datetime.combine(today, datetime.min.time()),
            Attendance.check_in_time <= datetime.combine(today, datetime.max.time()),
        )
        .scalar() or 0
    )

    today_schedules = (
        db.query(func.count(WorkoutSchedule.id))
        .filter(
            WorkoutSchedule.start_time >= datetime.combine(today, datetime.min.time()),
            WorkoutSchedule.start_time <= datetime.combine(today, datetime.max.time()),
        )
        .scalar() or 0
    )

    return DashboardStatsResponse(
        total_members=total_members,
        new_members_this_month=new_members_this_month,
        active_memberships=active_memberships,
        expiring_soon_count=len(expiring_members),
        expiring_members=expiring_members,
        total_revenue=total_revenue,
        revenue_this_month=revenue_this_month,
        today_checkins=today_checkins,
        today_schedules=today_schedules,
    )
