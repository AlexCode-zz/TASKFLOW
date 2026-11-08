import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const TITLES = {
  '/': 'Inicio',
  '/semana': 'Mi semana',
  '/materias': 'Materias',
  '/clases': 'Horarios',
  '/laboratorios': 'Laboratorios',
  '/calendario': 'Calendario',
  '/parciales': 'Parciales',
  '/tareas': 'Tareas y proyectos',
  '/proyectos': 'Proyectos',
  '/informes': 'Informes',
  '/asistente-ia': 'Asistente IA',
  '/configuracion': 'Configuración',
};

const getPageTitle = (pathname) => {
  const matches = Object.keys(TITLES)
    .filter((key) => pathname === key || pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length);
  return matches.length > 0 ? TITLES[matches[0]] : 'TaskFlow';
};

const Navbar = ({ onMenuToggle }) => {
  const location = useLocation();
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayFormatted = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const title = getPageTitle(location.pathname);

  return (
    <nav className="topbar" aria-label="Barra superior">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm d-lg-none"
        onClick={onMenuToggle}
        aria-label="Abrir menú"
      >
        <i className="bi bi-list" aria-hidden="true" />
      </button>
      <div>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="ms-auto d-flex align-items-center gap-3">
        <span className="topbar-date text-capitalize">
          {todayFormatted}
        </span>
        <Link to="/tareas" className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg" aria-hidden="true" />
          <span className="d-none d-sm-inline ms-1">Nueva tarea</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
