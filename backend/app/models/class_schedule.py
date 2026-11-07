from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class ClassSchedule(Base):
    __tablename__ = "class_schedules"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    day_of_week = Column(String, nullable=False)  # lunes, martes, etc.
    start_time = Column(String, nullable=False)   # HH:MM
    end_time = Column(String, nullable=False)     # HH:MM
    room = Column(String, nullable=True)
    teacher = Column(String, nullable=True)
    modality = Column(String, default="presencial")  # presencial, virtual, hybrid
    observations = Column(Text, nullable=True)

    student = relationship("Student")
    subject = relationship("Subject")
