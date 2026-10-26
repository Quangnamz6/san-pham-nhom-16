from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


# =====================================================================
# 1. Schemas cho Gợi ý lịch tập 1 tuần
# =====================================================================
class WorkoutRecommendationRequest(BaseModel):
    goal: str = Field(..., min_length=2, examples=["Tăng cơ ngực và vai, giảm mỡ vòng bụng"])
    availability: str = Field(..., min_length=2, examples=["4 buổi/tuần, mỗi buổi 60 phút vào buổi chiều"])
    fitness_level: str = Field(..., min_length=2, examples=["Trung bình (đã tập 6 tháng)"])
    medical_notes: Optional[str] = Field(
        "Không có", examples=["Đau thắt lưng nhẹ, hạn chế cúi gập tạ quá nặng"]
    )


class ExerciseItem(BaseModel):
    name: str = Field(..., description="Tên bài tập")
    sets: int = Field(..., ge=1, le=10, description="Số set tập")
    reps: str = Field(..., description="Số rep hoặc thời gian thực hiện")
    rest_seconds: int = Field(..., ge=10, le=300, description="Thời gian nghỉ giữa các set (giây)")
    notes: Optional[str] = Field(None, description="Lưu ý kỹ thuật hoặc tư thế an toàn")


class DayWorkoutSchedule(BaseModel):
    day: str = Field(..., description="Thứ trong tuần (VD: Thứ 2, Thứ 4...)")
    focus: str = Field(..., description="Nhóm cơ trọng tâm")
    warmup: Optional[str] = Field(None, description="Bài khởi động làm nóng khớp")
    exercises: List[ExerciseItem] = Field(..., min_length=1, description="Danh sách các bài tập")
    cooldown: Optional[str] = Field(None, description="Thả lỏng cơ sau tập")


class WorkoutRecommendationResponse(BaseModel):
    plan_title: str
    fitness_level: str
    medical_warning: str
    weekly_overview: str
    schedule: List[DayWorkoutSchedule]
    recovery_tips: List[str]
    requires_pt_consultation: bool = Field(
        default=False,
        description="Đánh dấu nếu phát hiện chấn thương nặng cần tư vấn trực tiếp 1-1 với PT/Bác sĩ",
    )


# =====================================================================
# 2. Schemas cho Sinh tin nhắn nhắc lịch / gia hạn gói tập
# =====================================================================
class ReminderMessageRequest(BaseModel):
    member_name: str = Field(..., min_length=2, examples=["Nguyễn Văn An"])
    package_name: str = Field(..., min_length=2, examples=["Gói Gold VIP 12 Tháng"])
    expire_date: str = Field(..., examples=["2026-11-05"])
    missed_sessions: int = Field(default=0, ge=0, examples=[3])


class ReminderMessageResponse(BaseModel):
    member_name: str
    message: str
    call_to_action: str
    recommended_channel: str


# =====================================================================
# 3. Schemas cho Tóm tắt tiến độ tập luyện
# =====================================================================
class ProgressSummaryRequest(BaseModel):
    member_id: Optional[int] = Field(None, examples=[1])
    member_name: Optional[str] = Field("Hội viên", examples=["Nguyễn Văn An"])
    total_days: int = Field(default=30, ge=7, le=90, examples=[30])
    attendance_count: Optional[int] = Field(None, ge=0, examples=[14])
    pt_notes: Optional[str] = Field(
        None,
        examples=[
            "Buổi 1: Thể lực tốt, Deadlift 70kg đúng form. "
            "Buổi 2: Đẩy ngực cần chú ý cố định khớp vai hơn. "
            "Buổi 3: Tinh thần tập rất cao, hoàn thành đủ sets."
        ],
    )


class ProgressSummaryResponse(BaseModel):
    member_name: str
    attendance_rate: str
    positive_highlights: List[str]
    areas_for_improvement: List[str]
    next_actionable_advice: List[str]
    motivational_quote: Optional[str] = None


# =====================================================================
# 4. Schemas cho Trợ lý AI Chatbot & Tư vấn gói tập
# =====================================================================
class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant' hoặc 'system'")
    content: str = Field(..., description="Nội dung tin nhắn")


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, examples=["Tôi là người mới bắt đầu, muốn tìm gói tập nhẹ nhàng"])
    chat_history: Optional[List[ChatMessage]] = Field(default=[], description="Lịch sử hội thoại nhiều lượt")


class RecommendedPackageItem(BaseModel):
    id: int
    name: str
    price: float
    duration_days: int
    category: str
    badge: Optional[str] = None
    description: Optional[str] = None
    commitments: Optional[str] = None
    reason: Optional[str] = None


class AIChatResponse(BaseModel):
    reply: str
    intent: Optional[str] = Field(default="general_chat", description="Ý định người dùng được AI nhận diện")
    recommended_packages: Optional[List[RecommendedPackageItem]] = Field(default=[], description="Danh sách các gói tập phù hợp trong CSDL")

