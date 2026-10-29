from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_admin, normalize_role
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from app.schemas.trainer import TrainerCreate, TrainerUpdate, TrainerResponse

router = APIRouter()


@router.get("/", response_model=List[TrainerResponse])
def get_trainers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Public list of personal trainers with their profiles."""
    return db.query(Trainer).offset(skip).limit(limit).all()


@router.get("/{trainer_id}", response_model=TrainerResponse)
def get_trainer(trainer_id: int, db: Session = Depends(get_db)):
    """Get trainer details by ID."""
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Huấn luyện viên không tồn tại.",
        )
    return trainer


@router.post("/", response_model=TrainerResponse, status_code=status.HTTP_201_CREATED)
def create_trainer_profile(
    trainer_in: TrainerCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Create trainer profile for an existing user (Admin only)."""
    user = db.query(User).filter(User.id == trainer_in.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tài khoản người dùng không tồn tại.",
        )
    # Ensure role is set to PT
    user.role = UserRole.PT

    trainer = Trainer(
        user_id=trainer_in.user_id,
        bio=trainer_in.bio,
        specialization=trainer_in.specialization,
    )
    db.add(trainer)
    db.commit()
    db.refresh(trainer)
    return trainer


@router.put("/{trainer_id}", response_model=TrainerResponse)
def update_trainer_profile(
    trainer_id: int,
    trainer_in: TrainerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update trainer profile (Trainer owner or Admin)."""
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Huấn luyện viên không tồn tại.",
        )
    if normalize_role(current_user.role) != "admin" and current_user.id != trainer.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền chỉnh sửa hồ sơ này.",
        )
    for field, value in trainer_in.model_dump(exclude_unset=True).items():
        setattr(trainer, field, value)
    db.commit()
    db.refresh(trainer)
    return trainer
