import { Routes, Route } from 'react-router-dom';
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

const App = () => {
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
