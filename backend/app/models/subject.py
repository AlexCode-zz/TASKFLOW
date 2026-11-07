from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)
    teacher = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    color = Column(String, default="#6366f1", nullable=False)
    credits = Column(Integer, nullable=True)

    student = relationship("Student", back_populates="subjects")
