"""Migración 006: notas, ponderaciones y 4+4 por materia.

- Permite que parciales y laboratorios no tengan fecha hasta que el
  estudiante la registre.
- Agrega `grade` (nota) a evaluaciones y laboratorios.
- Agrega `weight_percentage` a laboratorios para el promedio ponderado.
- Completa 4 parciales y 4 laboratorios vacíos en cada materia existente.
"""

import re

from sqlalchemy import text


def _table_info(db, table: str):
    return db.execute(text(f"PRAGMA table_info({table})")).fetchall()


def _column_names(db, table: str) -> set:
    return {row[1] for row in _table_info(db, table)}


def _is_not_null(db, table: str, column: str) -> bool:
    for row in _table_info(db, table):
        if row[1] == column:
            return bool(row[3])
    return False


def _rebuild_evaluations(db) -> None:
    """Recrea evaluations con fecha opcional y columna grade."""
    db.execute(text("ALTER TABLE evaluations RENAME TO evaluations_old"))
    db.execute(
        text(
            """
            CREATE TABLE evaluations (
                id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                title VARCHAR NOT NULL,
                evaluation_type VARCHAR NOT NULL,
                date DATE,
                start_time VARCHAR,
                end_time VARCHAR,
                weight_percentage FLOAT,
                grade FLOAT,
                description TEXT,
                topics TEXT,
                preparation_level VARCHAR NOT NULL,
                status VARCHAR NOT NULL,
                PRIMARY KEY (id),
                FOREIGN KEY(student_id) REFERENCES students (id) ON DELETE CASCADE,
                FOREIGN KEY(subject_id) REFERENCES subjects (id) ON DELETE CASCADE
            )
            """
        )
    )
    db.execute(
        text(
            """
            INSERT INTO evaluations (
                id, student_id, subject_id, title, evaluation_type, date,
                start_time, end_time, weight_percentage, grade, description,
                topics, preparation_level, status
            )
            SELECT
                id, student_id, subject_id, title, evaluation_type, date,
                start_time, end_time, weight_percentage, NULL, description,
                topics, preparation_level, status
            FROM evaluations_old
            """
        )
    )
    db.execute(text("DROP TABLE evaluations_old"))
    for column in (
        "student_id",
        "subject_id",
        "title",
        "evaluation_type",
        "date",
        "preparation_level",
        "status",
    ):
        db.execute(
            text(f"CREATE INDEX IF NOT EXISTS ix_evaluations_{column} ON evaluations ({column})")
        )


def _rebuild_laboratories(db) -> None:
    """Recrea laboratories con fecha/horas opcionales, nota y ponderación."""
    db.execute(text("ALTER TABLE laboratories RENAME TO laboratories_old"))
    db.execute(
        text(
            """
            CREATE TABLE laboratories (
                id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                title VARCHAR NOT NULL,
                date DATE,
                start_time VARCHAR,
                end_time VARCHAR,
                location VARCHAR,
                description TEXT,
                materials TEXT,
                weight_percentage FLOAT,
                grade FLOAT,
                status VARCHAR NOT NULL,
                PRIMARY KEY (id),
                FOREIGN KEY(student_id) REFERENCES students (id) ON DELETE CASCADE,
                FOREIGN KEY(subject_id) REFERENCES subjects (id) ON DELETE CASCADE
            )
            """
        )
    )
    db.execute(
        text(
            """
            INSERT INTO laboratories (
                id, student_id, subject_id, title, date, start_time, end_time,
                location, description, materials, weight_percentage, grade, status
            )
            SELECT
                id, student_id, subject_id, title, date, start_time, end_time,
                location, description, materials, NULL, NULL, status
            FROM laboratories_old
            """
        )
    )
    db.execute(text("DROP TABLE laboratories_old"))
    for column in ("student_id", "subject_id", "title", "date", "status"):
        db.execute(
            text(f"CREATE INDEX IF NOT EXISTS ix_laboratories_{column} ON laboratories ({column})")
        )


def _used_numbers(titles, prefix: str) -> set:
    used = set()
    for title in titles:
        match = re.match(rf"^{prefix} (\d+)$", title or "")
        if match:
            used.add(int(match.group(1)))
    return used


def _seed_defaults(db) -> None:
    """Crea los 4 parciales y 4 laboratorios que falten por materia."""
    subjects = db.execute(text("SELECT id, student_id FROM subjects")).fetchall()
    for subject_id, student_id in subjects:
        parciales = db.execute(
            text(
                "SELECT title FROM evaluations "
                "WHERE subject_id = :sid AND evaluation_type = 'parcial'"
            ),
            {"sid": subject_id},
        ).fetchall()
        used_parciales = _used_numbers([row[0] for row in parciales], "Parcial")
        count = len(parciales)
        for number in range(1, 5):
            if count >= 4:
                break
            if number in used_parciales:
                continue
            db.execute(
                text(
                    """
                    INSERT INTO evaluations (
                        student_id, subject_id, title, evaluation_type, date,
                        preparation_level, status
                    ) VALUES (
                        :student_id, :subject_id, :title, 'parcial', NULL,
                        'no_iniciado', 'pendiente'
                    )
                    """
                ),
                {
                    "student_id": student_id,
                    "subject_id": subject_id,
                    "title": f"Parcial {number}",
                },
            )
            count += 1

        laboratorios = db.execute(
            text("SELECT title FROM laboratories WHERE subject_id = :sid"),
            {"sid": subject_id},
        ).fetchall()
        used_laboratorios = _used_numbers([row[0] for row in laboratorios], "Laboratorio")
        count = len(laboratorios)
        for number in range(1, 5):
            if count >= 4:
                break
            if number in used_laboratorios:
                continue
            db.execute(
                text(
                    """
                    INSERT INTO laboratories (
                        student_id, subject_id, title, date, start_time, end_time,
                        status
                    ) VALUES (
                        :student_id, :subject_id, :title, NULL, NULL, NULL, 'pendiente'
                    )
                    """
                ),
                {
                    "student_id": student_id,
                    "subject_id": subject_id,
                    "title": f"Laboratorio {number}",
                },
            )
            count += 1


def up(db) -> None:
    evaluation_columns = _column_names(db, "evaluations")
    if "grade" not in evaluation_columns or _is_not_null(db, "evaluations", "date"):
        _rebuild_evaluations(db)

    laboratory_columns = _column_names(db, "laboratories")
    if (
        "grade" not in laboratory_columns
        or "weight_percentage" not in laboratory_columns
        or _is_not_null(db, "laboratories", "date")
        or _is_not_null(db, "laboratories", "start_time")
        or _is_not_null(db, "laboratories", "end_time")
    ):
        _rebuild_laboratories(db)

    _seed_defaults(db)


def down(db) -> None:
    """No se revierte para conservar notas y ponderaciones registradas."""
    pass
