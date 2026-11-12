# TaskFlow — Organización Académica Universitaria

TaskFlow es una aplicación local de organización académica universitaria diseñada para ayudar a estudiantes a organizar automáticamente sus materias, horarios de clases, laboratorios, tareas, proyectos, parciales y tiempo de estudio.

Incluye un asistente de inteligencia artificial opcional y multi-proveedor, donde cada usuario puede configurar su propia API key y seleccionar el proveedor y modelo que prefiera.

**IMPORTANTE:** Esta aplicación se ejecuta exclusivamente de forma local. No es una aplicación web pública. El código fuente se aloja en GitHub como proyecto de portafolio. No se utiliza Supabase, Resend, ni ningún servicio de autenticación. Los datos se almacenan localmente en SQLite.

---

## 📋 Tabla de Contenidos

- [Características Principales](#características-principales)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Instalación y Ejecución](#instalación-y-ejecución)
- [Configuración de Proveedores de IA](#configuración-de-proveedores-de-ia)
- [Funcionalidades](#funcionalidades)
- [Seguridad y Privacidad](#seguridad-y-privacidad)
- [Respaldo y Restauración de Datos](#respaldo-y-restauración-de-datos)
- [Pruebas](#pruebas)
- [Limitaciones Conocidas](#limitaciones-conocidas)
- [Licencia](#licencia)

---

## 🚀 Características Principales

- **Mi semana:** Vista semanal con cuadrícula horaria (7:00–22:00) que muestra clases, laboratorios, exámenes, tareas y sesiones de estudio generadas automáticamente.
- **Materias:** Gestión completa de materias académicas con código, docente, color identificador, créditos y progreso.
- **Horarios de clases:** Registro de sesiones de clase con día, hora, aula, modalidad (presencial/virtual/híbrida) y docente.
- **Laboratorios:** Registro de sesiones de laboratorio con fecha, ubicación, materiales necesarios y estado.
- **Evaluaciones:** Gestión de exámenes parciales, finales, quizzes, exposiciones y proyectos evaluados con ponderación y nivel de preparación.
- **Tareas y proyectos:** Organización de tareas con prioridad, fecha de entrega, estado de avance y tiempo estimado. Gestión de proyectos con fecha de inicio, entrega y porcentaje de avance.
- **Calendario académico:** Vistas mensual, semanal y diaria con todos los eventos académicos y filtros por tipo.
- **Planificación automática:** Motor determinista que distribuye tareas en espacios disponibles respetando prioridades, fechas límite, disponibilidad semanal y horarios académicos.
- **Detección de conflictos y sobrecarga:** Identificación de horarios superpuestos y advertencia de carga académica excesiva.
- **Asistente IA multi-proveedor:** Integración con OpenRouter, Anthropic Claude, Google Gemini y OpenAI. Cada usuario configura su propia API key.
- **Contexto académico:** El asistente consulta materias, tareas, evaluaciones y horarios para responder de forma contextualizada.
- **Historial de conversaciones:** Conversaciones persistentes con posibilidad de crear, renombrar y eliminar.
- **Respaldo y restauración:** Exportación e importación de datos académicos en formato JSON.
- **Configuración editable:** Perfil académico, carrera, semestre, horarios, preferencias de planificación y apariencia.

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** — Interfaz de usuario
- **Vite 5** — Herramienta de construcción y servidor de desarrollo
- **JavaScript (ES6+)** — Lenguaje de programación
- **Bootstrap 5.3** — Framework de estilos y componentes
- **CSS personalizado** — Tema oscuro y estilos adicionales
- **React Router 6** — Navegación entre vistas
- **Axios** — Cliente HTTP para comunicación con la API

### Backend
- **FastAPI 0.115** — Framework web de alto rendimiento
- **Python 3.10+** — Lenguaje de programación
- **SQLAlchemy 2.0** — ORM y acceso a base de datos
- **SQLite** — Base de datos local
- **Pydantic 2.9** — Validación de datos y esquemas
- **python-dotenv** — Gestión de variables de entorno
- **httpx** — Cliente HTTP para proveedores de IA

### Inteligencia Artificial
- **OpenRouter** — Acceso a múltiples modelos de IA
- **Anthropic** — Modelos Claude
- **Google Gemini** — Modelos Gemini
- **OpenAI** — Modelos GPT

---

## 🏗️ Arquitectura del Sistema

```
TaskFlow/
├── frontend/                 # React + Vite + JavaScript
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/            # Vistas de la aplicación
│   │   ├── services/         # Comunicación con la API
│   │   ├── store/            # Estado global
│   │   ├── utils/            # Utilidades y helpers
│   │   └── App.jsx           # Componente raíz con enrutado
│   └── vite.config.js        # Configuración de Vite
├── backend/                  # FastAPI + Python + SQLite
│   ├── app/
│   │   ├── api/              # Endpoints REST
│   │   ├── core/             # Configuración y manejo de errores
│   │   ├── crud/             # Operaciones de base de datos
│   │   ├── db/               # Sesión, modelos base y migraciones
│   │   ├── models/           # Modelos SQLAlchemy
│   │   ├── schemas/          # Esquemas Pydantic
│   │   └── services/         # Lógica de negocio (planificación, IA, respaldo)
│   ├── requirements.txt      # Dependencias de Python
│   └── .env.example          # Ejemplo de variables de entorno
├── docs/                     # Documentación adicional
├── start.sh                  # Script de inicio unificado
└── README.md                 # Este archivo
```

### Flujo de Datos

1. **Frontend (React)** envía peticiones HTTP a **Backend (FastAPI)** a través de Axios.
2. **Backend** procesa la solicitud, accede a **SQLite** mediante SQLAlchemy y devuelve una respuesta JSON.
3. **Motor de planificación** (determinista, sin IA) calcula horarios de estudio basándose en reglas y restricciones.
4. **Asistente IA** se comunica con proveedores externos (OpenRouter, Anthropic, Gemini, OpenAI) solo cuando el usuario lo solicita, enviando únicamente el contexto académico necesario.
5. **Las API keys** se almacenan localmente en un archivo con permisos restringidos (0600), nunca en la base de datos ni en el frontend.

---

## 📦 Instalación y Ejecución

### Requisitos Previos

- **Node.js** >= 18 y **npm**
- **Python** >= 3.10 y **pip**
- **Git** (opcional, para clonar el repositorio)

### Opción 1: Script de inicio automático (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/AlexCode-zz/TASKFLOW.git
cd TASKFLOW

# Dar permisos de ejecución y iniciar
chmod +x start.sh
./start.sh
```

El script iniciará:
- **Backend:** http://127.0.0.1:8000
- **Frontend:** http://localhost:5173

### Opción 2: Inicio manual

#### Backend (FastAPI)

```bash
cd backend

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Instalar dependencias
pip install -r requirements.txt

# Copiar variables de entorno
cp .env.example .env

# Iniciar el servidor
uvicorn app.main:app --reload
```

El backend estará disponible en `http://127.0.0.1:8000`.
Endpoint de salud: `GET http://127.0.0.1:8000/api/health`

#### Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Iniciar en modo desarrollo
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

#### Construcción para producción (frontend)

```bash
cd frontend
npm run build
```

---

## 🤖 Configuración de Proveedores de IA

TaskFlow incluye un asistente de inteligencia artificial opcional y multi-proveedor. **Cada usuario debe proporcionar su propia API key.** No se incluyen claves en el repositorio.

### Proveedores Soportados

| Proveedor | Modelos Ejemplo | Costo |
|-----------|----------------|-------|
| OpenRouter | Múltiples modelos | Variable según modelo |
| Anthropic | Claude 3 (Opus, Sonnet, Haiku) | Variable según modelo |
| Google Gemini | Gemini 1.5 (Flash, Pro) | Variable según modelo |
| OpenAI | GPT-4o, GPT-4o-mini, GPT-3.5-turbo | Variable según modelo |

### Pasos para Configurar

1. La primera vez, abre **Asistente IA** y pulsa **Configurar proveedor de IA**
2. Selecciona el proveedor deseado
3. Ingresa tu **API key** personal (obtenida del proveedor correspondiente)
4. Selecciona o escribe el identificador del **modelo** (opcional)
5. Haz clic en **Probar conexión** para verificar que funciona
6. Haz clic en **Guardar proveedor**

Para administrar varias claves, añadir proveedores o cambiar el que está activo, ve a **Proveedores IA** en el menú lateral (junto a Configuración). El proveedor activo es el que usa Mel; si uno agota su cuota o límite, activa otro sin volver a escribir la API key. También puedes cambiar el modelo de un proveedor guardado sin volver a introducir la clave.

### Seguridad de las API Keys

- Las API keys se almacenan **localmente** en tu máquina, en un archivo con permisos restringidos (0600)
- **No se almacenan en la base de datos SQLite**
- **No se envían al frontend** ni se almacenan en localStorage/sessionStorage
- **No se suben a GitHub** ni a ningún repositorio remoto
- Cada usuario es responsable de su propia API key y de los costos asociados al uso del proveedor

> **Nota:** El uso de proveedores de IA puede tener costos asociados según el modelo y el volumen de uso. TaskFlow no asume responsabilidad por cargos generados por proveedores externos.

---

## ✨ Funcionalidades

### Configuración Inicial
Asistente de 5 pasos para configurar información académica, materias, disponibilidad semanal y preferencias de planificación.

### Gestión Académica
- **Materias:** Crear, editar, eliminar y consultar materias con color identificador
- **Clases:** Registrar sesiones semanales con día, hora, aula y modalidad
- **Laboratorios:** Registrar sesiones de laboratorio con fecha, ubicación y materiales
- **Evaluaciones:** Gestionar exámenes, quizzes, exposiciones y proyectos con ponderación
- **Tareas:** Organizar tareas con prioridad, fecha de entrega y estado de avance
- **Proyectos:** Gestionar proyectos con fecha de inicio, entrega y porcentaje de avance

### Planificación Automática
Motor determinista que:
- Analiza tareas pendientes y calcula prioridades
- Identifica espacios disponibles respetando disponibilidad semanal
- Distribuye sesiones de estudio en bloques realistas
- Respeta fechas límite y horarios académicos
- Detecta tareas que no pueden programarse por falta de tiempo
- Genera explicaciones de sus decisiones

### Asistente IA
Mel es la asistente académica de TaskFlow. Su avatar reacciona al estado real de la conversación (pensando, trabajando, conflicto, éxito, error) y se duerme tras 60 segundos de inactividad.

- Conversación contextualizada con información académica real
- Herramientas controladas para consultar datos (solo lectura por defecto)
- Operaciones que modifican datos requieren confirmación explícita y se ejecutan una sola vez
- El planificador determinista sigue siendo el único que valida y construye horarios; la IA solo interpreta y propone
- Errores de proveedor diferenciados: cuota agotada, límite de solicitudes, API key inválida, conexión y error interno
- Varias API keys guardadas a la vez, con cambio de proveedor activo en un clic
- Si la IA falla o no hay proveedor configurado, el resto de TaskFlow sigue funcionando con datos locales
- Historial de conversaciones persistente
- Cambio de proveedor y modelo sin perder conversaciones

### Respaldo de Datos
- Exportar toda la información académica a JSON
- Importar respaldos validados
- Validación de estructura antes de importar

---

## 🔒 Seguridad y Privacidad

TaskFlow es una aplicación **local y de un solo usuario**. No se implementa autenticación ni registro de usuarios.

### Medidas de Seguridad

- **Almacenamiento local:** Todos los datos se guardan en SQLite en el dispositivo del usuario
- **API keys seguras:** Almacenadas en archivo local con permisos 0600, nunca en SQLite
- **Sin credenciales en el repositorio:** No hay API keys, secretos ni archivos .env versionados
- **CORS restringido:** Solo se permiten orígenes locales (http://localhost:5173)
- **Validación de entrada:** Todos los endpoints validan los datos recibidos
- **Sin ejecución de código arbitrario:** El asistente IA no tiene acceso a SQLite, terminal ni sistema de archivos
- **Operaciones sensibles:** Requieren confirmación explícita del usuario

> **Recordatorio:** El contenido enviado a proveedores de IA externos queda sujeto a las políticas de privacidad de cada proveedor. TaskFlow no controla cómo los proveedores procesan los datos enviados.

---

## 💾 Respaldo y Restauración de Datos

### Exportar Datos

Desde el asistente IA o mediante el endpoint `GET /api/backup/export`, puedes descargar un archivo JSON con toda tu información académica:
- Perfil académico
- Materias
- Disponibilidad semanal
- Preferencias de planificación
- Clases, laboratorios, evaluaciones, tareas y proyectos
- Planificaciones y sesiones de estudio

### Importar Respaldo

Mediante el endpoint `POST /api/backup/import`, puedes subir un archivo JSON previamente exportado para restaurar tus datos. La estructura se valida antes de importar para evitar archivos corruptos.

### Seguridad del Respaldo

- Los respaldos **no incluyen API keys** ni secretos
- Se valida la estructura antes de importar
- Se solicita confirmación antes de sobrescribir datos existentes

---

## 🧪 Pruebas

El proyecto incluye 29 pruebas automatizadas que cubren:

- Gestión de estudiantes y configuración inicial
- Gestión de materias, clases, laboratorios, evaluaciones, tareas y proyectos
- Planificación automática y detección de conflictos
- Respaldo y restauración de datos
- Integridad referencial entre entidades
- Flujos end-to-end críticos

### Ejecutar Pruebas

```bash
cd backend
python3 -m pytest tests/ -v
```

### Verificar Build de Frontend

```bash
cd frontend
npm run build
```

---

## ⚠️ Limitaciones Conocidas

1. **Aplicación de un solo usuario:** No hay autenticación ni multiusuario. Todos los datos pertenecen al usuario local.
2. **Almacenamiento local:** Los datos no se sincronizan entre dispositivos.
3. **Proveedores de IA externos:** Requieren API key propia y pueden tener costos asociados.
4. **Sin sincronización en la nube:** Los datos residen únicamente en el dispositivo local.
5. **Motor determinista:** La planificación no utiliza IA, por lo que no aprende de patrones del usuario.

---

## 📄 Licencia

Este es un proyecto de portafolio educativo. La elección de una licencia específica está pendiente.

No se autoriza el uso comercial sin permiso explícito del autor.

---

## 👤 Autor

**AlexCode-zz** — Proyecto de portafolio — [GitHub](https://github.com/AlexCode-zz/TASKFLOW)

---

## 📝 Historial de Versiones

- **Fase 1:** Fundamentos y arquitectura (React + Vite + FastAPI + SQLite)
- **Fase 2:** Diseño del frontend (9 módulos, tema oscuro, sidebar navegable)
- **Fase 3:** Configuración inicial del estudiante y gestión de materias (wizard de 5 pasos, persistencia en SQLite)
- **Fase 4:** Gestión de clases, laboratorios, evaluaciones, tareas y proyectos (CRUD completo, calendario)
- **Fase 5:** Motor de planificación automática (algoritmo determinista, detección de conflictos, sobrecarga)
- **Fase 6:** Consolidación del backend (migraciones, manejo de errores, respaldo/restauración, pruebas)
- **Fase 7:** Asistente de IA multi-proveedor (OpenRouter, Anthropic, Gemini, OpenAI; contexto académico, herramientas controladas)
- **Fase 8:** Auditoría final, pruebas generales y preparación para GitHub
