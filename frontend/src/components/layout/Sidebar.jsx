import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const modules = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/semana', label: 'Mi semana', icon: '📅' },
  { to: '/materias', label: 'Materias', icon: '📚' },
  { to: '/calendario', label: 'Calendario', icon: '🗓️' },
  { to: '/evaluaciones', label: 'Evaluaciones', icon: '📝' },
  { to: '/tareas', label: 'Tareas y proyectos', icon: '✅' },
  { to: '/informes', label: 'Informes', icon: '📊' },
  { to: '/asistente-ia', label: 'Asistente IA', icon: '🤖' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️' },
];

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  const activeTo = location.pathname === '/' ? '/' : location.pathname;

  return (
    <aside className={`sidebar p-3 border-end border-secondary ${open ? 'open' : ''}`}>
      <div className="d-flex align-items-center mb-4">
        <Link to="/" className="fw-bold fs-4 text-decoration-none d-flex align-items-center gap-2">
          <span className="text-primary">Task</span><span className="text-white">Flow</span>
        </Link>
        <button
          className="ms-auto btn btn-link text-white p-0 border-0 d-lg-none"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </div>

      <nav className="flex-column">
        {modules.map((item) => {
          const isActive = activeTo === item.to || (item.to !== '/' && activeTo.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link d-flex align-items-center py-2.5 rounded-3 ${isActive ? 'bg-primary text-white' : 'text-muted-tf hover-bg-surface'}`}
              onClick={() => setOpen(false)}
            >
              <span className="me-3 fs-5">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-top border-secondary">
        <div className="text-muted-tf small text-center">TaskFlow v1.0.0</div>
        <div className="text-muted-tf small text-center">Fase 2 - Diseño</div>
      </div>
    </aside>
  );
};

export default Sidebar;
