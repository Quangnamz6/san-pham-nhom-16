from typing import List, Callable, Optional, Union, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def normalize_role(role_val: Any) -> str:
    """Safely convert any role (Enum, str, or object) to a lowercase stripped string."""
    if role_val is None:
        return ""
    if hasattr(role_val, "value"):
        return str(role_val.value).strip().lower()
    return str(role_val).strip().lower()


STAFF_ROLE_VARIANTS = {"admin", "receptionist", "reception", "staff"}


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """Validate Bearer token and retrieve the current authenticated User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id_str is None or token_type != "access":
            raise credentials_exception
        token_data = TokenPayload(sub=user_id_str, role=payload.get("role"))
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if user is None:
        raise credentials_exception
    return user


oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme_optional),
) -> Optional[User]:
    """Retrieve the current user if token is present and valid; otherwise returns None."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id_str is None or token_type != "access":
            return None
        return db.query(User).filter(User.id == int(user_id_str)).first()
    except Exception:
        return None


def require_roles(allowed_roles: List[Union[UserRole, str]]) -> Callable:
    """Dependency factory to enforce Role-Based Access Control (RBAC).
    Normalizes role strings to lowercase before comparison ('ADMIN' vs 'admin',
    'RECEPTIONIST' vs 'receptionist') and permits 'reception' and 'staff'
    whenever receptionist permissions are allowed.
    """
    normalized_allowed = set()
    for r in allowed_roles:
        val = normalize_role(r)
        if val:
            normalized_allowed.add(val)
            if val in ["receptionist", "reception", "staff"]:
                normalized_allowed.update(STAFF_ROLE_VARIANTS)
            if val == "admin":
                normalized_allowed.add("admin")

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = normalize_role(current_user.role)
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền thực hiện thao tác này",
            )
        return current_user

    return role_checker


# Convenient role-specific dependencies
get_current_admin = require_roles([UserRole.ADMIN])
get_current_staff = require_roles([UserRole.ADMIN, UserRole.RECEPTIONIST, "reception", "staff"])
get_current_pt_or_admin = require_roles([UserRole.ADMIN, UserRole.PT])
