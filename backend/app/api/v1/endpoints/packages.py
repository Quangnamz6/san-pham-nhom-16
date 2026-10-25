from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_staff
from app.models.package import Package
from app.models.user import User
from app.schemas.package import PackageCreate, PackageUpdate, PackageResponse

router = APIRouter()


@router.get("/", response_model=List[PackageResponse])
def get_packages(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Public endpoint to list all available gym membership packages."""
    return db.query(Package).offset(skip).limit(limit).all()


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


@router.post("/", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
def create_package(
    package_in: PackageCreate,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """Create a new package (Admin / Receptionist only)."""
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
    current_staff: User = Depends(get_current_staff),
):
    """Update package details (Admin / Receptionist only)."""
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
    current_staff: User = Depends(get_current_staff),
):
    """Delete a package (Admin / Receptionist only)."""
    pkg = db.query(Package).filter(Package.id == package_id).first()
    if not pkg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gói tập không tồn tại.",
        )
    db.delete(pkg)
    db.commit()
    return None
