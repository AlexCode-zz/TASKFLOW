from sqlalchemy import Column, Integer, String, ForeignKey, Text, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class ClassSchedule(Base):
    __tablename__ = "class_schedules"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(String, nullable=False, index=True)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    room = Column(String, nullable=True)
    teacher = Column(String, nullable=True)
    modality = Column(String, default="presencial", nullable=False)
    observations = Column(Text, nullable=True)

    student = relationship("Student", back_populates="class_schedules")
    subject = relationship("Subject")

    __table_args__ = (
        Index("ix_class_schedules_student_day", "student_id", "day_of_week"),
        Index("ix_class_schedules_subject", "subject_id"),
    )
