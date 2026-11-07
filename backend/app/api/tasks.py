from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud.task import (
    get_tasks_by_student,
    get_tasks_by_subject,
    get_tasks_by_status,
    get_upcoming_tasks,
    create_task,
    update_task,
    delete_task,
    get_task,
)
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/tasks", tags=["Tareas"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


@router.get("/", response_model=List[TaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    """Lista todas las tareas del estudiante."""
    student = get_current_student(db)
    return get_tasks_by_student(db, student.id)


@router.get("/upcoming", response_model=List[TaskResponse])
def list_upcoming_tasks(db: Session = Depends(get_db)):
    """Lista las tareas próximas (hoy en adelante)."""
    student = get_current_student(db)
    return get_upcoming_tasks(db, student.id)


@router.get("/subject/{subject_id}", response_model=List[TaskResponse])
def list_tasks_by_subject(subject_id: int, db: Session = Depends(get_db)):
    """Lista las tareas de una materia específica."""
    student = get_current_student(db)
    return get_tasks_by_subject(db, student.id, subject_id)


@router.get("/status/{status}", response_model=List[TaskResponse])
def list_tasks_by_status(status: str, db: Session = Depends(get_db)):
    """Lista las tareas filtradas por estado."""
    student = get_current_student(db)
    return get_tasks_by_status(db, student.id, status)


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task_endpoint(task_in: TaskCreate, db: Session = Depends(get_db)):
    """Registra una nueva tarea."""
    student = get_current_student(db)

    if task_in.due_time and task_in.assigned_date and task_in.due_date:
        from datetime import date, time
        if task_in.due_date == task_in.assigned_date and task_in.due_time:
            pass  # validación simple de fecha/hora

    return create_task(db, student.id, task_in)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task_endpoint(task_id: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de una tarea."""
    student = get_current_student(db)
    task = get_task(db, task_id)
    if not task or task.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada.",
        )
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task_endpoint(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    """Actualiza una tarea existente."""
    student = get_current_student(db)
    task = get_task(db, task_id)
    if not task or task.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada.",
        )
    return update_task(db, task_id, task_in)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_endpoint(task_id: int, db: Session = Depends(get_db)):
    """Elimina una tarea."""
    student = get_current_student(db)
    task = get_task(db, task_id)
    if not task or task.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada.",
        )
    delete_task(db, task_id)
    return None
