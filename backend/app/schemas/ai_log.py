from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field
from app.models.ai_log import PromptType


# User input for AI Workout Plan Generation
class AIWorkoutRequest(BaseModel):
    gender: str = Field(..., examples=["Nam", "Nữ"])
    age: int = Field(..., ge=12, le=100, examples=[25])
    height_cm: float = Field(..., ge=100, le=250, examples=[175.0])
    weight_kg: float = Field(..., ge=30, le=300, examples=[72.5])
    experience_level: str = Field("Beginner", examples=["Beginner", "Intermediate", "Advanced"])
    fitness_goal: str = Field(..., examples=["Tăng cơ giảm mỡ, tập trung phát triển ngực và vai"])
    days_per_week: int = Field(4, ge=1, le=7, examples=[4])
    injuries_or_limitations: Optional[str] = Field("Không", examples=["Đau mỏi thắt lưng nhẹ, hạn chế gập tạ quá nặng"])
    available_equipment: Optional[str] = Field("Phòng gym đầy đủ", examples=["Phòng gym đầy đủ máy móc & tạ"])


# User input for AI Diet Recommendation
class AIDietRequest(BaseModel):
    gender: str = Field(..., examples=["Nam", "Nữ"])
    age: int = Field(..., ge=12, le=100, examples=[25])
    height_cm: float = Field(..., ge=100, le=250, examples=[175.0])
    weight_kg: float = Field(..., ge=30, le=300, examples=[72.5])
    activity_level: str = Field("Vận động vừa phải (3-5 buổi/tuần)", examples=["Vận động vừa phải"])
    diet_goal: str = Field(..., examples=["Thâm hụt calo giảm 0.5kg/tuần giữ cơ"])
    allergies_or_preferences: Optional[str] = Field("Không", examples=["Không ăn cay, không uống được sữa có lactose"])


# AI Log Persistence Schemas
class AILogBase(BaseModel):
    user_id: Optional[int] = None
    prompt_type: PromptType
    input_data: Dict[str, Any]
    ai_response: Dict[str, Any]
    model_name: str = "gpt-4o-mini"
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None


class AILogCreate(AILogBase):
    pass


class AILogResponse(AILogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
