from sqlalchemy.orm import Session
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


def get_project(db: Session, project_id: int):
    return db.query(Project).filter(Project.id == project_id).first()


def get_projects_by_student(db: Session, student_id: int):
    return db.query(Project).filter(Project.student_id == student_id).all()


def get_projects_by_subject(db: Session, student_id: int, subject_id: int):
    return (
        db.query(Project)
        .filter(Project.student_id == student_id, Project.subject_id == subject_id)
        .all()
    )


def create_project(db: Session, student_id: int, project_in: ProjectCreate):
    db_project = Project(**project_in.model_dump(), student_id=student_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project(db: Session, project_id: int, project_in: ProjectUpdate):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_project, field, value)
    db.commit()
    db.refresh(db_project)
    return db_project


def delete_project(db: Session, project_id: int):
    db_project = get_project(db, project_id)
    if not db_project:
        return False
    db.delete(db_project)
    db.commit()
    return True
