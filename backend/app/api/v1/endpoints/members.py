from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database import get_db
from app.core.deps import get_current_staff, get_current_admin
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.membership import Membership, MembershipStatus
from app.models.attendance import Attendance
from app.models.payment import Payment, PaymentStatus
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.dashboard import MemberDetailResponse
from app.schemas.membership import MembershipResponse

router = APIRouter()


@router.get("/", response_model=List[MemberDetailResponse])
def get_members(
    search: Optional[str] = Query(None, description="Tìm kiếm theo Tên, Số điện thoại hoặc Email"),
    status_filter: Optional[str] = Query(None, alias="status", description="Lọc theo trạng thái gói: active, expired, pending, none"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """
    Danh sách hội viên (Dành cho Lễ tân & Admin):
    - Tìm kiếm theo Tên / Số điện thoại / Email
    - Lọc theo trạng thái hiệu lực gói tập
    """
    query = db.query(User).filter(User.role == UserRole.MEMBER)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_fmt),
                User.phone.ilike(search_fmt),
                User.email.ilike(search_fmt),
            )
        )

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    today = date.today()

    for u in users:
        # Get latest/active membership
        latest_membership = (
            db.query(Membership)
            .filter(Membership.user_id == u.id)
            .order_by(Membership.end_date.desc())
            .first()
        )

        # Check membership status filter if requested
        mem_status = "none"
        if latest_membership:
            if latest_membership.status == MembershipStatus.ACTIVE and latest_membership.end_date >= today:
                mem_status = "active"
            else:
                mem_status = "expired"

        if status_filter and status_filter.lower() != "all" and mem_status != status_filter.lower():
            continue

        # Count total attendances
        total_checkins = (
            db.query(func.count(Attendance.id))
            .filter(Attendance.member_id == u.id)
            .scalar() or 0
        )

        # Calculate total payments spent
        total_spent = (
            db.query(func.sum(Payment.amount))
            .join(Membership, Payment.membership_id == Membership.id)
            .filter(Membership.user_id == u.id, Payment.status == PaymentStatus.COMPLETED)
            .scalar() or Decimal("0.00")
        )

        results.append(
            MemberDetailResponse(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                phone=u.phone,
                role=u.role,
                created_at=u.created_at,
                active_membership=latest_membership,
                total_checkins=total_checkins,
                total_spent=total_spent,
            )
        )

    return results


@router.get("/{member_id}", response_model=MemberDetailResponse)
def get_member_detail(
    member_id: int,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """Lấy thông tin chi tiết hồ sơ hội viên kèm hợp đồng và lịch sử chi tiêu."""
    user = db.query(User).filter(User.id == member_id, User.role == UserRole.MEMBER).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin hội viên.",
        )

    latest_membership = (
        db.query(Membership)
        .filter(Membership.user_id == user.id)
        .order_by(Membership.end_date.desc())
        .first()
    )

    total_checkins = (
        db.query(func.count(Attendance.id))
        .filter(Attendance.member_id == user.id)
        .scalar() or 0
    )

    total_spent = (
        db.query(func.sum(Payment.amount))
        .join(Membership, Payment.membership_id == Membership.id)
        .filter(Membership.user_id == user.id, Payment.status == PaymentStatus.COMPLETED)
        .scalar() or Decimal("0.00")
    )

    return MemberDetailResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        created_at=user.created_at,
        active_membership=latest_membership,
        total_checkins=total_checkins,
        total_spent=total_spent,
    )


@router.post("/", response_model=MemberDetailResponse, status_code=status.HTTP_201_CREATED)
def create_member(
    member_in: UserCreate,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """Lễ tân hoặc Admin tạo hồ sơ hội viên mới tại quầy."""
    existing = db.query(User).filter(User.email == member_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã tồn tại trên hệ thống.",
        )

    user = User(
        full_name=member_in.full_name,
        email=member_in.email,
        password_hash=get_password_hash(member_in.password),
        phone=member_in.phone,
        role=UserRole.MEMBER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return MemberDetailResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        created_at=user.created_at,
        active_membership=None,
        total_checkins=0,
        total_spent=Decimal("0.00"),
    )


@router.put("/{member_id}", response_model=MemberDetailResponse)
def update_member(
    member_id: int,
    member_in: UserUpdate,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """Cập nhật thông tin hồ sơ hội viên (Tên, SĐT, Email)."""
    user = db.query(User).filter(User.id == member_id, User.role == UserRole.MEMBER).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hội viên.",
        )

    if member_in.full_name is not None:
        user.full_name = member_in.full_name
    if member_in.phone is not None:
        user.phone = member_in.phone
    if member_in.email is not None and member_in.email != user.email:
        # Check uniqueness
        if db.query(User).filter(User.email == member_in.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được sử dụng bởi người dùng khác.",
            )
        user.email = member_in.email
    if member_in.password:
        user.password_hash = get_password_hash(member_in.password)

    db.commit()
    db.refresh(user)

    return get_member_detail(member_id=user.id, db=db, current_staff=current_staff)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Xóa hồ sơ hội viên (Chỉ Admin)."""
    user = db.query(User).filter(User.id == member_id, User.role == UserRole.MEMBER).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hội viên.",
        )
    db.delete(user)
    db.commit()
    return None
