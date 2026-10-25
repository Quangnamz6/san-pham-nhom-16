import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional, Tuple
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
)
from app.models.ai_log import AILog, PromptType
from app.schemas.ai import (
    WorkoutRecommendationRequest,
    WorkoutRecommendationResponse,
    ReminderMessageRequest,
    ReminderMessageResponse,
    ProgressSummaryRequest,
    ProgressSummaryResponse,
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
