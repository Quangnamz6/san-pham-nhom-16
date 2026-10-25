from datetime import date, datetime, timedelta
import uuid
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_staff
from app.models.membership import Membership, MembershipStatus
from app.models.package import Package
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.membership import (
    MembershipCreate,
    MembershipUpdate,
    MembershipResponse,
    MembershipRenewRequest,
)
from app.services.schedule_generator import generate_default_schedules_for_member

router = APIRouter()


@router.get("/my-memberships", response_model=List[MembershipResponse])
def get_my_memberships(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách gói tập đã đăng ký của hội viên đang đăng nhập."""
    memberships = (
        db.query(Membership)
        .filter(Membership.user_id == current_user.id)
        .order_by(Membership.created_at.desc(), Membership.end_date.desc())
        .all()
    )
    today = date.today()
    for mem in memberships:
        if mem.end_date:
            mem.days_left = (mem.end_date - today).days
            if mem.status == MembershipStatus.ACTIVE and mem.end_date < today:
                mem.status = MembershipStatus.EXPIRED
        else:
            mem.days_left = 0
    db.commit()
    return memberships


@router.get("/", response_model=List[MembershipResponse])
def get_memberships(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve memberships. Members can only view their own; Staff/Admin can view all."""
    today = date.today()
    if current_user.role in [UserRole.ADMIN, UserRole.RECEPTIONIST]:
        items = db.query(Membership).offset(skip).limit(limit).all()
    else:
        items = (
            db.query(Membership)
            .filter(Membership.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    for mem in items:
        if mem.end_date:
            mem.days_left = (mem.end_date - today).days
            if mem.status == MembershipStatus.ACTIVE and mem.end_date < today:
                mem.status = MembershipStatus.EXPIRED
        else:
            mem.days_left = 0
    db.commit()
    return items


@router.post("/", response_model=MembershipResponse, status_code=status.HTTP_201_CREATED)
def create_membership(
    membership_in: MembershipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a membership for a member (Member can register for self; Staff/Admin for any)."""
    target_user_id = membership_in.user_id
    if current_user.role == UserRole.MEMBER:
        target_user_id = current_user.id

    # Verify package exists
    pkg = db.query(Package).filter(Package.id == membership_in.package_id).first()
    if not pkg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gói tập không tồn tại.",
        )
    # Verify user exists
    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hội viên không tồn tại.",
        )

    membership_data = membership_in.model_dump()
    membership_data["user_id"] = target_user_id
    membership = Membership(**membership_data)
    db.add(membership)
    db.commit()
    db.refresh(membership)

    from app.services.schedule_generator import generate_default_schedules_for_member
    from app.models.membership import MembershipStatus
    if membership.status == MembershipStatus.ACTIVE:
        dur = (membership.end_date - membership.start_date).days if (membership.end_date and membership.start_date) else pkg.duration_days
        generate_default_schedules_for_member(
            db=db,
            member_id=membership.user_id,
            package=pkg,
            duration_days=dur,
        )

    return membership


@router.put("/{membership_id}", response_model=MembershipResponse)
def update_membership_status(
    membership_id: int,
    membership_in: MembershipUpdate,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """Update membership status or dates (Admin / Receptionist only)."""
    membership = (
        db.query(Membership).filter(Membership.id == membership_id).first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hợp đồng hội viên không tồn tại.",
        )
    was_not_active = membership.status != MembershipStatus.ACTIVE
    for field, value in membership_in.model_dump(exclude_unset=True).items():
        setattr(membership, field, value)
    db.commit()
    db.refresh(membership)

    from app.services.schedule_generator import generate_default_schedules_for_member
    from app.models.membership import MembershipStatus
    if membership.status == MembershipStatus.ACTIVE and was_not_active:
        pkg = db.query(Package).filter(Package.id == membership.package_id).first()
        if pkg:
            dur = (membership.end_date - membership.start_date).days if (membership.end_date and membership.start_date) else pkg.duration_days
            generate_default_schedules_for_member(
                db=db,
                member_id=membership.user_id,
                package=pkg,
                duration_days=dur,
            )

    return membership


@router.post("/{membership_id}/renew", response_model=MembershipResponse)
def renew_membership(
    membership_id: int,
    renewal_in: MembershipRenewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xử lý gia hạn gói tập:
    - Tính toán cộng thêm ngày (duration_days) vào end_date.
    - Cập nhật trạng thái gói về 'active'.
    - Lưu mục tiêu tập luyện (goal_notes, target_weight_kg) nếu có.
    - Sinh hóa đơn Payment hoàn tất (COMPLETED).
    - Tự động đồng bộ lịch tập mới theo thời hạn và mục tiêu.
    """
    membership = db.query(Membership).filter(Membership.id == membership_id).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hợp đồng gói tập không tồn tại.",
        )

    # Kiểm tra quyền: Hội viên chỉ được gia hạn gói của chính mình
    if current_user.role == UserRole.MEMBER and membership.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền gia hạn gói tập này.",
        )

    package = db.query(Package).filter(Package.id == membership.package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gói tập không tồn tại.",
        )

    today = date.today()
    duration_days = (
        renewal_in.duration_days
        if (renewal_in.duration_days and renewal_in.duration_days > 0)
        else package.duration_days
    )

    # Tính toán cộng thêm ngày vào end_date:
    # Nếu gói còn hạn (Active và end_date >= today): cộng dồn từ end_date hiện tại
    # Nếu gói đã hết hạn hoặc chưa kích hoạt: cộng từ hôm nay
    if membership.status == MembershipStatus.ACTIVE and membership.end_date and membership.end_date >= today:
        membership.end_date = membership.end_date + timedelta(days=duration_days)
    else:
        membership.start_date = today
        membership.end_date = today + timedelta(days=duration_days)

    membership.status = MembershipStatus.ACTIVE

    if renewal_in.goal_notes is not None:
        membership.goal_notes = renewal_in.goal_notes
    if renewal_in.target_weight_kg is not None:
        membership.target_weight_kg = renewal_in.target_weight_kg

    # Tính số tiền thanh toán
    if renewal_in.custom_amount is not None:
        final_amount = renewal_in.custom_amount
    else:
        if package.duration_days > 0:
            final_amount = round(
                Decimal(str(package.price))
                * Decimal(str(duration_days / package.duration_days)),
                -4,
            )
        else:
            final_amount = package.price

    # Xác định phương thức thanh toán
    method_val = renewal_in.payment_method
    if method_val in ["transfer", "bank_transfer"]:
        pay_method = PaymentMethod.BANK_TRANSFER
    elif method_val in [m.value for m in PaymentMethod]:
        pay_method = PaymentMethod(method_val)
    else:
        pay_method = PaymentMethod.CASH

    # Tạo bản ghi thanh toán
    payment = Payment(
        membership_id=membership.id,
        amount=final_amount,
        payment_method=pay_method,
        status=PaymentStatus.COMPLETED,
        transaction_code=renewal_in.transaction_code
        or f"RENEW-{membership.user_id}-{int(datetime.now().strftime('%Y%m%d%H%M%S'))}-{uuid.uuid4().hex[:6]}",
    )
    db.add(payment)
    db.commit()
    db.refresh(membership)

    # Tự động sinh lịch tập phù hợp theo mục tiêu
    try:
        generate_default_schedules_for_member(
            db=db,
            member_id=membership.user_id,
            package=package,
            duration_days=duration_days,
            target_weight_kg=renewal_in.target_weight_kg,
            goal_notes=renewal_in.goal_notes,
        )
    except Exception:
        pass

    membership.days_left = max(0, (membership.end_date - today).days)
    return membership
