from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date
from sqlalchemy.orm import relationship

from app.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    assigned_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=False, index=True)
    due_time = Column(String, nullable=True)
    priority = Column(String, default="media", nullable=False, index=True)
    status = Column(String, default="pendiente", nullable=False, index=True)
    estimated_minutes = Column(Integer, nullable=True)
    observations = Column(Text, nullable=True)

    student = relationship("Student", back_populates="tasks")
    subject = relationship("Subject")
