from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, Text, DateTime, Boolean, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Package(Base):
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, index=True)
    duration_days = Column(Integer, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="all", index=True)
    badge = Column(String(50), nullable=True)
    benefits = Column(Text, nullable=True)
    commitments = Column(Text, nullable=True)
    featured = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Constraints
    __table_args__ = (
        CheckConstraint("duration_days > 0", name="chk_package_duration_positive"),
        CheckConstraint("price >= 0", name="chk_package_price_non_negative"),
    )

    # Relationships
    memberships = relationship("Membership", back_populates="package")
