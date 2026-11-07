import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="text-center py-5">
      <h1 className="fw-bold">404</h1>
      <p className="text-muted-tf">Página no encontrada.</p>
      <Link to="/" className="btn btn-primary mt-3">
        Volver a Mi semana
      </Link>
    </div>
  );
};

export default NotFound;
