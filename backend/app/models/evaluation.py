from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date, Float, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    evaluation_type = Column(String, nullable=False)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    weight_percentage = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    topics = Column(Text, nullable=True)
    preparation_level = Column(String, default="no_iniciado", nullable=False)
    status = Column(String, default="pendiente", nullable=False)

    student = relationship("Student", back_populates="evaluations")
    subject = relationship("Subject")

    __table_args__ = (
        Index("ix_evaluations_student_date", "student_id", "date"),
        Index("ix_evaluations_subject", "subject_id"),
        Index("ix_evaluations_status", "status"),
    )
