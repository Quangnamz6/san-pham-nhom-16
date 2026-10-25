from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.attendance import AttendanceStatus
from app.schemas.user import UserResponse


class AttendanceBase(BaseModel):
    member_id: int
    schedule_id: Optional[int] = None
    check_in_time: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatus] = None


class AttendanceResponse(AttendanceBase):
    id: int
    created_at: datetime
    member: Optional[UserResponse] = None

    class Config:
        from_attributes = True
