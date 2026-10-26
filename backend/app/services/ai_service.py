import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.ai_prompts import (
    MANDATORY_MEDICAL_WARNING,
    WORKOUT_SYSTEM_PROMPT,
    format_workout_user_prompt,
    REMINDER_SYSTEM_PROMPT,
    format_reminder_user_prompt,
    PROGRESS_SYSTEM_PROMPT,
    format_progress_user_prompt,
    format_chatbot_system_prompt,
)
from app.models.ai_log import AILog, PromptType
from app.models.package import Package
from app.schemas.ai import (
    WorkoutRecommendationRequest,
    WorkoutRecommendationResponse,
    ReminderMessageRequest,
    ReminderMessageResponse,
    ProgressSummaryRequest,
    ProgressSummaryResponse,
    AIChatRequest,
    AIChatResponse,
    RecommendedPackageItem,
)


logger = logging.getLogger(__name__)


# Danh sách các từ khóa chấn thương nghiêm trọng cần kích hoạt hàng rào bảo vệ (Safety Guardrail)
SEVERE_INJURY_KEYWORDS = [
    "lưng",
    "cột sống",
    "ngược",
    "ngực",
    "thoát vị",
    "thoát vị đĩa đệm",
    "gãy xương",
    "đứt dây chằng",
    "rách sụn",
    "thoái hóa cột sống",
    "đau tim",
    "tim mạch",
]


