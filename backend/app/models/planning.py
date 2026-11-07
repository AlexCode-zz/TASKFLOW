from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    week_start_date = Column(Date, nullable=False)
    week_end_date = Column(Date, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    total_sessions = Column(Integer, default=0, nullable=False)
    scheduled_hours = Column(Integer, default=0, nullable=False)
    unscheduled_tasks = Column(Integer, default=0, nullable=False)

    student = relationship("Student")
    sessions = relationship("PlanningSession", back_populates="plan", cascade="all, delete-orphan")


class PlanningSession(Base):
    __tablename__ = "planning_sessions"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    scheduled_date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)   # HH:MM
    end_time = Column(String, nullable=False)     # HH:MM
    duration_minutes = Column(Integer, nullable=False)
    session_type = Column(String, default="study")  # study, task, review
    origin = Column(String, default="automatic")  # automatic, manual
    status = Column(String, default="pending")    # pending, in_progress, completed, postponed
    is_manually_modified = Column(Boolean, default=False, nullable=False)
    explanation = Column(Text, nullable=True)
    priority_score = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    plan = relationship("Plan", back_populates="sessions")
    student = relationship("Student")
    task = relationship("Task")
    subject = relationship("Subject")
