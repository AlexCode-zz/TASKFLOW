import { EVALUATIONS } from '../data/mockData';
import StatusBadge from '../components/common/StatusBadge';

const Evaluations = () => {
  const typeLabels = {
    exam: 'Examen',
    lab: 'Laboratorio',
    project: 'Proyecto',
  };

  const typeColors = {
    exam: '#8b5cf6',
    lab: '#06b6d4',
    project: '#f59e0b',
  };

  return (
    <div className="fade-in">
      <header className="mb-4">
        <h1 className="fw-bold mb-1">Evaluaciones</h1>
        <p className="text-muted-tf mb-0">
          Exámenes, laboratorios, exposiciones y proyectos calificados.
        </p>
      </header>

      <div className="row g-4">
        {EVALUATIONS.map((item) => {
          const color = typeColors[item.type] || '#94949a';
          return (
            <div key={item.id} className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 border-secondary shadow-sm">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="fw-semibold mb-0">{item.title}</h6>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mb-2">
                    <span className="badge bg-dark text-white small me-2">{item.type}</span>
                    <span className="badge bg-dark text-white small">{item.subjectCode}</span>
                  </div>
                  <div className="text-muted-tf small mb-3">{item.subject}</div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <span className="text-muted-tf small d-block">Fecha</span>
                      <span className="fw-medium">{item.date}</span>
                    </div>
                    <div>
                      <span className="text-muted-tf small d-block">Hora</span>
                      <span className="fw-medium">{item.time}</span>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <span className="text-muted-tf small d-block">Ponderación</span>
                      <span className="fw-medium text-white">{item.weight}%</span>
                    </div>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${color}20`,
                        color,
                        border: `1px solid ${color}`,
                        padding: '0.4em 0.8em',
                      }}
                    >
                      {typeLabels[item.type] || item.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Evaluations;
