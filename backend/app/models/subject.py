from sqlalchemy import Column, Integer, String, ForeignKey, Text, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    code = Column(String, nullable=True, index=True)
    teacher = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    color = Column(String, default="#6366f1", nullable=False)
    credits = Column(Integer, nullable=True)

    student = relationship("Student", back_populates="subjects")

    __table_args__ = (
        Index("ix_subjects_student_id", "student_id"),
        Index("ix_subjects_name", "name"),
        Index("ix_subjects_code", "code"),
    )
