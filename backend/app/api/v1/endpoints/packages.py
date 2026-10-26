from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.package import Package
from app.models.membership import Membership
from app.models.user import User
from app.schemas.package import PackageCreate, PackageUpdate, PackageResponse

router = APIRouter()


@router.get("", response_model=List[PackageResponse])
@router.get("/", response_model=List[PackageResponse])
def get_packages(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Public endpoint to list all available gym membership packages directly from database."""
    return db.query(Package).order_by(Package.id.desc()).offset(skip).limit(limit).all()


@router.get("/{package_id}", response_model=PackageResponse)
def get_package(package_id: int, db: Session = Depends(get_db)):
    """Get package details by ID."""
    pkg = db.query(Package).filter(Package.id == package_id).first()
    if not pkg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gói tập không tồn tại.",
        )
    return pkg


@router.post("", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
def create_package(
    package_in: PackageCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Create a new package (Admin only)."""
    pkg = Package(**package_in.model_dump())
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.put("/{package_id}", response_model=PackageResponse)
def update_package(
    package_id: int,
    package_in: PackageUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Update package details (Admin only)."""
    pkg = db.query(Package).filter(Package.id == package_id).first()
    if not pkg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gói tập không tồn tại.",
        )
    for field, value in package_in.model_dump(exclude_unset=True).items():
        setattr(pkg, field, value)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package(
    package_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Delete a package (Admin only). Prevents deleting packages with existing memberships."""
    pkg = db.query(Package).filter(Package.id == package_id).first()
    if not pkg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gói tập không tồn tại.",
        )

    # Check if package is being referenced by any memberships
    existing_membership = (
        db.query(Membership).filter(Membership.package_id == package_id).first()
    )
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa gói tập vì đã có hội viên đăng ký gói này. Bạn có thể cập nhật thông tin gói thay vì xóa.",
        )

    try:
        db.delete(pkg)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa gói tập do ràng buộc dữ liệu liên quan.",
        )
    return None

