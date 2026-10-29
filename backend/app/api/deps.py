"""
API dependencies proxy module.
Re-exports dependencies from app.core.deps to support imports from app.api.deps.
"""
from app.core.deps import (
    oauth2_scheme,
    get_current_user,
    oauth2_scheme_optional,
    get_current_user_optional,
    require_roles,
    get_current_admin,
    get_current_staff,
    get_current_pt_or_admin,
    normalize_role,
    STAFF_ROLE_VARIANTS,
)

__all__ = [
    "oauth2_scheme",
    "get_current_user",
    "oauth2_scheme_optional",
    "get_current_user_optional",
    "require_roles",
    "get_current_admin",
    "get_current_staff",
    "get_current_pt_or_admin",
    "normalize_role",
    "STAFF_ROLE_VARIANTS",
]

