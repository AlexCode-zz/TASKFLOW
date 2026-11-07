from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    priority = Column(String, default="media", nullable=False)
    status = Column(String, default="pendiente", nullable=False)
    progress_percentage = Column(Integer, default=0, nullable=False)

    student = relationship("Student", back_populates="projects")
    subject = relationship("Subject")

    __table_args__ = (
        Index("ix_projects_student_status", "student_id", "status"),
        Index("ix_projects_subject", "subject_id"),
    )
