from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, Text
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
    classroom = Column(String, nullable=True)
    cycle = Column(Integer, nullable=True)
    is_favorite = Column(Boolean, nullable=False, default=False)

    student = relationship("Student", back_populates="subjects")
