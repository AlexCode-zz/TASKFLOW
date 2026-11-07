#!/bin/bash
# Script de inicio para TaskFlow
# Inicia backend y frontend en procesos separados

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

# Iniciar backend
echo ""
echo "[1/2] Iniciando backend FastAPI..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "Creando entorno virtual..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

# Copiar .env si no existe
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

# Iniciar backend en segundo plano
uvicorn app.main:app --reload &
BACKEND_PID=$!

# Esperar a que el backend esté listo
echo "Esperando a que el backend esté disponible..."
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        echo "Backend listo en http://127.0.0.1:8000"
        break
    fi
    sleep 1
done

# Iniciar frontend
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

echo ""
echo "========================================"
echo "  TaskFlow iniciado correctamente"
echo "========================================"
echo "Backend:  http://127.0.0.1:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para detener ambos servicios"
echo "========================================"

# Esperar a que termine cualquier proceso
wait $BACKEND_PID $FRONTEND_PID