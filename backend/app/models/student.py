from sqlalchemy import Column, Integer, String, Date, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    institution = Column(String, nullable=True)
    career = Column(String, nullable=True, index=True)
    faculty = Column(String, nullable=True)
    academic_year = Column(Integer, nullable=True)
    semester = Column(String, nullable=True)
    cycle_start_date = Column(Date, nullable=True)
    cycle_end_date = Column(Date, nullable=True)
    is_configured = Column(Boolean, default=False, nullable=False, index=True)

    subjects = relationship("Subject", back_populates="student", cascade="all, delete-orphan")
    availability = relationship("WeeklyAvailability", back_populates="student", cascade="all, delete-orphan")
    preferences = relationship("StudentPreference", back_populates="student", uselist=False, cascade="all, delete-orphan")
    class_schedules = relationship("ClassSchedule", back_populates="student", cascade="all, delete-orphan")
    laboratories = relationship("Laboratory", back_populates="student", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="student", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="student", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="student", cascade="all, delete-orphan")
    plans = relationship("Plan", back_populates="student", cascade="all, delete-orphan")
    planning_sessions = relationship("PlanningSession", back_populates="student", cascade="all, delete-orphan")
