import logging
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    UserResponse,
    Token,
    LoginRequest,
    VerifyOTPRequest,
    ResendOTPRequest,
    RegisterResponse,
)
from app.services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter()


def generate_otp_code() -> str:
    """Sinh mã OTP 6 chữ số ngẫu nhiên."""
    return f"{random.randint(100000, 999999)}"


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Đăng ký tài khoản mới:
    1. Kiểm tra email đã đăng ký chưa.
    2. Nếu chưa, tạo user với is_verified=False. Nếu đã đăng ký nhưng chưa xác thực, cập nhật lại mật khẩu và gửi OTP mới.
    3. Sinh mã OTP 6 chữ số ngẫu nhiên, lưu vào DB có thời hạn 10 phút.
    4. Gửi email chứa mã OTP đến địa chỉ người dùng.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    
    if existing_user and existing_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Địa chỉ Email này đã được đăng ký và xác thực trên hệ thống.",
        )

    otp_code = generate_otp_code()
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    if existing_user and not existing_user.is_verified:
        # Cập nhật lại thông tin đăng ký dở dang
        existing_user.full_name = user_in.full_name
        existing_user.password_hash = get_password_hash(user_in.password)
        existing_user.phone = user_in.phone
        existing_user.otp_code = otp_code
        existing_user.otp_expires_at = otp_expires_at
        db.commit()
        db.refresh(existing_user)
        user = existing_user
    else:
        # Tạo mới user
        user = User(
            full_name=user_in.full_name,
            email=user_in.email,
            password_hash=get_password_hash(user_in.password),
            phone=user_in.phone,
            role=user_in.role or UserRole.MEMBER,
            is_verified=False,
            otp_code=otp_code,
            otp_expires_at=otp_expires_at,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Gửi email xác thực OTP
    success, err_msg = email_service.send_otp_email(
        to_email=user.email,
        recipient_name=user.full_name,
        otp_code=otp_code,
        expire_minutes=settings.OTP_EXPIRE_MINUTES,
    )

    if not success:
        logger.warning(f"Gửi email OTP thất bại: {err_msg}")
        return RegisterResponse(
            message=f"Đăng ký thành công nhưng gửi email thất bại: {err_msg}. Vui lòng yêu cầu gửi lại mã OTP.",
            email=user.email,
            is_verified=False,
            requires_otp=True,
        )

    return RegisterResponse(
        message="Đăng ký tài khoản thành công! Mã OTP xác thực 6 chữ số đã được gửi tới email của bạn (hiệu lực 10 phút).",
        email=user.email,
        is_verified=False,
        requires_otp=True,
    )


@router.post("/verify-otp", response_model=Token)
def verify_otp(
    verify_data: VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Xác thực mã OTP 6 chữ số:
    1. Kiểm tra tài khoản theo email.
    2. So khớp mã OTP và hạn sử dụng (10 phút).
    3. Hợp lệ: Đổi is_verified=True, xóa OTP, trả về JWT Access Token để đăng nhập ngay.
    """
    user = db.query(User).filter(User.email == verify_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản với địa chỉ email này.",
        )

    if user.is_verified:
        # Nếu đã xác thực trước đó, cấp token luôn
        access_token = create_access_token(subject=user.id, role=user.role.value)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.role.value,
            "user": user,
        }

    if not user.otp_code or user.otp_code != verify_data.otp_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại hộp thư.",
        )

    # Kiểm tra thời hạn OTP
    now_utc = datetime.now(timezone.utc)
    if user.otp_expires_at:
        # Xử lý timezone-aware comparison an toàn
        expires_at = user.otp_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now_utc > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã xác thực OTP đã hết hạn (chỉ có hiệu lực trong 10 phút). Vui lòng yêu cầu gửi lại mã mới.",
            )

    # Đổi trạng thái sang đã xác thực
    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    db.refresh(user)

    logger.info(f"Người dùng {user.email} đã xác thực tài khoản thành công qua OTP.")

    # Trả về JWT Access Token
    access_token = create_access_token(subject=user.id, role=user.role.value)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user": user,
    }


@router.post("/resend-otp")
def resend_otp(
    resend_data: ResendOTPRequest,
    db: Session = Depends(get_db),
):
    """Gửi lại mã OTP mới khi mã cũ hết hạn hoặc thất lạc."""
    user = db.query(User).filter(User.email == resend_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản với địa chỉ email này.",
        )

    if user.is_verified:
        return {
            "success": True,
            "message": "Tài khoản của bạn đã được xác thực trước đó, có thể đăng nhập ngay.",
            "is_verified": True,
        }

    new_otp = generate_otp_code()
    user.otp_code = new_otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    db.commit()

    success, err_msg = email_service.send_otp_email(
        to_email=user.email,
        recipient_name=user.full_name,
        otp_code=new_otp,
        expire_minutes=settings.OTP_EXPIRE_MINUTES,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể gửi email OTP: {err_msg}",
        )

    return {
        "success": True,
        "message": "Mã xác thực OTP mới đã được gửi tới email của bạn (hiệu lực 10 phút).",
        "email": user.email,
    }


@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2 compatible token login, getting an access token for future requests."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn chưa được xác thực email. Vui lòng nhập mã OTP để kích hoạt tài khoản.",
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user": user,
    }


@router.post("/login/json", response_model=Token)
def login_json(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    """JSON body login for frontend React application convenience."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác.",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn chưa được xác thực email. Vui lòng nhập mã OTP để kích hoạt tài khoản.",
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return current_user
