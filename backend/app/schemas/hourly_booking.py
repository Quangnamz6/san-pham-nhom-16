from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.user import UserResponse
from app.schemas.trainer import TrainerResponse


class HourlyBookingBase(BaseModel):
    booking_type: str = Field("self_practice", description="'self_practice' hoặc 'pt_session'")
    package_title: str = Field(..., description="Tên gói vé (VD: Tự Tập 2 Giờ, Thuê PT 1 Giờ)")
    trainer_id: Optional[int] = Field(None, description="ID của PT nếu là gói pt_session")
    booking_date: str = Field(..., description="Ngày tập YYYY-MM-DD")
    time_slot: str = Field(..., description="Khung giờ tập (VD: 08:00 - 10:00)")
    duration_hours: int = Field(1, ge=1, le=24, description="Số giờ tập hoặc 24 nếu Day Pass")
    price: float = Field(..., ge=0, description="Tổng giá tiền VNĐ")
    payment_method: Optional[str] = Field("vietqr_transfer", description="Hình thức thanh toán")
    transaction_code: Optional[str] = Field(None, description="Mã giao dịch ngân hàng / QR")
    notes: Optional[str] = Field(None, description="Ghi chú mục tiêu tập luyện")


class HourlyBookingCreate(HourlyBookingBase):
    user_id: Optional[int] = Field(None, description="ID của hội viên nếu đặt hộ (Admin / Lễ tân)")


class HourlyBookingResponse(HourlyBookingBase):
    id: int
    user_id: int
    status: str
    ticket_code: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    trainer: Optional[TrainerResponse] = None

    class Config:
        from_attributes = True
