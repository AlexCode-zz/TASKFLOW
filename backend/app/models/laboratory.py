from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date, Index
from sqlalchemy.orm import relationship

from app.db.base import Base


class Laboratory(Base):
    __tablename__ = "laboratories"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    materials = Column(Text, nullable=True)
    status = Column(String, default="pendiente", nullable=False)

    student = relationship("Student", back_populates="laboratories")
    subject = relationship("Subject")

    __table_args__ = (
        Index("ix_laboratories_student_date", "student_id", "date"),
        Index("ix_laboratories_subject", "subject_id"),
    )
