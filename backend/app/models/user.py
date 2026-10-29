import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    RECEPTIONIST = "receptionist"
    RECEPTION = "reception"
    STAFF = "staff"
    PT = "pt"
    MEMBER = "member"

    @classmethod
    def _missing_(cls, value):
        """Case-insensitive and alias-aware role parser ('ADMIN' -> UserRole.ADMIN, 'staff' -> UserRole.STAFF)."""
        if isinstance(value, str):
            val_lower = value.strip().lower()
            for member in cls:
                if member.value == val_lower or member.name.lower() == val_lower:
                    return member
        return super()._missing_(value)


class SafeUserRoleType(TypeDecorator):
    """SQLAlchemy TypeDecorator that normalizes role strings (case-insensitive)
    between the database and UserRole enum instances.
    """
    impl = String(50)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if hasattr(value, "value"):
            return str(value.value).strip().lower()
        return str(value).strip().lower()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return UserRole(value)
        except Exception:
            return str(value).strip().lower()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        SafeUserRoleType(),
        nullable=False,
        default=UserRole.MEMBER,
        index=True,
    )
    phone = Column(String(20), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    otp_code = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    memberships = relationship(
        "Membership", back_populates="user", cascade="all, delete-orphan"
    )
    trainer_profile = relationship(
        "Trainer", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    member_schedules = relationship(
        "WorkoutSchedule",
        foreign_keys="WorkoutSchedule.member_id",
        back_populates="member",
        cascade="all, delete-orphan",
    )
    attendances = relationship(
        "Attendance", back_populates="member", cascade="all, delete-orphan"
    )
    ai_logs = relationship("AILog", back_populates="user")
