from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


# Shared properties
class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150, examples=["Nguyễn Văn An"])
    email: EmailStr = Field(..., examples=["an.nguyen@example.com"])
    phone: Optional[str] = Field(None, max_length=20, examples=["0912345678"])
    role: UserRole = Field(default=UserRole.MEMBER)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


# Properties to receive via API on update
class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)


# Properties returned to client (exclude password)
class UserResponse(UserBase):
    id: int
    is_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# OTP Verification Schemas
class VerifyOTPRequest(BaseModel):
    email: EmailStr = Field(..., examples=["member@example.com"])
    otp_code: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class ResendOTPRequest(BaseModel):
    email: EmailStr = Field(..., examples=["member@example.com"])


class RegisterResponse(BaseModel):
    message: str
    email: EmailStr
    is_verified: bool
    requires_otp: bool = True
