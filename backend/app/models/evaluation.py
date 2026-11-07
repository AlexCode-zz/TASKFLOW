from sqlalchemy import Column, Integer, String, ForeignKey, Text, Date, Float
from sqlalchemy.orm import relationship

from app.db.base import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    title = Column(String, nullable=False)
    evaluation_type = Column(String, nullable=False)  # parcial, final, quiz, practico, exposicion, proyecto, laboratorio, otro
    date = Column(Date, nullable=False)
    start_time = Column(String, nullable=True)   # HH:MM
    end_time = Column(String, nullable=True)     # HH:MM
    weight_percentage = Column(Float, nullable=True)  # ponderación %
    description = Column(Text, nullable=True)
    topics = Column(Text, nullable=True)
    preparation_level = Column(String, default="no_iniciado")  # no_iniciado, estudiando, preparado
    status = Column(String, default="pendiente")  # pendiente, realizado, cancelado

    student = relationship("Student")
    subject = relationship("Subject")
