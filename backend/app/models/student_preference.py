from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class StudentPreference(Base):
    __tablename__ = "student_preferences"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    usual_start_time = Column(String, nullable=True)
    usual_sleep_time = Column(String, nullable=True)
    preferred_study_session_minutes = Column(Integer, nullable=True)
    preferred_break_minutes = Column(Integer, nullable=True)
    exam_preparation_days = Column(Integer, nullable=True)
    planning_preference = Column(String, default="daily", nullable=True)

    student = relationship("Student", back_populates="preferences")
