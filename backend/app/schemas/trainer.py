from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.user import UserResponse


class TrainerBase(BaseModel):
    bio: Optional[str] = Field(None, examples=["HLV thể hình 5 năm kinh nghiệm, chứng chỉ NASM"])
    specialization: Optional[str] = Field(None, examples=["Tăng cơ, Giảm mỡ, Phục hồi chức năng"])


class TrainerCreate(TrainerBase):
    user_id: int


class TrainerUpdate(TrainerBase):
    pass


class TrainerResponse(TrainerBase):
    id: int
    user_id: int
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
