from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class WeeklyAvailability(Base):
    __tablename__ = "weekly_availability"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(String, nullable=False, index=True)
    is_available = Column(Boolean, default=True, nullable=False)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)

    student = relationship("Student", back_populates="availability")

    __table_args__ = (
        Index("ix_availability_student_day", "student_id", "day_of_week"),
    )
