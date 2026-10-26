"""
Alias and direct export for package endpoints to support direct imports from app.api.v1.packages.
Includes:
- GET /api/v1/packages (List packages from DB)
- GET /api/v1/packages/{id} (Get package detail)
- POST /api/v1/packages (Admin only: create package)
- PUT /api/v1/packages/{id} (Admin only: update package)
- DELETE /api/v1/packages/{id} (Admin only: delete package)
"""
from app.api.v1.endpoints.packages import (
    router,
    get_packages,
    get_package,
    create_package,
    update_package,
    delete_package,
)

__all__ = [
    "router",
    "get_packages",
    "get_package",
    "create_package",
    "update_package",
    "delete_package",
]
