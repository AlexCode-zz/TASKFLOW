import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';

const NotFound = () => {
  return (
    <div className="fade-in">
      <PageHeader title="404" description="La página que buscas no existe." />
      <div className="state-container">
        <div className="state-icon" aria-hidden="true">
          <i className="bi bi-exclamation-triangle-fill" />
        </div>
        <h2 className="state-title">Página no encontrada</h2>
        <p className="state-message">
          No encontramos la página que intentabas visitar. Revisa la ruta o vuelve al inicio.
        </p>
        <div className="state-actions">
          <Button>
            <i className="bi bi-house-door me-1" aria-hidden="true" />
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
