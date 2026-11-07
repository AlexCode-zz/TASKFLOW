from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date
from sqlalchemy.orm import relationship

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    priority = Column(String, default="media")  # baja, media, alta, urgente
    status = Column(String, default="pendiente")  # pendiente, en_progreso, completada
    progress_percentage = Column(Integer, default=0)  # 0-100

    student = relationship("Student")
    subject = relationship("Subject")