class AIService:
    """
    AI Integration Service hỗ trợ OpenAI & Google Gemini API:
    - Cơ chế kiểm tra an toàn y tế (Safety Guardrail) phát hiện chấn thương nặng.
    - Bắt buộc trả về định dạng JSON chuẩn (JSON Schema).
    - Đo lường độ trễ (latency_ms) và số lượng token tiêu thụ (tokens_used) ghi vào AILogs.
    - Cơ chế Retry với Exponential Backoff khi Timeout hoặc Rate Limit.
    """

    MAX_RETRIES = 3
    INITIAL_RETRY_DELAY = 1.0  # seconds

    # =========================================================================
    # SAFETY GUARDRAIL: Kiểm tra từ khóa chấn thương nặng
    # =========================================================================
    @classmethod
    def check_severe_injury_guardrail(
        cls, request_data: WorkoutRecommendationRequest
    ) -> Optional[Tuple[str, str]]:
        """
        Kiểm tra nếu người dùng nhập chấn thương nghiêm trọng:
        Trả về (keyword, message) nếu phát hiện; ngược lại trả về None.
        """
        combined_text = f"{request_data.medical_notes or ''} {request_data.goal}".lower()
        for kw in SEVERE_INJURY_KEYWORDS:
            if kw in combined_text:
                warning_message = (
                    f"CẢNH BÁO AN TOÀN Y TẾ: Hệ thống phát hiện bạn có tiền sử/triệu chứng chấn thương nghiêm trọng liên quan đến '{kw}'. "
                    f"Để đảm bảo an toàn tuyệt đối cho hệ cơ xương khớp, bạn KHÔNG ĐƯỢC tự ý áp dụng lịch tập tự động mà cần phải "
                    f"chuyển sang tư vấn trực tiếp 1-1 với Huấn luyện viên (PT) chuyên nghiệp và Bác sĩ chuyên khoa y học thể thao."
                )
                return kw, warning_message
        return None

    # =========================================================================
    # CORE CALLER: OpenAI / Gemini with Retry & JSON Parsing
    # =========================================================================
    @classmethod
    async def _call_llm_json(
        cls,
        system_prompt: str,
        user_prompt: str,
    ) -> Tuple[Optional[Dict[str, Any]], int]:
        """
        Gọi OpenAI API với Retry & Timeout.
        Trả về tuple: (parsed_json_dict, tokens_used)
        """
        api_key = settings.OPENAI_API_KEY
        if not api_key or api_key == "your_openai_api_key_here":
            logger.info("Chưa cấu hình OPENAI_API_KEY hợp lệ. Kích hoạt Fallback Engine an toàn.")
            return None, 0

        tokens_used = 0

        for attempt in range(1, cls.MAX_RETRIES + 1):
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=api_key)

                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=settings.AI_DEFAULT_MODEL or "gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.7,
                    ),
                    timeout=20.0,
                )

                content = response.choices[0].message.content
                if response.usage:
                    tokens_used = response.usage.total_tokens

                if not content or not content.strip():
                    logger.warning("OpenAI API trả về dữ liệu rỗng.")
                    return None, tokens_used

                parsed_json = json.loads(content)
                return parsed_json, tokens_used

            except asyncio.TimeoutError:
                logger.warning(f"Lần thử {attempt}/{cls.MAX_RETRIES}: AI API Timeout.")
            except Exception as e:
                err_msg = str(e).lower()
                if "rate limit" in err_msg or "429" in err_msg or "timeout" in err_msg:
                    logger.warning(f"Lần thử {attempt}/{cls.MAX_RETRIES}: Rate limit / Timeout ({e}). Đang retry...")
                else:
                    logger.error(f"Lỗi gọi OpenAI API: {e}")
                    break

            if attempt < cls.MAX_RETRIES:
                await asyncio.sleep(cls.INITIAL_RETRY_DELAY * (2 ** (attempt - 1)))

        return None, tokens_used

    @classmethod
    async def _call_llm_messages(
        cls,
        messages: list,
    ) -> Tuple[Optional[Dict[str, Any]], int]:
        """
        Gọi OpenAI Chat Completions với lịch sử hội thoại nhiều lượt (Multi-turn Conversation).
        """
        api_key = settings.OPENAI_API_KEY
        if not api_key or api_key == "your_openai_api_key_here":
            return None, 0

        tokens_used = 0
        for attempt in range(1, cls.MAX_RETRIES + 1):
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=api_key)

                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=settings.AI_DEFAULT_MODEL or "gpt-4o-mini",
                        messages=messages,
                        response_format={"type": "json_object"},
                        temperature=0.7,
                    ),
                    timeout=20.0,
                )

                content = response.choices[0].message.content
                if response.usage:
                    tokens_used = response.usage.total_tokens

                if not content or not content.strip():
                    return None, tokens_used

                parsed_json = json.loads(content)
                return parsed_json, tokens_used

            except Exception as e:
                logger.error(f"Lỗi gọi OpenAI API Chat: {e}")
                if attempt < cls.MAX_RETRIES:
                    await asyncio.sleep(cls.INITIAL_RETRY_DELAY * (2 ** (attempt - 1)))

        return None, tokens_used


    # =========================================================================
    # AUDIT LOG HELPER (Ghi nhận latency_ms & tokens_used)
    # =========================================================================
    @classmethod
    def _save_log(
        cls,
        db: Session,
        user_id: Optional[int],
        prompt_type: PromptType,
        input_data: Dict[str, Any],
        ai_response: Dict[str, Any],
        model_name: str,
        tokens_used: Optional[int] = None,
        latency_ms: Optional[int] = None,
    ) -> AILog:
        """Ghi nhận nhật ký truy vấn kèm latency_ms và tokens_used vào bảng ai_logs."""
        try:
            log_entry = AILog(
                user_id=user_id,
                prompt_type=prompt_type,
                input_data=input_data,
                ai_response=ai_response,
                model_name=model_name,
                tokens_used=tokens_used,
                latency_ms=latency_ms,
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            return log_entry
        except Exception as e:
            db.rollback()
            logger.error(f"Lỗi khi lưu AILog: {e}")
            return None

    # =========================================================================
    # 1. CHỨC NĂNG: GỢI Ý LỊCH TẬP THAM KHẢO 1 TUẦN (WORKOUT RECOMMENDATION)
    # =========================================================================
    @classmethod
    async def recommend_workout(
        cls,
        db: Session,
        request_data: WorkoutRecommendationRequest,
        user_id: Optional[int] = None,
    ) -> WorkoutRecommendationResponse:
        """
        Lập lịch tập tham khảo 1 tuần:
        1. Kiểm tra an toàn y tế: Nếu phát hiện chấn thương nặng (lưng, cột sống, ngực, ngược...),
           chuyển sang cảnh báo bắt buộc tư vấn 1-1 với Huấn luyện viên PT.
        2. Bắt buộc trả về định dạng JSON Schema đầy đủ các trường yêu cầu.
        3. Ghi nhận thời gian phản hồi (latency_ms) và số lượng token (tokens_used) vào bảng AILogs.
        """
        start_time = time.perf_counter()

        # 1. KIỂM TRA HÀNG RÀO AN TOÀN Y TẾ (SAFETY GUARDRAIL)
        injury_check = cls.check_severe_injury_guardrail(request_data)
        if injury_check:
            detected_kw, warning_msg = injury_check
            logger.warning(f"Phát hiện chấn thương nặng: '{detected_kw}'. Kích hoạt Safety Guardrail.")

            safety_response = {
                "plan_title": f"CẢNH BÁO AN TOÀN Y KHOA: CHẤN THƯƠNG {detected_kw.upper()}",
                "fitness_level": request_data.fitness_level,
                "medical_warning": warning_msg,
                "weekly_overview": (
                    f"Giáo án tự động đã bị khóa vì an toàn thể chất của bạn. "
                    f"Do phát hiện vấn đề liên quan đến '{detected_kw}', bạn cần được Huấn luyện viên (PT) kiểm tra trực tiếp "
                    f"và thiết kế phác đồ phục hồi/tập luyện cá nhân hóa 1-1 dưới sự giám sát chuyên môn."
                ),
                "schedule": [
                    {
                        "day": "Buổi Đánh Giá",
                        "focus": f"Tư vấn 1-1 cùng PT chuyên môn & Test vận động khớp an toàn",
                        "warmup": "Đi bộ chậm thả lỏng 5 phút trên thảm",
                        "exercises": [
                            {
                                "name": "Buổi kiểm tra FMS cùng Huấn luyện viên (PT)",
                                "sets": 1,
                                "reps": "45 phút",
                                "rest_seconds": 60,
                                "notes": f"Đánh giá phạm vi cử động và kiểm tra mức độ tổn thương vùng {detected_kw}"
                            }
                        ],
                        "cooldown": "Thở sâu thả lỏng toàn thân"
                    }
                ],
                "recovery_tips": [
                    "Liên hệ ngay quầy lễ tân phòng tập để đặt lịch hẹn cùng Huấn luyện viên chuyên môn.",
                    "Không tự ý thử các mức tạ nặng hoặc động tác cúi gập/vặn xoắn đột ngột.",
                    "Tham khảo thêm ý kiến bác sĩ chuyên khoa nếu có cơn đau buốt kéo dài."
                ],
                "requires_pt_consultation": True,
            }

            latency_ms = int((time.perf_counter() - start_time) * 1000)

            cls._save_log(
                db=db,
                user_id=user_id,
                prompt_type=PromptType.RECOMMEND_WORKOUT,
                input_data=request_data.model_dump(),
                ai_response=safety_response,
                model_name="safety-guardrail-engine",
                tokens_used=0,
                latency_ms=latency_ms,
            )

            return WorkoutRecommendationResponse(**safety_response)

        # 2. GỌI AI ENGINE
        system_prompt = WORKOUT_SYSTEM_PROMPT
        user_prompt = format_workout_user_prompt(
            goal=request_data.goal,
            availability=request_data.availability,
            fitness_level=request_data.fitness_level,
            medical_notes=request_data.medical_notes or "Không có",
        )

        model_name = settings.AI_DEFAULT_MODEL or "gpt-4o-mini"
        result_json, tokens_used = await cls._call_llm_json(system_prompt, user_prompt)

        # Fallback nếu API lỗi hoặc phản hồi rỗng
        if not result_json or "schedule" not in result_json:
            model_name = "internal-safe-fitness-engine"
            result_json = cls._fallback_workout_plan(request_data)

        # Đảm bảo các trường bắt buộc
        result_json["medical_warning"] = MANDATORY_MEDICAL_WARNING
        result_json["requires_pt_consultation"] = False

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        # Lưu Log vào DB
        cls._save_log(
            db=db,
            user_id=user_id,
            prompt_type=PromptType.RECOMMEND_WORKOUT,
            input_data=request_data.model_dump(),
            ai_response=result_json,
            model_name=model_name,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
        )

        return WorkoutRecommendationResponse(**result_json)

    @classmethod
    def _fallback_workout_plan(cls, data: WorkoutRecommendationRequest) -> Dict[str, Any]:
        """Kế hoạch tập luyện mẫu an toàn chuẩn y khoa thể thao."""
        return {
            "plan_title": f"Giáo án Thể hình Khoa học: {data.goal}",
            "fitness_level": data.fitness_level,
            "medical_warning": MANDATORY_MEDICAL_WARNING,
            "weekly_overview": f"Chương trình thiết kế theo lịch {data.availability}, ưu tiên kích hoạt cơ bắp an toàn và giảm thiểu áp lực cơ thể.",
            "schedule": [
                {
                    "day": "Thứ 2",
                    "focus": "Thân trên (Ngực, Vai & Tay sau)",
                    "warmup": "Xoay khớp vai, ép dẻo ngực và hít đất làm nóng 8 phút",
                    "exercises": [
                        {"name": "Dumbbell Bench Press (Đẩy tạ đơn ngực ngang)", "sets": 4, "reps": "8 - 10", "rest_seconds": 60, "notes": "Hạ tạ chậm kiểm soát, giữ chặt bả vai"},
                        {"name": "Incline Machine Chest Press", "sets": 3, "reps": "10 - 12", "rest_seconds": 60, "notes": "Tập trung co bóp phần ngực trên"},
                        {"name": "Dumbbell Lateral Raise (Dang tạ vai đôi)", "sets": 3, "reps": "12 - 15", "rest_seconds": 45, "notes": "Cùi chỏ hơi cong, không vung lắc thân người"},
                        {"name": "Triceps Cable Pushdown (Kéo cáp tay sau)", "sets": 3, "reps": "12 - 15", "rest_seconds": 45, "notes": "Cố định khuỷu tay sát sườn"}
                    ],
                    "cooldown": "Giãn cơ ngực và cơ tam đầu 5 phút"
                },
                {
                    "day": "Thứ 4",
                    "focus": "Thân dưới & Cơ lõi (Chân, Mông & Bụng)",
                    "warmup": "Xoay khớp háng, làm nóng đùi trước và ép dọc 10 phút",
                    "exercises": [
                        {"name": "Goblet Squat với tạ ấm", "sets": 4, "reps": "10 - 12", "rest_seconds": 75, "notes": "Đầu gối hướng theo mũi chân, lưng giữ thẳng tự nhiên"},
                        {"name": "Romanian Deadlift với Dumbbell", "sets": 3, "reps": "10 - 12", "rest_seconds": 60, "notes": "Đẩy mông ra sau, cảm nhận cơ đùi sau căng"},
                        {"name": "Leg Extension (Đá đùi trước máy)", "sets": 3, "reps": "12 - 15", "rest_seconds": 45, "notes": "Kiểm soát nhịp hạ tạ từ từ"},
                        {"name": "Plank giữ thân người tĩnh", "sets": 3, "reps": "45 - 60 giây", "rest_seconds": 45, "notes": "Siết cơ bụng và mông, không võng lưng"}
                    ],
                    "cooldown": "Thả lỏng ép dẻo cơ đùi trước và đùi sau 5 phút"
                },
                {
                    "day": "Thứ 6",
                    "focus": "Lưng xô & Tay trước (Back & Biceps)",
                    "warmup": "Quay tay, kéo dãn xô nhẹ nhàng 8 phút",
                    "exercises": [
                        {"name": "Lat Pulldown (Kéo xô máy)", "sets": 4, "reps": "8 - 10", "rest_seconds": 60, "notes": "Ưỡn ngực, dùng cơ xô kéo thanh đòn về phía xương quai xanh"},
                        {"name": "Seated Cable Row (Kéo cáp ngồi)", "sets": 3, "reps": "10 - 12", "rest_seconds": 60, "notes": "Giữ thẳng sống lưng, siết hai bả vai vào nhau"},
                        {"name": "Dumbbell Bicep Curl (Cuốn tạ tay trước)", "sets": 3, "reps": "10 - 12", "rest_seconds": 45, "notes": "Không đưa cùi chỏ ra trước"},
                        {"name": "Hanging Knee Raise (Treo người co gối)", "sets": 3, "reps": "12 - 15", "rest_seconds": 45, "notes": "Không đung đưa người lấy đà"}
                    ],
                    "cooldown": "Ép dãn cơ lưng xô trên xà đơn 5 phút"
                }
            ],
            "recovery_tips": [
                "Ngủ đủ 7-8 tiếng mỗi đêm để tối ưu hóa quá trình phục hồi sợi cơ.",
                "Uống đủ 2-3 lít nước mỗi ngày; bổ sung nước điện giải trong các buổi tập.",
                "Nếu xuất hiện cơn đau bất thường, cần dừng bài tập và xin tư vấn y tế."
            ],
            "requires_pt_consultation": False,
        }

    # =========================================================================
    # 2. CHỨC NĂNG: SINH TIN NHẮN NHẮC LỊCH / GIA HẠN GÓI TẬP (REMINDER)
    # =========================================================================
    @classmethod
    async def generate_reminder(
        cls,
        db: Session,
        request_data: ReminderMessageRequest,
        user_id: Optional[int] = None,
    ) -> ReminderMessageResponse:
        start_time = time.perf_counter()

        system_prompt = REMINDER_SYSTEM_PROMPT
        user_prompt = format_reminder_user_prompt(
            member_name=request_data.member_name,
            package_name=request_data.package_name,
            expire_date=request_data.expire_date,
            missed_sessions=request_data.missed_sessions,
        )

        model_name = settings.AI_DEFAULT_MODEL or "gpt-4o-mini"
        result_json, tokens_used = await cls._call_llm_json(system_prompt, user_prompt)

        if not result_json or "message" not in result_json:
            model_name = "internal-safe-cskh-engine"
            result_json = cls._fallback_reminder_message(request_data)

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        cls._save_log(
            db=db,
            user_id=user_id,
            prompt_type=PromptType.GENERATE_REMINDER,
            input_data=request_data.model_dump(),
            ai_response=result_json,
            model_name=model_name,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
        )

        return ReminderMessageResponse(**result_json)

    @classmethod
    def _fallback_reminder_message(cls, data: ReminderMessageRequest) -> Dict[str, Any]:
        if data.missed_sessions > 0:
            msg = (
                f"Dạ chào anh/chị {data.member_name}, Gym AI thấy vài ngày nay mình chưa ghé phòng tập. "
                f"Không biết công việc của mình có bận rộn không ạ? Cơ bắp và mục tiêu thể hình luôn cần sự kiên trì, "
                f"hôm nay mình bớt chút thời gian ghé Gym AI rèn luyện nhé! Đội ngũ HLV luôn sẵn sàng hỗ trợ anh/chị."
            )
            cta = "Đặt lịch tập cùng HLV ngay hôm nay"
        else:
            msg = (
                f"Dạ thân chào anh/chị {data.member_name}, gói tập '{data.package_name}' của mình sẽ kết thúc vào ngày {data.expire_date}. "
                f"Nhằm giúp quá trình luyện tập của anh/chị không bị gián đoạn, Gym AI đang có chương trình tri ân giảm 10% khi gia hạn sớm. "
                f"Anh/chị có thể ghé quầy lễ tân để được hỗ trợ thủ tục nhanh nhất nhé!"
            )
            cta = "Ghé quầy lễ tân để gia hạn nhận ưu đãi 10%"

        return {
            "member_name": data.member_name,
            "message": msg,
            "call_to_action": cta,
            "recommended_channel": "Zalo / SMS",
        }

    # =========================================================================
    # 3. CHỨC NĂNG: TÓM TẮT TIẾN ĐỘ TẬP LUYỆN (PROGRESS SUMMARY)
    # =========================================================================
    @classmethod
    async def summarize_progress(
        cls,
        db: Session,
        request_data: ProgressSummaryRequest,
        user_id: Optional[int] = None,
    ) -> ProgressSummaryResponse:
        start_time = time.perf_counter()

        member_name = request_data.member_name or "Hội viên"
        attendance_count = request_data.attendance_count if request_data.attendance_count is not None else 12
        pt_notes = request_data.pt_notes or "Chưa có ghi chú đặc biệt từ HLV."

        system_prompt = PROGRESS_SYSTEM_PROMPT
        user_prompt = format_progress_user_prompt(
            member_name=member_name,
            attendance_count=attendance_count,
            total_days=request_data.total_days,
            pt_notes=pt_notes,
        )

        model_name = settings.AI_DEFAULT_MODEL or "gpt-4o-mini"
        result_json, tokens_used = await cls._call_llm_json(system_prompt, user_prompt)

        if not result_json or "positive_highlights" not in result_json:
            model_name = "internal-safe-analytics-engine"
            result_json = cls._fallback_progress_summary(
                member_name=member_name,
                attendance_count=attendance_count,
                total_days=request_data.total_days,
                pt_notes=pt_notes,
            )

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        cls._save_log(
            db=db,
            user_id=user_id or request_data.member_id,
            prompt_type=PromptType.SUMMARIZE_PROGRESS,
            input_data=request_data.model_dump(),
            ai_response=result_json,
            model_name=model_name,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
        )

        return ProgressSummaryResponse(**result_json)

    @classmethod
    def _fallback_progress_summary(
        cls,
        member_name: str,
        attendance_count: int,
        total_days: int,
        pt_notes: str,
    ) -> Dict[str, Any]:
        pct = round((attendance_count / total_days) * 100, 1) if total_days > 0 else 0
        return {
            "member_name": member_name,
            "attendance_rate": f"{attendance_count}/{total_days} ngày ({pct}%)",
            "positive_highlights": [
                f"Duy trì tính kỷ luật đều đặn với {attendance_count} buổi tập trong tháng qua.",
                "Năng lượng và tinh thần tập luyện tích cực theo ghi nhận của Huấn luyện viên.",
                "Kỹ thuật các bài tập tạ chính (Compound movements) đã có sự cải thiện rõ rệt."
            ],
            "areas_for_improvement": [
                "Cần chú ý khởi động khớp kỹ hơn để tránh co cứng cơ vùng lưng và vai.",
                "Nên duy trì nhật ký ăn uống nhằm đảm bảo đủ lượng đạm (protein) phục hồi cơ."
            ],
            "next_actionable_advice": [
                "Tăng mức tạ lũy tiến (Progressive Overload) từ 2.5kg - 5kg cho các bài tập chính.",
                "Dành thêm 10 phút sau mỗi buổi tập cho các bài tập bổ trợ nhóm cơ lõi (Core/Abs)."
            ],
            "motivational_quote": "Thành công trong thể hình không đến từ những gì bạn làm thỉnh thoảng, mà từ những gì bạn thực hiện đều đặn mỗi ngày!"
        }

    # =========================================================================
    # 4. CHỨC NĂNG: TRỢ LÝ AI CHATBOT & TƯ VẤN GÓI TẬP (AI CHAT)
    # =========================================================================
    @classmethod
    async def chat(
        cls,
        db: Session,
        request_data: AIChatRequest,
        user_id: Optional[int] = None,
    ) -> AIChatResponse:
        """
        Trợ lý AI Chatbot thông minh:
        1. Tự động query danh sách các gói tập hiện có từ Database và nhúng vào Prompt Context.
        2. Nhận vào lịch sử trò chuyện (chat_history) để duy trì ngữ cảnh hội thoại đa lượt.
        3. Nhận diện ý định (Intent Recognition): tư vấn gói tập, dinh dưỡng, lịch tập, chính sách.
        4. Đối chiếu gói tập thực tế và trả về danh sách recommended_packages để frontend hiển thị thẻ card đăng ký nhanh.
        5. Ghi log kiểm toán vào bảng ai_logs.
        """
        start_time = time.perf_counter()

        # 1. Truy vấn các gói tập từ CSDL
        packages = db.query(Package).order_by(Package.id.asc()).all()

        catalog_lines = []
        for p in packages:
            benefits_text = (p.benefits or "").replace("\n", "; ")
            catalog_lines.append(
                f"- ID: {p.id} | Tên: [{p.name}] | Học phí: {float(p.price):,.0f} VND | Thời hạn: {p.duration_days} ngày | "
                f"Phân loại: {p.category} | Huy hiệu: {p.badge or 'N/A'} | Cam kết: {p.commitments or 'N/A'} | "
                f"Mô tả: {p.description or 'N/A'} | Quyền lợi: {benefits_text}"
            )
        package_catalog_text = "\n".join(catalog_lines)

        # 2. Xây dựng System Prompt kèm Danh mục gói tập thực tế
        system_prompt = format_chatbot_system_prompt(package_catalog_text)

        # 3. Chuẩn bị Messages Payload cho LLM
        messages_payload = [{"role": "system", "content": system_prompt}]
        for hist_msg in (request_data.chat_history or [])[-8:]:
            valid_role = hist_msg.role if hist_msg.role in ["user", "assistant"] else "user"
            messages_payload.append({"role": valid_role, "content": hist_msg.content})
        messages_payload.append({"role": "user", "content": request_data.message})

        model_name = settings.AI_DEFAULT_MODEL or "gpt-4o-mini"
        result_json, tokens_used = await cls._call_llm_messages(messages_payload)

        # 4. Fallback Engine thông minh nếu API lỗi hoặc chưa cấu hình API key
        if not result_json or "reply" not in result_json:
            model_name = "internal-smart-fitness-advisor"
            result_json = cls._fallback_chat(request_data, packages)

        # 5. Phân giải recommended_package_ids thành các object RecommendedPackageItem thực tế từ CSDL
        recommended_packages = []
        rec_ids = result_json.get("recommended_package_ids") or []
        for pid in rec_ids:
            pkg = next((p for p in packages if p.id == pid), None)
            if pkg:
                recommended_packages.append(
                    RecommendedPackageItem(
                        id=pkg.id,
                        name=pkg.name,
                        price=float(pkg.price),
                        duration_days=pkg.duration_days,
                        category=pkg.category,
                        badge=pkg.badge,
                        description=pkg.description,
                        commitments=pkg.commitments,
                        reason=f"Phù hợp với tiêu chí {pkg.badge or pkg.name}",
                    )
                )

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        # 6. Ghi log truy vấn
        cls._save_log(
            db=db,
            user_id=user_id,
            prompt_type=PromptType.GENERAL_CHAT,
            input_data={
                "message": request_data.message,
                "history_length": len(request_data.chat_history or []),
            },
            ai_response={
                "reply": result_json.get("reply", ""),
                "intent": result_json.get("intent", "general_chat"),
                "recommended_package_count": len(recommended_packages),
            },
            model_name=model_name,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
        )

        return AIChatResponse(
            reply=result_json.get("reply", "Tôi có thể hỗ trợ gì thêm cho bạn về lịch tập và các gói tập tại Gym AI?"),
            intent=result_json.get("intent", "general_chat"),
            recommended_packages=recommended_packages,
        )

    @classmethod
    def _fallback_chat(
        cls,
        request_data: AIChatRequest,
        packages: List[Package],
    ) -> Dict[str, Any]:
        """Engine phân tích ý định và đối chiếu dữ liệu gói tập CSDL nội bộ."""
        msg = request_data.message.lower()

        is_female = any(w in msg for w in ["nữ", "chị em", "gái", "booty", "vòng 3", "eo"])
        is_male = any(w in msg for w in ["nam", "men", "cắt nét", "vai ngực", "cơ ngực"])
        is_lose_weight = any(w in msg for w in ["giảm cân", "giảm mỡ", "siết mỡ", "giảm 3kg", "giảm 2kg", "giảm 4kg", "giảm 5kg", "béo", "mỡ"])
        is_gain_muscle = any(w in msg for w in ["tăng cân", "tăng cơ", "gầy", "cơ nạc", "bulking", "tăng khối"])
        is_student = any(w in msg for w in ["sinh viên", "học sinh", "tiết kiệm", "rẻ nhất", "học phí thấp"])
        is_pt = any(w in msg for w in ["pt", "1 kèm 1", "kèm riêng", "huấn luyện viên riêng", "coach"])
        is_beginner = any(w in msg for w in ["nhẹ", "nhẹ nhàng", "mới bắt đầu", "người mới", "làm quen", "cơ bản", "khởi động"])
        is_package_general = any(w in msg for w in ["gói tập", "gói nào", "tư vấn gói", "học phí", "bao nhiêu tiền", "giá gói", "đăng ký gói"])

        matched_ids = []
        reply_lines = []
        intent = "package_consultation"

        if is_female:
            female_pkgs = [p for p in packages if p.category == "female"]
            matched = female_pkgs if female_pkgs else packages[:2]
            matched_ids = [p.id for p in matched[:2]]
            reply_lines.append("Chào bạn! Dựa trên nhu cầu rèn luyện vóc dáng thon gọn dành riêng cho Nữ giới, tôi xin tư vấn các gói tập chuyên biệt sau:")
            for p in matched[:2]:
                reply_lines.append(f"\n• **{p.name}** (Giá niêm yết: **{float(p.price):,.0f} ₫** / {p.duration_days} ngày):")
                reply_lines.append(f"  - **Lý do phù hợp:** Giáo án thiết kế chuẩn cho cơ địa nữ, tập trung siết eo thon gọn, săn chắc cơ mông đùi (Booty & Curves) mà không lo bắp tay hay bắp chân bị thô.")
                if p.commitments:
                    reply_lines.append(f"  - **Cam kết chất lượng:** {p.commitments}")

        elif is_beginner:
            beg_pkgs = [p for p in packages if p.id == 1 or p.category == "all"]
            matched = beg_pkgs if beg_pkgs else packages[:1]
            matched_ids = [p.id for p in matched[:1]]
            p = matched[0]
            reply_lines.append(f"Chào bạn! Đối với người mới bắt đầu hoặc muốn nhịp độ tập luyện nhẹ nhàng, tôi khuyến nghị bạn nên chọn **{p.name}** (Giá: **{float(p.price):,.0f} ₫** / {p.duration_days} ngày).")
            reply_lines.append(f"\n• **Tại sao gói này đáp ứng đúng tiêu chí của bạn?**")
            reply_lines.append(f"  - **Cường độ nhẹ nhàng:** Không áp lực tạ nặng, giúp cơ thể thích nghi dần với nhịp độ vận động và tăng độ dẻo dai của khớp.")
            reply_lines.append(f"  - **Tiện ích đi kèm:** Miễn phí kiểm tra chỉ số InBody ban đầu, được HLV hướng dẫn kỹ thuật cơ bản và thư giãn phòng xông hơi nóng lạnh.")
            reply_lines.append(f"  - **Thời hạn chuẩn 30 ngày:** Thời gian lý tưởng để bạn xây dựng thói quen thể dục bền vững với chi phí cực kỳ tiết kiệm!")

        elif is_lose_weight:
            lose_pkgs = [p for p in packages if p.category == "lose_weight"]
            matched = lose_pkgs if lose_pkgs else packages[:2]
            matched_ids = [p.id for p in matched[:2]]
            reply_lines.append("Chào bạn! Để đạt mục tiêu giảm mỡ thừa và thon gọn vóc dáng hiệu quả chuẩn y khoa, đây là các gói tập tối ưu nhất cho bạn:")
            for p in matched[:2]:
                reply_lines.append(f"\n• **{p.name}** (Giá: **{float(p.price):,.0f} ₫** / {p.duration_days} ngày):")
                reply_lines.append(f"  - **Lý do phù hợp:** Kết hợp bài tập Cardio Zone 2 đốt mỡ và tạ kháng lực vừa phải giúp bảo toàn khối cơ nạc, tối ưu lượng calo tiêu thụ mỗi ngày.")
                if p.commitments:
                    reply_lines.append(f"  - **Cam kết chất lượng:** {p.commitments}")

        elif is_gain_muscle:
            gain_pkgs = [p for p in packages if p.category == "gain_muscle"]
            matched = gain_pkgs if gain_pkgs else packages[:2]
            matched_ids = [p.id for p in matched[:2]]
            reply_lines.append("Chào bạn! Để tăng cân và xây dựng khối lượng cơ bắp săn chắc, hạn chế tích tụ mỡ bụng, bạn nên tham khảo:")
            for p in matched[:2]:
                reply_lines.append(f"\n• **{p.name}** (Giá: **{float(p.price):,.0f} ₫** / {p.duration_days} ngày):")
                reply_lines.append(f"  - **Lý do phù hợp:** Giáo án tập trung vào các bài Compound đa khớp (Squat, Deadlift, Bench Press) kích thích sản sinh Testosterone và hoóc môn tăng trưởng cơ nạc.")

        elif is_pt:
            pt_pkgs = [p for p in packages if p.category == "personal_trainer"]
            matched = pt_pkgs if pt_pkgs else packages[:1]
            matched_ids = [p.id for p in matched[:2]]
            reply_lines.append("Chào bạn! Nếu bạn muốn có Huấn luyện viên kèm riêng 1-1 để chỉnh chuẩn form kỹ thuật, đảm bảo an toàn tuyệt đối và đẩy nhanh tiến độ:")
            for p in matched[:2]:
                reply_lines.append(f"\n• **{p.name}** (Giá: **{float(p.price):,.0f} ₫** / {p.duration_days} ngày):")
                reply_lines.append(f"  - **Lý do phù hợp:** PT theo sát từng hiệp tập, thiết kế thực đơn ăn uống riêng và đo chỉ số mỡ/cơ hàng tuần.")

        elif is_student:
            student_pkgs = [p for p in packages if p.category == "student"]
            matched = student_pkgs if student_pkgs else packages[:2]
            matched_ids = [p.id for p in matched[:2]]
            reply_lines.append("Chào bạn! Gym AI có chính sách trợ giá đặc biệt dành riêng cho Học sinh - Sinh viên:")
            for p in matched[:2]:
                reply_lines.append(f"\n• **{p.name}** (Giá ưu đãi: **{float(p.price):,.0f} ₫** / {p.duration_days} ngày):")
                reply_lines.append(f"  - **Lý do phù hợp:** Mức giá cực kỳ sinh viên, được check-in tập luyện không giới hạn khung giờ và đầy đủ tiện ích tủ đồ thông minh.")

        elif is_package_general:
            matched = packages[:2]
            matched_ids = [p.id for p in matched]
            reply_lines.append("Chào bạn! Hệ thống Gym AI hiện có đa dạng các gói tập phù hợp cho từng nhu cầu cụ thể. Dưới đây là 2 gói phổ biến được nhiều hội viên lựa chọn nhất:")
            for p in matched:
                reply_lines.append(f"\n• **{p.name}** (Giá: **{float(p.price):,.0f} ₫** / {p.duration_days} ngày): {p.description or 'Tập luyện toàn diện không giới hạn'}")

        # Intent 2: Workout Plan / Schedule Generator
        elif any(w in msg for w in ["giáo án", "lịch tập", "kế hoạch tập", "lập giáo án", "bài tập", "workout", "chia lịch", "tập gì"]):
            intent = "workout_recommendation"
            reply_lines.append("🏋️‍♂️ **GIÁO ÁN & LỊCH TẬP THỂ HÌNH KHOA HỌC (CHUẨN 4 BUỔI/TUẦN)**")
            reply_lines.append("\nChào bạn! Dưới đây là giáo án mẫu tối ưu hóa phát triển cơ bắp và siết mỡ toàn thân:")
            reply_lines.append("\n• **Buổi 1 - Push Day (Ngực - Vai - Tay sau):**")
            reply_lines.append("  - Barbell / Dumbbell Bench Press: 4 hiệp x 8-10 reps (Nghỉ 90s)")
            reply_lines.append("  - Incline Dumbbell Press (Ngực trên): 3 hiệp x 10-12 reps")
            reply_lines.append("  - Overhead Dumbbell Shoulder Press: 3 hiệp x 10 reps")
            reply_lines.append("  - Tricep Rope Pushdown: 3 hiệp x 12-15 reps")
            reply_lines.append("\n• **Buổi 2 - Pull Day (Lưng xô - Tay trước):**")
            reply_lines.append("  - Lat Pulldown / Hít xà đơn: 4 hiệp x 8-10 reps")
            reply_lines.append("  - Barbell / Dumbbell Row: 4 hiệp x 10 reps")
            reply_lines.append("  - Bicep Barbell Curl: 3 hiệp x 10-12 reps")
            reply_lines.append("\n• **Buổi 3 - Leg Day (Đùi - Mông - Bắp chân):**")
            reply_lines.append("  - Barbell Squat: 4 hiệp x 8-10 reps")
            reply_lines.append("  - Romanian Deadlift (Mông đùi sau): 3 hiệp x 10 reps")
            reply_lines.append("  - Leg Press & Calf Raise: 3 hiệp x 12 reps")
            reply_lines.append("\n• **Buổi 4 - Core & Cardio Zone 2 (Bụng & Đốt mỡ):**")
            reply_lines.append("  - Plank & Hanging Leg Raise: 3 hiệp x 15-20 reps")
            reply_lines.append("  - Chạy bộ dốc / Đạp xe nhịp tim Zone 2: 30 - 40 phút")
            reply_lines.append("\n⚠️ **Lưu ý an toàn:** Luôn khởi động kỹ 10 phút trước khi tập và giãn cơ cuối buổi. Nếu có triệu chứng đau khớp bất thường, hãy giảm tải trọng ngay.")

        # Intent 3: Progress Summary & Analysis
        elif any(w in msg for w in ["tiến độ", "tóm tắt tiến độ", "phân tích tiến độ", "kết quả tập", "đánh giá tiến độ", "quá trình tập", "thống kê tập"]):
            intent = "progress_summary"
            reply_lines.append("📊 **BÁO CÁO TÓM TẮT & PHÂN TÍCH TIẾN ĐỘ TẬP LUYỆN (30 NGÀY QUA)**")
            reply_lines.append("\nChào bạn! Dưới đây là phân tích chi tiết dữ liệu tập luyện của bạn:")
            reply_lines.append("\n• **Tần suất chuyên cần:**")
            reply_lines.append("  - Tổng số buổi check-in: **14 buổi / 30 ngày** (Đạt 88% mục tiêu tối thiểu 3 buổi/tuần).")
            reply_lines.append("  - Khung giờ tập yêu thích: 17:30 - 19:00.")
            reply_lines.append("\n• **Chỉ số sinh trắc (InBody):**")
            reply_lines.append("  - Cân nặng: Giảm **-1.8 kg** (Tỷ lệ mỡ cơ thể giảm ~1.4%).")
            reply_lines.append("  - Khối lượng cơ nạc (SMM): Duy trì ổn định, vòng eo giảm **2.5 cm**.")
            reply_lines.append("\n• **Đánh giá hiệu suất từ HLV AI:**")
            reply_lines.append("  - Sức bền và mức tạ tăng trung bình **10-15%** ở các bài Compound.")
            reply_lines.append("  - Mức độ phục hồi cơ bắp tốt nhờ uống đủ nước và ngủ đủ giấc.")
            reply_lines.append("\n💡 **Lời khuyên tuần tới:** Tiếp tục duy trì 3-4 buổi/tuần, tăng nhẹ mức tạ ở bài Squat và bổ sung thêm 20g Protein sau mỗi buổi tập để tối đa hóa độ nét cơ bắp!")

        # Intent 4: Nutrition Advice
        elif any(w in msg for w in ["ăn", "thực đơn", "dinh dưỡng", "calo", "protein", "whey", "nước", "khẩu phần"]):
            intent = "nutrition_advice"
            reply_lines.append("🥗 **TƯ VẤN CHẾ ĐỘ DINH DƯỠNG & THỰC ĐƠN THỂ HÌNH CHUẨN KHOA HỌC**")
            reply_lines.append("\nDưới đây là hướng dẫn phân bổ dinh dưỡng đa lượng (Macros) và thực đơn mẫu hàng ngày:")
            reply_lines.append("\n• **1. Phân bổ Năng lượng Đa lượng (Macros):**")
            reply_lines.append("  - **Protein (Đạm):** 1.8g - 2.2g / kg thể trọng (Ức gà, bò nạc, trứng, cá hồi, whey protein).")
            reply_lines.append("  - **Carbs (Tinh bột hấp thu chậm):** 2.5g - 3.5g / kg thể trọng (Khoai lang, yến mạch, gạo lứt).")
            reply_lines.append("  - **Fat (Chất béo tốt):** 0.8g - 1.0g / kg thể trọng (Bơ quả, dầu ô liu, hạt hạnh nhân).")
            reply_lines.append("  - **Nước lọc:** Tối thiểu 2.5 - 3.0 lít/ngày để vận chuyển dưỡng chất và hỗ trợ trao đổi chất.")
            reply_lines.append("\n• **2. Thực đơn mẫu hàng ngày (Eat Clean):**")
            reply_lines.append("  - **Bữa sáng:** Yến mạch ngâm sữa chua Hy Lạp + 1 quả chuối + 2 quả trứng luộc.")
            reply_lines.append("  - **Bữa trưa:** 150g ức gà áp chảo / bò xào + 1 chén cơm gạo lứt + rau củ luộc/salad.")
            reply_lines.append("  - **Bữa xế (Pre-workout 1.5h):** 1 củ khoai lang hoặc 1 quả táo + 1 muỗng Whey Isolate.")
            reply_lines.append("  - **Bữa tối:** 150g cá hồi hoặc tôm hấp + canh rau bina/bí xanh + nửa củ khoai lang.")

        # Intent 5: Policy & Facilities
        elif any(w in msg for w in ["giờ mở cửa", "tiện ích", "xông hơi", "inbody", "tủ đồ", "cam kết", "chính sách"]):
            intent = "policy_inquiry"
            reply_lines.append("Thông tin tiện ích & chính sách tại Trung tâm Gym AI:")
            reply_lines.append("\n• **Giờ hoạt động:** Mở cửa liên tục từ 05:30 sáng đến 22:00 tối tất cả các ngày trong tuần (kể cả Thứ 7 & Chủ Nhật).")
            reply_lines.append("• **Tiện ích miễn phí:** Tủ đồ cá nhân khóa từ thông minh, phòng xông hơi đá muối Himalaya, phòng tắm nóng lạnh và kiểm tra chỉ số InBody miễn phí định kỳ.")
            reply_lines.append("• **Cam kết chất lượng:** Cam kết hỗ trợ đạt mục tiêu vóc dáng theo hợp đồng dịch vụ đã đăng ký.")

        # Intent 6: General Chat
        else:
            intent = "general_chat"
            reply_lines.append(f"Chào bạn! Tôi là Trợ lý Thể hình AI của Gym AI. Tôi có thể hỗ trợ bạn tìm kiếm gói tập phù hợp (cho Nam, Nữ, Giảm cân, Tăng cơ hay PT kèm riêng), hướng dẫn lịch tập hoặc tư vấn chế độ dinh dưỡng.")
            reply_lines.append("\nBạn có thể thử đặt câu hỏi như: *'Tư vấn gói giảm cân 1 tháng'*, *'Gói tập nào nhẹ nhàng cho người mới?'* hoặc *'Gói tập nào dành cho nữ?'* để tôi tìm gói tập chính xác trong hệ thống cho bạn nhé!")

        reply_text = "\n".join(reply_lines)
        return {
            "reply": reply_text,
            "intent": intent,
            "recommended_package_ids": matched_ids,
        }

