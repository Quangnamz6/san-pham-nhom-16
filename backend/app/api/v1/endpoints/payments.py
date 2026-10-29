import uuid
from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_staff, normalize_role
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.membership import Membership, MembershipStatus
from app.models.package import Package
from app.models.user import User, UserRole
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.schemas.dashboard import MembershipRenewalRequest
from app.services.schedule_generator import generate_default_schedules_for_member

router = APIRouter()


@router.get("/", response_model=List[PaymentResponse])
def get_payments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách lịch sử thanh toán hóa đơn."""
    user_role = normalize_role(current_user.role)
    if user_role in ["admin", "receptionist", "reception", "staff"]:
        return db.query(Payment).order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()
    
    return (
        db.query(Payment)
        .join(Membership, Payment.membership_id == Membership.id)
        .filter(Membership.user_id == current_user.id)
        .order_by(Payment.payment_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ghi nhận thanh toán và tự động kích hoạt gói tập:
    - Cho phép cả Hội viên thanh toán cho hợp đồng của mình, hoặc Nhân viên/Admin.
    - Nếu trạng thái là COMPLETED, tự động chuyển Membership sang ACTIVE.
    """
    membership = (
        db.query(Membership).filter(Membership.id == payment_in.membership_id).first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hợp đồng hội viên không tồn tại.",
        )

    if normalize_role(current_user.role) == "member" and membership.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thanh toán cho hợp đồng hội viên này.",
        )

    payment = Payment(
        membership_id=payment_in.membership_id,
        amount=payment_in.amount,
        payment_method=payment_in.payment_method,
        status=payment_in.status,
        transaction_code=payment_in.transaction_code,
    )
    db.add(payment)

    # Automatically mark membership ACTIVE if payment is completed
    if payment_in.status == PaymentStatus.COMPLETED:
        membership.status = MembershipStatus.ACTIVE
        pkg = db.query(Package).filter(Package.id == membership.package_id).first()
        if pkg:
            dur = (membership.end_date - membership.start_date).days if (membership.end_date and membership.start_date) else pkg.duration_days
            generate_default_schedules_for_member(
                db=db,
                member_id=membership.user_id,
                package=pkg,
                duration_days=dur,
            )

    db.commit()
    db.refresh(payment)
    return payment


@router.post("/renew", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def renew_membership(
    renewal_in: MembershipRenewalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Nghiệp vụ Gia hạn hoặc Đăng ký mới gói tập cho hội viên:
    - Cho phép cả Hội viên tự đăng ký hoặc Nhân viên/Admin đăng ký hộ.
    - Kiểm tra gói tập và hội viên.
    - Hỗ trợ thời hạn linh hoạt (1 tuần, 15 ngày, 1 tháng, 3 tháng, 6 tháng, 12 tháng).
    - Tự động sinh hóa đơn thanh toán COMPLETED và kích hoạt hợp đồng ACTIVE.
    - Tự động sinh danh sách lịch tập mặc định (Schedules) theo gói và mục tiêu tập luyện.
    """
    if normalize_role(current_user.role) == "member":
        user = current_user
    else:
        target_user_id = renewal_in.user_id or current_user.id
        user = db.query(User).filter(User.id == target_user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy hội viên.",
            )

    package = db.query(Package).filter(Package.id == renewal_in.package_id).first()
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gói tập không tồn tại.",
        )

    today = date.today()
    duration_days = renewal_in.duration_days if (renewal_in.duration_days and renewal_in.duration_days > 0) else package.duration_days
    final_amount = renewal_in.custom_amount if renewal_in.custom_amount is not None else package.price

    # Find existing membership if specified or latest active
    membership = None
    if renewal_in.membership_id:
        membership = db.query(Membership).filter(Membership.id == renewal_in.membership_id).first()
    else:
        membership = (
            db.query(Membership)
            .filter(Membership.user_id == user.id)
            .order_by(Membership.end_date.desc())
            .first()
        )

    # Calculate new dates
    if membership and membership.status == MembershipStatus.ACTIVE and membership.end_date >= today:
        # Extend from current end_date
        start_date = membership.start_date
        end_date = membership.end_date + timedelta(days=duration_days)
        membership.package_id = package.id
        membership.end_date = end_date
        membership.status = MembershipStatus.ACTIVE
    else:
        # Create a new membership contract starting today
        start_date = today
        end_date = today + timedelta(days=duration_days)
        membership = Membership(
            user_id=user.id,
            package_id=package.id,
            start_date=start_date,
            end_date=end_date,
            status=MembershipStatus.ACTIVE,
        )
        db.add(membership)
        db.flush()  # to obtain membership.id

    # Create payment record
    payment = Payment(
        membership_id=membership.id,
        amount=final_amount,
        payment_method=PaymentMethod(renewal_in.payment_method) if renewal_in.payment_method in [m.value for m in PaymentMethod] else PaymentMethod.CASH,
        status=PaymentStatus.COMPLETED,
        transaction_code=renewal_in.transaction_code or f"PAY-{user.id}-{int(datetime.now().strftime('%Y%m%d%H%M%S'))}-{uuid.uuid4().hex[:6]}",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # 1. Tự động sinh Lịch tập mặc định khi Đăng ký / Thanh toán gói tập thành công
    generate_default_schedules_for_member(
        db=db,
        member_id=user.id,
        package=package,
        duration_days=duration_days,
        target_weight_kg=renewal_in.target_weight_kg,
        goal_notes=renewal_in.goal_notes,
    )

    return payment


@router.post("/{payment_id}/confirm", response_model=PaymentResponse)
def confirm_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xác nhận thanh toán hoàn tất (chuyển khoản/QR thành công) và kích hoạt gói tập."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hóa đơn thanh toán không tồn tại.",
        )
    membership = db.query(Membership).filter(Membership.id == payment.membership_id).first()
    if normalize_role(current_user.role) == "member":
        if not membership or membership.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền cập nhật hóa đơn này.",
            )
    payment.status = PaymentStatus.COMPLETED
    if membership:
        membership.status = MembershipStatus.ACTIVE
        pkg = db.query(Package).filter(Package.id == membership.package_id).first()
        if pkg:
            dur = (membership.end_date - membership.start_date).days if (membership.end_date and membership.start_date) else pkg.duration_days
            generate_default_schedules_for_member(
                db=db,
                member_id=membership.user_id,
                package=pkg,
                duration_days=dur,
            )
    db.commit()
    db.refresh(payment)
    return payment


@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payment_in: PaymentUpdate,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """Cập nhật thông tin hoặc trạng thái hóa đơn thanh toán."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hóa đơn thanh toán không tồn tại.",
        )
    for field, value in payment_in.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)
    db.commit()
    db.refresh(payment)
    return payment

