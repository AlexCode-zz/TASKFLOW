# TaskFlow — Fase 1: Fundamentos y Arquitectura

TaskFlow es una aplicación local de organización académica universitaria que ayuda al estudiante a organizar materias, horarios de clases, laboratorios, tareas, proyectos, parciales y tiempo de estudio.

Incluye un asistente de inteligencia artificial opcional mediante OpenRouter, con API key configurable por el usuario desde los ajustes.

## Arquitectura

- **Frontend:** React + Vite + JavaScript + Bootstrap 5 + CSS personalizado + React Router.
- **Backend:** FastAPI + Python + SQLite + SQLAlchemy.
- **IA:** OpenRouter API (integración vía backend, API key del usuario).
- **Datos:** almacenamiento local únicamente. No hay autenticación, ni Supabase, ni Resend.

## Estructura de carpetas

```
TASKFLOW/
├── frontend/          # React + Vite
├── backend/           # FastAPI + SQLite
├── docs/              # Documentación
├── README.md
└── .gitignore
```

## Requisitos previos

- Node.js >= 18 y npm
- Python >= 3.10 y pip

## Instalación y ejecución

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Copia el ejemplo de variables de entorno
cp .env.example .env

# Edita .env si necesitas ajustar la configuración

# Iniciar el servidor
uvicorn app.main:app --reload
```

El backend estará disponible en `http://localhost:8000`.
Endpoint de salud: `GET http://localhost:8000/health`

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install

# Copia el ejemplo de variables de entorno
cp .env.example .env

# Edita .env si es necesario (URL del backend)

# Iniciar en modo desarrollo
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

### 3. Construcción para producción (frontend)

```bash
cd frontend
npm run build
```

## Variables de entorno

Cada carpeta (`frontend/` y `backend/`) contiene un archivo `.env.example`. Copialo a `.env` y ajusta los valores. Nunca subas claves reales al repositorio.

## Módulos (Fase 1)

Solo está implementada la vista principal "Mi semana" con la estructura de navegación. Los módulos académicos (Materias, Tareas, Proyectos, Calendario, Evaluaciones, Reportes, Configuración, Asistente IA) se desarrollarán en fases posteriores.

## Licencia

Proyecto de portafolio — uso educativo y personal.
