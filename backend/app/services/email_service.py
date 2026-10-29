import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.mail_from = settings.MAIL_FROM or settings.SMTP_USER
        self.mail_from_name = settings.MAIL_FROM_NAME or "Gym AI Management"

    def _render_otp_html(self, recipient_name: str, otp_code: str, expire_minutes: int = 10) -> str:
        """Tạo giao diện HTML Email hiện đại, chuyên nghiệp cho mã xác thực OTP."""
        return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã Xác Thực OTP - Gym AI</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }}
    .container {{
      max-width: 580px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }}
    .header {{
      background: linear-gradient(135deg, #ff5e14 0%, #ea580c 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }}
    .header p {{
      margin: 6px 0 0;
      font-size: 13px;
      opacity: 0.9;
    }}
    .content {{
      padding: 36px 32px;
    }}
    .greeting {{
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }}
    .description {{
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 24px;
    }}
    .otp-wrapper {{
      text-align: center;
      margin: 28px 0;
    }}
    .otp-box {{
      display: inline-block;
      background-color: #fff7ed;
      border: 2px dashed #f97316;
      border-radius: 14px;
      padding: 16px 32px;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #ea580c;
      font-family: 'Courier New', Courier, monospace;
      box-shadow: 0 2px 8px rgba(234, 88, 12, 0.1);
    }}
    .expire-notice {{
      font-size: 13px;
      color: #ea580c;
      font-weight: 600;
      margin-top: 10px;
    }}
    .warning-card {{
      background-color: #f1f5f9;
      border-left: 4px solid #f97316;
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
      margin-top: 24px;
    }}
    .footer {{
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GYM AI MANAGEMENT</h1>
      <p>Hệ thống Quản lý Trung tâm Thể hình Thông minh</p>
    </div>
    <div class="content">
      <div class="greeting">Xin chào, {recipient_name}! 👋</div>
      <div class="description">
        Cảm ơn bạn đã đăng ký tài khoản tại <b>Gym AI Management Portal</b>. Để hoàn tất quy trình kích hoạt tài khoản và bảo mật dữ liệu, vui lòng nhập mã OTP bên dưới:
      </div>

      <div class="otp-wrapper">
        <div class="otp-box">{otp_code}</div>
        <div class="expire-notice">⏱️ Mã có hiệu lực trong vòng {expire_minutes} phút</div>
      </div>

      <div class="warning-card">
        🔒 <b>Lưu ý an toàn:</b> Tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
      </div>
    </div>
    <div class="footer">
      Email này được gửi tự động từ hệ thống Gym AI.<br>
      © 2026 Gym AI Management Portal. All rights reserved.
    </div>
  </div>
</body>
</html>"""

    def send_otp_email(
        self,
        to_email: str,
        otp_code: str,
        recipient_name: Optional[str] = None,
        expire_minutes: int = 10,
    ) -> Tuple[bool, Optional[str]]:
        """
        Gửi email chứa mã OTP 6 chữ số qua SMTP Gmail:
        - Port 587 với STARTTLS
        - Hỗ trợ cả cách gọi: send_otp_email(email, otp) hoặc send_otp_email(to_email, otp_code, recipient_name)
        - Luôn ghi mã OTP vào logs console để hỗ trợ dev kiểm thử tức thời
        - Bắt và xử lý toàn bộ ngoại lệ an toàn, không làm crash ứng dụng
        """
        name = recipient_name or "Hội viên"
        
        # In mã OTP nổi bật ra log để tiện kiểm thử ngay cả khi SMTP gặp sự cố mạng/mật khẩu
        logger.info("=" * 60)
        logger.info(f"🔑 [GYM AI OTP] Gửi tới: {to_email} | Mã OTP: {otp_code} | Hạn: {expire_minutes} phút")
        logger.info("=" * 60)

        # Kiểm tra nếu cấu hình SMTP chưa có
        if not self.smtp_user or not self.smtp_password:
            err = "SMTP_USER hoặc SMTP_PASSWORD chưa được cấu hình trong file .env."
            logger.warning(f"[EmailService] {err}")
            return False, err

        try:
            # Tạo MIME Message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[{self.mail_from_name}] Mã xác thực OTP của bạn: {otp_code}"
            msg["From"] = f"{self.mail_from_name} <{self.mail_from}>"
            msg["To"] = to_email

            # Plain-text fallback
            text_content = (
                f"Xin chào {name},\n\n"
                f"Mã xác thực OTP đăng ký tài khoản Gym AI của bạn là: {otp_code}\n"
                f"Mã có hiệu lực trong vòng {expire_minutes} phút.\n\n"
                f"Tuyệt đối không chia sẻ mã này cho bất kỳ ai.\n\n"
                f"Trân trọng,\n{self.mail_from_name}"
            )
            part_text = MIMEText(text_content, "plain", "utf-8")
            msg.attach(part_text)

            # HTML Content
            html_content = self._render_otp_html(
                recipient_name=name,
                otp_code=otp_code,
                expire_minutes=expire_minutes,
            )
            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_html)

            # Kết nối SMTP Gmail Server (Port 587 - STARTTLS)
            logger.info(f"[EmailService] Đang kết nối tới {self.smtp_host}:{self.smtp_port} bằng {self.smtp_user}...")
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=12) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user.strip(), self.smtp_password.strip())
                server.sendmail(self.mail_from, [to_email], msg.as_string())

            logger.info(f"[EmailService] ĐÃ GỬI THÀNH CÔNG email OTP tới: {to_email}")
            return True, None

        except (smtplib.SMTPAuthenticationError, smtplib.SMTPServerDisconnected) as auth_err:
            err_msg = (
                f"Lỗi xác thực Gmail: Google từ chối tài khoản/App Password. "
                f"Chi tiết: {auth_err}. Mã OTP đã được ghi nhận trong console backend: {otp_code}"
            )
            logger.error(f"[EmailService] {err_msg}")
            return False, err_msg

        except Exception as e:
            err_msg = f"Lỗi gửi email: {str(e)}. Mã OTP dự phòng trong console: {otp_code}"
            logger.error(f"[EmailService] {err_msg}")
            return False, err_msg

    def _render_schedule_update_html(
        self,
        recipient_name: str,
        schedule_id: int,
        date_str: str,
        time_str: str,
        trainer_name: str,
        status_label: str,
        dispatcher_name: str,
        notes: Optional[str] = None,
    ) -> str:
        """Tạo giao diện HTML Email thông báo điều phối / cập nhật lịch tập cho Hội viên."""
        notes_section = ""
        if notes:
            notes_section = f"""
            <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #9a3412;">
              <strong>📝 Ghi chú từ Ban quản lý / Lễ tân:</strong><br>
              <span style="font-style: italic;">{notes}</span>
            </div>
            """

        return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông Báo Cập Nhật Lịch Tập - Gym AI</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }}
    .container {{
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }}
    .header {{
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }}
    .header p {{
      margin: 6px 0 0;
      font-size: 13px;
      color: #bae6fd;
    }}
    .badge {{
      display: inline-block;
      margin-top: 10px;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .content {{
      padding: 32px;
    }}
    .greeting {{
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }}
    .intro {{
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 22px;
    }}
    .schedule-card {{
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 20px;
    }}
    .card-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }}
    .card-row:last-child {{
      border-bottom: none;
      padding-bottom: 0;
    }}
    .card-row .label {{
      color: #64748b;
      font-weight: 600;
    }}
    .card-row .val {{
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }}
    .status-pill {{
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff;
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
    }}
    .tip-box {{
      background-color: #f0fdf4;
      border-left: 4px solid #16a34a;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 12px;
      color: #166534;
      line-height: 1.6;
      margin-top: 20px;
    }}
    .footer {{
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">LỊCH TẬP LUYỆN GYM AI</span>
      <h1>THÔNG BÁO ĐIỀU PHỐI LỊCH TẬP</h1>
      <p>Hệ thống Quản lý Thể hình Thông minh</p>
    </div>
    <div class="content">
      <div class="greeting">Xin chào, {recipient_name}! 👋</div>
      <div class="intro">
        Lịch tập luyện của bạn tại <b>Gym AI Management Portal</b> vừa được Ban Quản trị / Bộ phận Lễ tân cập nhật hoặc điều phối lại. Dưới đây là thông tin chi tiết buổi tập:
      </div>

      <div class="schedule-card">
        <div class="card-row">
          <span class="label">Mã buổi tập:</span>
          <span class="val">#{schedule_id}</span>
        </div>
        <div class="card-row">
          <span class="label">📅 Ngày tập:</span>
          <span class="val" style="color: #0284c7;">{date_str}</span>
        </div>
        <div class="card-row">
          <span class="label">⏰ Khung giờ:</span>
          <span class="val" style="color: #0f172a; font-size: 14px;">{time_str}</span>
        </div>
        <div class="card-row">
          <span class="label">🏋️ Huấn luyện viên (PT):</span>
          <span class="val" style="color: #ea580c;">{trainer_name}</span>
        </div>
        <div class="card-row">
          <span class="label">📌 Trạng thái:</span>
          <span class="val"><span class="status-pill">{status_label}</span></span>
        </div>
        <div class="card-row">
          <span class="label">👤 Người điều phối:</span>
          <span class="val">{dispatcher_name}</span>
        </div>
      </div>

      {notes_section}

      <div class="tip-box">
        💡 <strong>Lời khuyên:</strong> Quý hội viên vui lòng mang theo trang phục thể thao phù hợp, bình nước cá nhân và có mặt trước giờ tập 10-15 phút để khởi động và hoàn tất thủ tục check-in tại quầy.
      </div>
    </div>
    <div class="footer">
      Email này được gửi tự động khi có thao tác điều phối lịch tập từ Ban quản lý Gym AI.<br>
      Nếu có thắc mắc hoặc cần hỗ trợ thêm, vui lòng liên hệ quầy Lễ tân hoặc hotline trung tâm.<br>
      © 2026 Gym AI Management Portal. All rights reserved.
    </div>
  </div>
</body>
</html>"""

    def send_schedule_update_email(
        self,
        to_email: str,
        recipient_name: str,
        schedule_id: int,
        start_time,
        end_time,
        trainer_name: str,
        status_label: str,
        dispatcher_name: str,
        notes: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Gửi email thông báo cho Hội viên khi Lễ tân hoặc Admin điều phối/thay đổi lịch tập.
        """
        date_str = start_time.strftime("%d/%m/%Y") if hasattr(start_time, "strftime") else str(start_time)
        time_str = (
            f"{start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}"
            if hasattr(start_time, "strftime") and hasattr(end_time, "strftime")
            else f"{start_time} - {end_time}"
        )

        logger.info("=" * 65)
        logger.info(
            f"📧 [SCHEDULE_UPDATE_EMAIL] Gửi tới: {to_email} ({recipient_name}) | "
            f"Lịch #{schedule_id} | Ngày: {date_str} {time_str} | PT: {trainer_name} | "
            f"Trạng thái: {status_label} | Điều phối: {dispatcher_name}"
        )
        logger.info("=" * 65)

        if not self.smtp_user or not self.smtp_password:
            err = "SMTP_USER hoặc SMTP_PASSWORD chưa được cấu hình trong file .env."
            logger.warning(f"[EmailService] {err}")
            return False, err

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[{self.mail_from_name}] Cập nhật lịch tập #{schedule_id} ngày {date_str}"
            msg["From"] = f"{self.mail_from_name} <{self.mail_from}>"
            msg["To"] = to_email

            text_content = (
                f"Xin chào {recipient_name},\n\n"
                f"Lịch tập #{schedule_id} của bạn tại Gym AI đã được cập nhật bởi {dispatcher_name}.\n"
                f"- Ngày tập: {date_str}\n"
                f"- Giờ tập: {time_str}\n"
                f"- Huấn luyện viên: {trainer_name}\n"
                f"- Trạng thái: {status_label}\n"
            )
            if notes:
                text_content += f"- Ghi chú điều phối: {notes}\n"
            text_content += f"\nTrân trọng,\n{self.mail_from_name}"

            msg.attach(MIMEText(text_content, "plain", "utf-8"))

            html_content = self._render_schedule_update_html(
                recipient_name=recipient_name,
                schedule_id=schedule_id,
                date_str=date_str,
                time_str=time_str,
                trainer_name=trainer_name,
                status_label=status_label,
                dispatcher_name=dispatcher_name,
                notes=notes,
            )
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=12) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user.strip(), self.smtp_password.strip())
                server.sendmail(self.mail_from, [to_email], msg.as_string())

            logger.info(f"[EmailService] ĐÃ GỬI THÀNH CÔNG email cập nhật lịch tới: {to_email}")
            return True, None

        except Exception as e:
            err_msg = f"Lỗi gửi email điều phối lịch tập: {str(e)}"
            logger.error(f"[EmailService] {err_msg}")
            return False, err_msg

    def _render_2hour_reminder_html(
        self,
        recipient_name: str,
        schedule_id: int,
        date_str: str,
        time_str: str,
        trainer_name: str,
        notes: Optional[str] = None,
        cta_url: str = "http://localhost:5173/schedules",
    ) -> str:
        """Tạo giao diện HTML Email Ocean Blue sang trọng nhắc nhở hội viên trước giờ tập 2 tiếng."""
        workout_notes_display = (
            f"""<div style="margin-top: 6px; font-style: italic; color: #0369a1; font-weight: 500;">
                  {notes}
                </div>"""
            if notes
            else """<div style="margin-top: 6px; font-style: italic; color: #64748b;">
                  Theo giáo án chuẩn của HLV & AI Advisor
                </div>"""
        )

        return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc Nhở Lịch Tập - Gym AI</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f0f9ff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
    }}
    .container {{
      max-width: 600px;
      margin: 32px auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 12px 35px rgba(2, 132, 199, 0.12);
      border: 1px solid #bae6fd;
    }}
    .header {{
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0c4a6e 100%);
      padding: 36px 28px;
      text-align: center;
      color: #ffffff;
      position: relative;
    }}
    .header-badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 9999px;
      padding: 5px 16px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #e0f2fe;
      margin-bottom: 12px;
    }}
    .header h1 {{
      margin: 0;
      font-size: 23px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.3;
    }}
    .header p {{
      margin: 8px 0 0;
      font-size: 13px;
      color: #bae6fd;
    }}
    .content {{
      padding: 36px 32px;
    }}
    .greeting {{
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }}
    .intro {{
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
      margin-bottom: 24px;
    }}
    .time-highlight-box {{
      background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
      border: 2px solid #0284c7;
      border-radius: 18px;
      padding: 22px;
      text-align: center;
      margin-bottom: 24px;
      box-shadow: 0 4px 15px rgba(2, 132, 199, 0.08);
    }}
    .time-highlight-box .countdown {{
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #0284c7;
      margin-bottom: 6px;
    }}
    .time-highlight-box .time-big {{
      font-size: 28px;
      font-weight: 900;
      color: #0369a1;
      letter-spacing: -0.5px;
    }}
    .time-highlight-box .date-sub {{
      font-size: 14px;
      font-weight: 600;
      color: #0284c7;
      margin-top: 4px;
    }}
    .details-card {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }}
    .detail-row {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }}
    .detail-row:last-child {{
      border-bottom: none;
      padding-bottom: 0;
    }}
    .detail-row .label {{
      color: #64748b;
      font-weight: 600;
      min-width: 130px;
    }}
    .detail-row .val {{
      color: #0f172a;
      font-weight: 700;
      text-align: right;
      flex: 1;
    }}
    .checklist-card {{
      background-color: #ecfeff;
      border-left: 4px solid #06b6d4;
      border-radius: 12px;
      padding: 18px 20px;
      font-size: 13px;
      color: #155e75;
      line-height: 1.6;
      margin-bottom: 26px;
    }}
    .checklist-card ul {{
      margin: 8px 0 0;
      padding-left: 18px;
    }}
    .checklist-card li {{
      margin-bottom: 4px;
    }}
    .cta-wrapper {{
      text-align: center;
      margin: 30px 0 16px;
    }}
    .cta-btn {{
      display: inline-block;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      padding: 14px 34px;
      border-radius: 14px;
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.35);
      letter-spacing: 0.3px;
    }}
    .footer {{
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 20px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-badge">⏰ NHẮC NHỞ LỊCH TẬP</div>
      <h1>BUỔI TẬP SẼ BẮT ĐẦU SAU 2 GIỜ!</h1>
      <p>Gym AI Management - Đồng hành cùng mục tiêu thể hình của bạn</p>
    </div>

    <div class="content">
      <div class="greeting">Xin chào, {recipient_name}! 👋</div>
      <div class="intro">
        Hệ thống Gym AI xin gửi lời nhắc nhở: Buổi tập luyện thể hình của bạn sẽ diễn ra trong vòng <b>2 giờ tới</b>. Hãy sẵn sàng năng lượng để hoàn thành mục tiêu hôm nay nhé!
      </div>

      <div class="time-highlight-box">
        <div class="countdown">⏳ Thời gian bắt đầu</div>
        <div class="time-big">{time_str}</div>
        <div class="date-sub">📅 Ngày: {date_str}</div>
      </div>

      <div class="details-card">
        <div class="detail-row">
          <span class="label">Mã buổi tập:</span>
          <span class="val">#{schedule_id}</span>
        </div>
        <div class="detail-row">
          <span class="label">🏋️ Huấn luyện viên (PT):</span>
          <span class="val" style="color: #0284c7;">{trainer_name}</span>
        </div>
        <div class="detail-row">
          <span class="label">📋 Dự kiến bài tập:</span>
          <span class="val">{workout_notes_display}</span>
        </div>
      </div>

      <div class="checklist-card">
        <strong>👟 Nhắc nhở chuẩn bị trước khi đến phòng tập:</strong>
        <ul>
          <li>Mang theo trang phục thể thao thoải mái, giày tập phù hợp.</li>
          <li>Chuẩn bị bình nước cá nhân và khăn lau mồ hôi.</li>
          <li>Có mặt trước giờ tập <b>10 - 15 phút</b> để khởi động kỹ và làm thủ tục check-in nhanh tại quầy lễ tân.</li>
        </ul>
      </div>

      <div class="cta-wrapper">
        <a href="{cta_url}" class="cta-btn" target="_blank">
          Xem Chi Tiết Lịch Tập ➔
        </a>
      </div>
    </div>

    <div class="footer">
      Email này được gửi tự động từ hệ thống điều phối lịch tập Gym AI.<br>
      Chúc bạn có một buổi tập luyện tràn đầy năng lượng và hiệu quả!<br>
      © 2026 Gym AI Management Portal. All rights reserved.
    </div>
  </div>
</body>
</html>"""

    def send_2hour_reminder_email(
        self,
        to_email: str,
        recipient_name: str,
        schedule_id: int,
        start_time,
        end_time,
        trainer_name: str,
        notes: Optional[str] = None,
        cta_url: str = "http://localhost:5173/schedules",
    ) -> Tuple[bool, Optional[str]]:
        """
        Gửi email tự động nhắc nhở hội viên trước giờ tập 2 tiếng (Ocean Blue template).
        """
        date_str = (
            start_time.strftime("%d/%m/%Y")
            if hasattr(start_time, "strftime")
            else str(start_time)
        )
        time_str = (
            f"{start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}"
            if hasattr(start_time, "strftime") and hasattr(end_time, "strftime")
            else f"{start_time} - {end_time}"
        )

        logger.info("=" * 70)
        logger.info(
            f"⏰ [2HOUR_REMINDER_EMAIL] Gửi tới: {to_email} ({recipient_name}) | "
            f"Buổi tập #{schedule_id} lúc {date_str} {time_str} | HLV: {trainer_name}"
        )
        logger.info("=" * 70)

        if not self.smtp_user or not self.smtp_password:
            err = "SMTP_USER hoặc SMTP_PASSWORD chưa được cấu hình trong file .env."
            logger.warning(f"[EmailService] {err}")
            return False, err

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"⏰ [{self.mail_from_name}] Nhắc nhở: Lịch tập của bạn sẽ bắt đầu sau 2 giờ nữa!"
            msg["From"] = f"{self.mail_from_name} <{self.mail_from}>"
            msg["To"] = to_email

            text_content = (
                f"Xin chào {recipient_name},\n\n"
                f"Lịch tập #{schedule_id} của bạn tại Gym AI sẽ bắt đầu sau 2 giờ nữa!\n"
                f"- Ngày tập: {date_str}\n"
                f"- Khung giờ: {time_str}\n"
                f"- Huấn luyện viên phụ trách: {trainer_name}\n"
            )
            if notes:
                text_content += f"- Nội dung bài tập: {notes}\n"
            text_content += (
                f"\nVui lòng chuẩn bị trang phục thể thao và có mặt trước 10-15 phút để check-in.\n"
                f"Xem chi tiết tại: {cta_url}\n\n"
                f"Trân trọng,\n{self.mail_from_name}"
            )
            msg.attach(MIMEText(text_content, "plain", "utf-8"))

            html_content = self._render_2hour_reminder_html(
                recipient_name=recipient_name,
                schedule_id=schedule_id,
                date_str=date_str,
                time_str=time_str,
                trainer_name=trainer_name,
                notes=notes,
                cta_url=cta_url,
            )
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=12) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user.strip(), self.smtp_password.strip())
                server.sendmail(self.mail_from, [to_email], msg.as_string())

            logger.info(f"[EmailService] ĐÃ GỬI THÀNH CÔNG email nhắc lịch 2h tới: {to_email}")
            return True, None

        except Exception as e:
            err_msg = f"Lỗi gửi email nhắc nhở lịch tập 2h: {str(e)}"
            logger.error(f"[EmailService] {err_msg}")
            return False, err_msg


email_service = EmailService()
