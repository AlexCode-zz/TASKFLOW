"""Migración 008: tareas como checklists con proyecto opcional.

- Agrega `project_id` opcional a `tasks` (FK a `projects`).
- Hace opcionales `subject_id` y `due_date` en `tasks` (checklist sin materia/fecha).
"""

from sqlalchemy import text


def _columns(db, table: str) -> set:
    rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def _is_not_null(db, table: str, column: str) -> bool:
    rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
    for row in rows:
        if row[1] == column:
            return bool(row[3])
    return False


def _rebuild_tasks(db) -> None:
    """Recrea tasks con project_id opcional y subject_id/due_date nullable."""
    db.execute(text("ALTER TABLE tasks RENAME TO tasks_old"))
    db.execute(
        text(
            """
            CREATE TABLE tasks (
                id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                subject_id INTEGER,
                project_id INTEGER,
                title VARCHAR NOT NULL,
                description TEXT,
                assigned_date DATE,
                due_date DATE,
                due_time VARCHAR,
                priority VARCHAR NOT NULL,
                status VARCHAR NOT NULL,
                estimated_minutes INTEGER,
                observations TEXT,
                PRIMARY KEY (id),
                FOREIGN KEY(student_id) REFERENCES students (id) ON DELETE CASCADE,
                FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
            )
            """
        )
    )
    db.execute(
        text(
            """
            INSERT INTO tasks (
                id, student_id, subject_id, project_id, title, description,
                assigned_date, due_date, due_time, priority, status, estimated_minutes, observations
            )
            SELECT
                id, student_id, subject_id, NULL, title, description,
                assigned_date, due_date, due_time, priority, status, estimated_minutes, observations
            FROM tasks_old
            """
        )
    )
    db.execute(text("DROP TABLE tasks_old"))
    for column in ("student_id", "subject_id", "project_id", "title", "due_date", "status"):
        db.execute(
            text(f"CREATE INDEX IF NOT EXISTS ix_tasks_{column} ON tasks ({column})")
        )


def up(db) -> None:
    tasks_columns = _columns(db, "tasks")
    needs_rebuild = (
        "project_id" not in tasks_columns
        or _is_not_null(db, "tasks", "subject_id")
        or _is_not_null(db, "tasks", "due_date")
    )
    if needs_rebuild:
        _rebuild_tasks(db)


def down(db) -> None:
    """No se revierte para conservar los datos registrados."""
    pass
