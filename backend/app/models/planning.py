from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start_date = Column(Date, nullable=False, index=True)
    week_end_date = Column(Date, nullable=False, index=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    total_sessions = Column(Integer, default=0, nullable=False)
    scheduled_hours = Column(Integer, default=0, nullable=False)
    unscheduled_tasks = Column(Integer, default=0, nullable=False)

    student = relationship("Student", back_populates="plans")
    sessions = relationship("PlanningSession", back_populates="plan", cascade="all, delete-orphan")


class PlanningSession(Base):
    __tablename__ = "planning_sessions"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    scheduled_date = Column(Date, nullable=False, index=True)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    session_type = Column(String, default="study", nullable=False, index=True)
    origin = Column(String, default="automatic", nullable=False, index=True)
    status = Column(String, default="pending", nullable=False, index=True)
    is_manually_modified = Column(Boolean, default=False, nullable=False, index=True)
    explanation = Column(Text, nullable=True)
    priority_score = Column(Integer, default=0, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    plan = relationship("Plan", back_populates="sessions")
    student = relationship("Student", back_populates="planning_sessions")
    task = relationship("Task")
    subject = relationship("Subject")
