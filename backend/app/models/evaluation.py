from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date, Float
from sqlalchemy.orm import relationship

from app.db.base import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False, index=True)
    evaluation_type = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    weight_percentage = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    topics = Column(Text, nullable=True)
    preparation_level = Column(String, default="no_iniciado", nullable=False, index=True)
    status = Column(String, default="pendiente", nullable=False, index=True)

    student = relationship("Student", back_populates="evaluations")
    subject = relationship("Subject")
