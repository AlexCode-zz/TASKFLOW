import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Week from './pages/Week';
import Subjects from './pages/Subjects';
import Calendar from './pages/Calendar';
import Evaluations from './pages/Evaluations';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import ConfigurationWizard from './components/wizard/ConfigurationWizard';
import api from './services/api';

const App = () => {
  const [isConfigured, setIsConfigured] = useState(null);

  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const response = await api.get('/students/configuration-status');
        setIsConfigured(response.data.is_configured);
      } catch (error) {
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
    return <ConfigurationWizard />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/semana" element={<Week />} />
        <Route path="/materias" element={<Subjects />} />
        <Route path="/materias/nueva" element={<Subjects />} />
        <Route path="/calendario" element={<Calendar />} />
        <Route path="/evaluaciones" element={<Evaluations />} />
        <Route path="/tareas" element={<Tasks />} />
        <Route path="/informes" element={<Reports />} />
        <Route path="/asistente-ia" element={<Assistant />} />
        <Route path="/configuracion" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

export default App;
