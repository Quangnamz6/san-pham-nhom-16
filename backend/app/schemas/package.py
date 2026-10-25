from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class PackageBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, examples=["Gói Premium 6 Tháng"])
    duration_days: int = Field(..., gt=0, examples=[180])
    price: Decimal = Field(..., ge=0, examples=[3500000.00])
    description: Optional[str] = Field(None, examples=["Không giới hạn số lần tập, bao gồm xông hơi và tủ đồ riêng"])
    category: str = Field(default="all", examples=["female", "male", "gain_muscle", "lose_weight", "personal_trainer", "student"])
    badge: Optional[str] = Field(None, examples=["Hot", "Dành Cho Nữ", "Giảm Cân"])
    benefits: Optional[str] = Field(None, examples=["Tập không giới hạn khung giờ; Miễn phí InBody; Tủ đồ thông minh"])
    commitments: Optional[str] = Field(None, examples=["Cam kết giảm 2-4kg sau 1 tháng; Hoàn tiền nếu không hiệu quả"])
    featured: bool = Field(default=False)


class PackageCreate(PackageBase):
    pass


class PackageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    duration_days: Optional[int] = Field(None, gt=0)
    price: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    category: Optional[str] = None
    badge: Optional[str] = None
    benefits: Optional[str] = None
    commitments: Optional[str] = None
    featured: Optional[bool] = None


class PackageResponse(PackageBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
