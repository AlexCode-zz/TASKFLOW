from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base


class StudentPreference(Base):
    __tablename__ = "student_preferences"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    usual_start_time = Column(String, nullable=True)   # HH:MM
    usual_sleep_time = Column(String, nullable=True)   # HH:MM
    preferred_study_session_minutes = Column(Integer, nullable=True)
    preferred_break_minutes = Column(Integer, nullable=True)
    exam_preparation_days = Column(Integer, nullable=True)
    planning_preference = Column(String, default="daily", nullable=True)  # daily or weekly

    student = relationship("Student", back_populates="preferences")
