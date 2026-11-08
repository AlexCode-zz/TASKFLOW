import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Week from './pages/Week';
import Subjects from './pages/Subjects';
import ClassSchedules from './pages/ClassSchedules';
import Laboratories from './pages/Laboratories';
import Calendar from './pages/Calendar';
import Parciales from './pages/Parciales';
import Tasks from './pages/Tasks';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import ConfigurationWizard from './components/wizard/ConfigurationWizard';
import ErrorBoundary from './components/common/ErrorBoundary';
import api from './services/api';

const App = () => {
  const [isConfigured, setIsConfigured] = useState(null);

  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const response = await api.get('/students/configuration-status');
        setIsConfigured(response.data.is_configured);
      } catch {
        setIsConfigured(false);
      }
    };

    checkConfiguration();
  }, []);

  if (isConfigured === null) {
    return (
      <div className="app-wrapper d-flex">
        <div className="flex-grow-1 d-flex flex-column bg-surface">
          <div className="container-fluid px-4 py-3 flex-grow-1 overflow-auto">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <ErrorBoundary>
        <ConfigurationWizard />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <Home />
              </ErrorBoundary>
            }
          />
          <Route
            path="/semana"
            element={
              <ErrorBoundary>
                <Week />
              </ErrorBoundary>
            }
          />
          <Route
            path="/materias"
            element={
              <ErrorBoundary>
                <Subjects />
              </ErrorBoundary>
            }
          />
          <Route
            path="/clases"
            element={
              <ErrorBoundary>
                <ClassSchedules />
              </ErrorBoundary>
            }
          />
          <Route
            path="/laboratorios"
            element={
              <ErrorBoundary>
                <Laboratories />
              </ErrorBoundary>
            }
          />
          <Route
            path="/calendario"
            element={
              <ErrorBoundary>
                <Calendar />
              </ErrorBoundary>
            }
          />
          <Route
            path="/parciales"
            element={
              <ErrorBoundary>
                <Parciales />
              </ErrorBoundary>
            }
          />
          <Route
            path="/evaluaciones"
            element={
              <Navigate to="/parciales" replace />
            }
          />
          <Route
            path="/tareas"
            element={
              <ErrorBoundary>
                <Tasks />
              </ErrorBoundary>
            }
          />
          <Route
            path="/proyectos"
            element={
              <ErrorBoundary>
                <Projects />
              </ErrorBoundary>
            }
          />
          <Route
            path="/informes"
            element={
              <ErrorBoundary>
                <Reports />
              </ErrorBoundary>
            }
          />
          <Route
            path="/asistente-ia"
            element={
              <ErrorBoundary>
                <Assistant />
              </ErrorBoundary>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ErrorBoundary>
                <Settings />
              </ErrorBoundary>
            }
          />
        </Route>
        <Route
          path="*"
          element={
            <ErrorBoundary>
              <NotFound />
            </ErrorBoundary>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
