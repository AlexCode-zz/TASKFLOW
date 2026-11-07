import { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <nav className="navbar navbar-expand-lg border-bottom border-secondary py-3 px-4 bg-dark bg-opacity-80 sticky-top">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand fw-bold text-white text-decoration-none d-flex align-items-center gap-2 d-lg-none">
          <span className="text-primary">Task</span><span className="text-white">Flow</span>
        </Link>

        <div className="d-none d-lg-flex align-items-center gap-4">
          <Link to="/" className="text-muted-tf text-decoration-none small fw-medium active">
            Inicio
          </Link>
          <div className="border-start border-secondary ps-4 pe-4 d-flex align-items-center gap-3">
            <span className="text-muted-tf small">Hoy, 7 Nov</span>
            <span className="badge bg-dark text-white border border-secondary px-2 py-1">Sesión local</span>
          </div>
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          <button className="btn btn-outline-primary btn-sm" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            Perfil
          </button>
          {userMenuOpen && (
            <div className="dropdown-menu dropdown-menu-end p-0 border-secondary">
              <div className="dropdown-header bg-surface text-white py-2 px-3">
                <div className="fw-semibold">Usuario local</div>
                <div className="text-muted-tf small">Sin autenticación</div>
              </div>
              <div className="dropdown-divider border-secondary"></div>
              <a className="dropdown-item text-muted-tf" href="#">Ajustes</a>
              <a className="dropdown-item text-danger" href="#">Cerrar sesión</a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
