from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.models.workout_schedule import ScheduleStatus
from app.schemas.user import UserResponse
from app.schemas.trainer import TrainerResponse


class WorkoutScheduleBase(BaseModel):
    member_id: int
    pt_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    status: ScheduleStatus = ScheduleStatus.SCHEDULED
    notes: Optional[str] = Field(None, examples=["Tập thân trên: Ngực & Tay sau"])
    is_reminder_sent: bool = False

    @model_validator(mode="after")
    def validate_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be strictly after start_time")
        return self


class WorkoutScheduleCreate(WorkoutScheduleBase):
    pass


class WorkoutScheduleUpdate(BaseModel):
    pt_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[ScheduleStatus] = None
    notes: Optional[str] = None
    is_reminder_sent: Optional[bool] = None


class WorkoutScheduleResponse(WorkoutScheduleBase):
    id: int
    created_at: datetime
    member: Optional[UserResponse] = None
    pt: Optional[TrainerResponse] = None
    trainer: Optional[TrainerResponse] = None

    @model_validator(mode="after")
    def sync_trainer_and_pt(self):
        if not self.trainer and self.pt:
            self.trainer = self.pt
        elif not self.pt and self.trainer:
            self.pt = self.trainer
        return self

    class Config:
        from_attributes = True
