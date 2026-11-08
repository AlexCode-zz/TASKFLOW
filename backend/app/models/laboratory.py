from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date, Float
from sqlalchemy.orm import relationship

from app.db.base import Base


class Laboratory(Base):
    __tablename__ = "laboratories"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=True, index=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    materials = Column(Text, nullable=True)
    weight_percentage = Column(Float, nullable=True)
    grade = Column(Float, nullable=True)
    status = Column(String, default="pendiente", nullable=False, index=True)

    student = relationship("Student", back_populates="laboratories")
    subject = relationship("Subject")
