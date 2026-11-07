from sqlalchemy import Column, Integer, String, Date, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    institution = Column(String, nullable=True)
    career = Column(String, nullable=False)
    faculty = Column(String, nullable=True)
    academic_year = Column(Integer, nullable=True)
    semester = Column(String, nullable=True)
    cycle_start_date = Column(Date, nullable=True)
    cycle_end_date = Column(Date, nullable=True)
    is_configured = Column(Boolean, default=False, nullable=False)

    subjects = relationship("Subject", back_populates="student", cascade="all, delete-orphan")
    availability = relationship("WeeklyAvailability", back_populates="student", cascade="all, delete-orphan")
    preferences = relationship("StudentPreference", back_populates="student", uselist=False, cascade="all, delete-orphan")
