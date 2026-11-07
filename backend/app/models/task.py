from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date
from sqlalchemy.orm import relationship

from app.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    assigned_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=False)
    due_time = Column(String, nullable=True)  # HH:MM
    priority = Column(String, default="media")  # baja, media, alta, urgente
    status = Column(String, default="pendiente")  # pendiente, en_progreso, completada
    estimated_minutes = Column(Integer, nullable=True)
    observations = Column(Text, nullable=True)

    student = relationship("Student")
    subject = relationship("Subject")
