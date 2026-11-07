from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.crud.student import get_latest_student
from app.crud.project import (
    get_projects_by_student,
    get_projects_by_subject,
    create_project,
    update_project,
    delete_project,
    get_project,
)
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["Proyectos"])


def get_current_student(db: Session):
    student = get_latest_student(db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró configuración de estudiante.",
        )
    return student


@router.get("/", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """Lista todos los proyectos del estudiante."""
    student = get_current_student(db)
    return get_projects_by_student(db, student.id)


@router.get("/subject/{subject_id}", response_model=List[ProjectResponse])
def list_projects_by_subject(subject_id: int, db: Session = Depends(get_db)):
    """Lista los proyectos de una materia específica."""
    student = get_current_student(db)
    return get_projects_by_subject(db, student.id, subject_id)


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project_endpoint(project_in: ProjectCreate, db: Session = Depends(get_db)):
    """Registra un nuevo proyecto."""
    student = get_current_student(db)

    if project_in.due_date < project_in.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de entrega debe ser posterior a la fecha de inicio.",
        )

    return create_project(db, student.id, project_in)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_endpoint(project_id: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de un proyecto."""
    student = get_current_student(db)
    project = get_project(db, project_id)
    if not project or project.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado.",
        )
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project_endpoint(project_id: int, project_in: ProjectUpdate, db: Session = Depends(get_db)):
    """Actualiza un proyecto existente."""
    student = get_current_student(db)
    project = get_project(db, project_id)
    if not project or project.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado.",
        )

    start_date = project_in.start_date or project.start_date
    due_date = project_in.due_date or project.due_date
    if due_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de entrega debe ser posterior a la fecha de inicio.",
        )

    return update_project(db, project_id, project_in)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_endpoint(project_id: int, db: Session = Depends(get_db)):
    """Elimina un proyecto."""
    student = get_current_student(db)
    project = get_project(db, project_id)
    if not project or project.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado.",
        )
    delete_project(db, project_id)
    return None
