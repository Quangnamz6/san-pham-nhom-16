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


email_service = EmailService()
