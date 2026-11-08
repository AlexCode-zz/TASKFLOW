import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const groups = [
  {
    id: 'planificacion',
    label: 'Planificación',
    items: [
      { to: '/', label: 'Inicio', icon: 'bi-house' },
      { to: '/semana', label: 'Mi semana', icon: 'bi-calendar-week' },
    ],
  },
  {
    id: 'academico',
    label: 'Académico',
    items: [
      { to: '/materias', label: 'Materias', icon: 'bi-book' },
      { to: '/clases', label: 'Horarios', icon: 'bi-clock' },
      { to: '/laboratorios', label: 'Laboratorios', icon: 'bi-flask' },
      { to: '/evaluaciones', label: 'Evaluaciones', icon: 'bi-clipboard-check' },
      { to: '/tareas', label: 'Tareas y proyectos', icon: 'bi-list-task' },
      { to: '/proyectos', label: 'Proyectos', icon: 'bi-folder-2-open' },
    ],
  },
  {
    id: 'herramientas',
    label: 'Herramientas',
    items: [
      { to: '/informes', label: 'Informes', icon: 'bi-bar-chart' },
      { to: '/asistente-ia', label: 'Asistente IA', icon: 'bi-robot' },
      { to: '/configuracion', label: 'Configuración', icon: 'bi-gear' },
    ],
  },
];

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar p-3 ${open ? 'open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-brand">
          <Link to="/" className="fw-bold d-flex align-items-center gap-2 text-decoration-none" onClick={onClose}>
            <span className="fs-4 text-white">T</span>
            <span className="fs-4 text-white">TaskFlow</span>
          </Link>
          <button
            type="button"
            className="ms-auto btn btn-link text-white p-0 border-0 d-lg-none"
            onClick={onClose}
            aria-label="Cerrar menú"
            tabIndex={open ? 0 : -1}
          >
            <i className="bi bi-x fs-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav flex-column" aria-label="Secciones">
          {groups.map((group) => (
            <div key={group.id} className="mb-3">
              <div className="sidebar-group-title">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
                  aria-current={isActive(item.to) ? 'page' : undefined}
                  onClick={onClose}
                >
                  <i className={`bi ${item.icon} fs-5`} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
