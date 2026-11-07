# Instalación — TaskFlow Fase 1

## Requisitos

- Node.js >= 18 y npm
- Python >= 3.10 y pip

## 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Backend: http://localhost:8000
Salud: http://localhost:8000/health

## 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: http://localhost:5173

## Variables de entorno

Copia `.env.example` a `.env` en `frontend/` y `backend/`. Nunca subas claves reales.
