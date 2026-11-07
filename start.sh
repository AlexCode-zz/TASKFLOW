#!/bin/bash
# Script de inicio para TaskFlow
# Inicia backend FastAPI y frontend React en procesos separados

set -e

echo "========================================"
echo "  TaskFlow - Iniciando aplicación"
echo "========================================"

# Verificar requisitos
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 no está instalado"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm no está instalado"
    exit 1
fi

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)/backend"
FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)/frontend"

# ============================================
# Matar procesos previos en los puertos
# ============================================
echo ""
echo "Liberando puertos anteriores..."

# Matar procesos en puerto 8000 (backend)
if command -v fuser &> /dev/null; then
    fuser -k 8000/tcp 2>/dev/null || true
    fuser -k 5173/tcp 2>/dev/null || true
elif command -v lsof &> /dev/null; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
fi

sleep 1

# ============================================
# Backend (FastAPI + SQLite)
# ============================================
echo ""
echo "[1/2] Iniciando backend FastAPI..."
cd "$BACKEND_DIR"

# Copiar .env si no existe
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

# Intentar usar entorno virtual; si falla, instalar a nivel de sistema
VENV_CREATED=false
if [ ! -d "venv" ]; then
    echo "Creando entorno virtual..."
    if python3 -m venv venv 2>/dev/null; then
        VENV_CREATED=true
        echo "Entorno virtual creado correctamente."
    else
        echo "Advertencia: No se pudo crear el entorno virtual (python3-venv puede no estar instalado)."
        echo "Se intentará instalar a nivel de sistema con --break-system-packages."
    fi
fi

if [ "$VENV_CREATED" = true ]; then
    source venv/bin/activate
    pip install -q -r requirements.txt
else
    echo "Instalando dependencias a nivel de sistema (puede requerir --break-system-packages)..."
    pip install --break-system-packages -q -r requirements.txt 2>/dev/null || \
    pip install -q -r requirements.txt
fi

# Iniciar backend en segundo plano
if [ "$VENV_CREATED" = true ]; then
    uvicorn app.main:app --reload &
else
    python3 -m uvicorn app.main:app --reload &
fi
BACKEND_PID=$!

# Esperar a que el backend esté listo
echo "Esperando a que el backend esté disponible..."
BACKEND_READY=false
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        echo "Backend listo en http://127.0.0.1:8000"
        BACKEND_READY=true
        break
    fi
    sleep 1
done

if [ "$BACKEND_READY" = false ]; then
    echo "Advertencia: El backend no respondió en el tiempo esperado."
fi

# ============================================
# Frontend (React + Vite)
# ============================================
echo ""
echo "[2/2] Iniciando frontend React..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias de frontend..."
    npm install
fi

# Copiar .env si no existe
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

npm run dev &
FRONTEND_PID=$!

# Esperar a que el frontend esté listo
echo "Esperando a que el frontend esté disponible..."
FRONTEND_READY=false
for i in $(seq 1 30); do
    if curl -s http://localhost:5173 > /dev/null 2>&1 || curl -s http://localhost:5174 > /dev/null 2>&1 || curl -s http://localhost:5175 > /dev/null 2>&1 || curl -s http://localhost:5176 > /dev/null 2>&1 || curl -s http://localhost:5177 > /dev/null 2>&1 || curl -s http://localhost:5178 > /dev/null 2>&1 || curl -s http://localhost:5179 > /dev/null 2>&1 || curl -s http://localhost:5180 > /dev/null 2>&1; then
        # Detectar en qué puerto está escuchando
        for p in 5173 5174 5175 5176 5177 5178 5179 5180; do
            if curl -s http://localhost:$p > /dev/null 2>&1; then
                echo "Frontend listo en http://localhost:$p"
                FRONTEND_PORT=$p
                FRONTEND_READY=true
                break 2
            fi
        done
    fi
    sleep 1
done

if [ "$FRONTEND_READY" = false ]; then
    echo "Advertencia: El frontend no respondió en el tiempo esperado."
fi

echo ""
echo "========================================"
echo "  TaskFlow iniciado correctamente"
echo "========================================"
echo "Backend:  http://127.0.0.1:8000"
if [ -n "$FRONTEND_PORT" ]; then
    echo "Frontend: http://localhost:$FRONTEND_PORT"
else
    echo "Frontend: http://localhost:5173 (o puerto asignado por Vite)"
fi
echo ""
echo "Presiona Ctrl+C para detener ambos servicios"
echo "========================================"

# Esperar a que termine cualquier proceso
wait $BACKEND_PID $FRONTEND_PID