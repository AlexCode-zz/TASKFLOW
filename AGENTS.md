# TaskFlow — Instrucciones para agentes

App local de organización académica (React 18 + Vite + Bootstrap, FastAPI + SQLAlchemy + SQLite).
Tema visual: negro puro, puntos blancos sutiles, bordes finos blancos, texto/iconos blancos, sin emojis.
Correr solo de forma local. Sin auth. Datos en SQLite local.

## Comandos clave

- Tests backend: `cd backend && python3 -m pytest tests/ -q` (usa `backend/tests/test_taskflow.db`, BD de pruebas fresh por test).
- Backend: `cd backend && uvicorn app.main:app --reload` (puerto 8000, DB real `backend/taskflow.db` — gitignored).
- Frontend lint: `cd frontend && npx eslint src --max-warnings=0`
- Frontend build: `cd frontend && npm run build`
- Frontend dev: `cd frontend && npm run dev` (Vite, puerto habitual 5179; proxy `/api` → `http://localhost:8000`).

## Arquitectura y fronteras

- `backend/app/api` → routers FastAPI; `backend/app/crud` → acceso a BD; `backend/app/services` → reglas de negocio (p. ej. academic); `backend/app/schemas` → Pydantic; `backend/app/models` → SQLAlchemy; `backend/app/db/migrations` → migraciones 001–006.
- `frontend/src/pages` → rutas; `frontend/src/components/{ui,common,layout,academic,ai,wizard}` → componentes; `frontend/src/utils` → helpers.
- Rutas actuales: `/` Inicio, `/semana`, `/materias`, `/clases` (Horarios), `/laboratorios`, `/parciales`, `/calendario`, `/tareas`, `/proyectos`, `/informes`, `/asistente-ia`, `/configuracion`. Redirección: `/evaluaciones` → `/parciales`.

## Módulo académico (materias / parciales / laboratorios) — estado actual

- Cada materia crea por defecto **4 parciales + 4 laboratorios** (títulos `Parcial N` / `Laboratorio N`, fecha null, status `pendiente`).
- Endpoint académico: `GET /api/subjects/{subject_id}/academic-items` → `{ subject_id, parciales, laboratorios, summary }`.
- Resumen: promedio ponderado = suma(nota×peso)/suma(pesos) solo con ítems con `grade` y `weight_percentage > 0`; si no hay porcentajes, promedio `null`.
- Fecha de parcial/laboratorio es opcional (se registra al realizar); nota (`grade`) y porcentaje opcional en evaluaciones y laboratorios.
- Frontend: modal desde tarjeta (`SubjectAcademicModal`, `AcademicItemList`) con items apilados uno debajo de otro, check realizado, fecha obligatoria al marcar realizado, nota y peso; `SubjectScheduleModal` para horario por materia.

## Quirks y errores conocidos

- Pydantic v2: al haber un campo llamado `date`, importar como `from datetime import date as date_type` (colisión con el nombre del campo genera `NoneType`).
- Tests con `TestClient(app)` sin override de `get_db` escriben en la **BD real** (`backend/taskflow.db`) — en tests siempre sobreescribir la dependencia.
- SQLite: FK enforcement puede estar off; al borrar materias limpiar manualmente hijos (evaluaciones, laboratorios, tareas, etc.).
- Migraciones SQLite: se recrachan tablas en `up()` (patrón `ALTER TABLE ... RENAME TO ... CREATE ... INSERT ... DROP`).
- Frontend: API base `/api` (axios); Vite proxy `/api` → backend. Theme: black/white dots. Botones custom en `components/ui/Button.jsx` (prop `type` para submit).
