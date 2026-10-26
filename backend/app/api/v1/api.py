from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    members,
    packages,
    memberships,
    trainers,
    schedules,
    attendance,
    payments,
    dashboard,
    ai,
    hourly_bookings,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users Management"])
api_router.include_router(members.router, prefix="/members", tags=["Members Management"])
api_router.include_router(packages.router, prefix="/packages", tags=["Gym Packages"])
api_router.include_router(memberships.router, prefix="/memberships", tags=["Memberships"])
api_router.include_router(trainers.router, prefix="/trainers", tags=["Personal Trainers"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["Workout Schedules"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance & Check-in"])
api_router.include_router(payments.router, prefix="/payments", tags=["Billing & Payments"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard Statistics"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Fitness Advisor"])
api_router.include_router(hourly_bookings.router, prefix="/hourly-bookings", tags=["Hourly Pass Bookings"])
