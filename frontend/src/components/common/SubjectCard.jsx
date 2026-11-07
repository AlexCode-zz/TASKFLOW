import { Link } from 'react-router-dom';

const SubjectCard = ({ subject }) => {
  const { id, name, code, teacher, color, tasksPending, nextEvaluation, progress } = subject;

  return (
    <div className="card h-100 border-secondary subject-card shadow-sm">
      <div className="d-flex align-items-start p-3">
        <span className="subject-badge me-3" style={{ backgroundColor: color }} />
        <div className="flex-grow-1">
          <h6 className="fw-semibold mb-1">{name}</h6>
          <span className="badge bg-dark text-white small">{code}</span>
        </div>
      </div>
      <div className="card-body p-3">
        <div className="mb-2">
          <small className="text-muted-tf d-block">Docente</small>
          <span className="text-white small">{teacher}</span>
        </div>
        <div className="mb-3 d-flex justify-content-between align-items-start">
          <div>
            <small className="text-muted-tf d-block">Tareas pendientes</small>
            <span className="fw-semibold text-white">{tasksPending}</span>
          </div>
          <div>
            <small className="text-muted-tf d-block">Próxima evaluación</small>
            <span className="fw-semibold text-white">{nextEvaluation}</span>
          </div>
        </div>
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted-tf small">Progreso</span>
            <span className="text-muted-tf small">{progress}%</span>
          </div>
          <div className="progress bg-secondary" style={{ height: '6px' }}>
            <div
              className="progress-bar"
              style={{ width: `${progress}%`, backgroundColor: color }}
              role="progressbar"
            />
          </div>
        </div>
      </div>
      <div className="card-footer border-secondary pt-2 pb-2">
        <Link
          to={`/materias/${id}`}
          className="btn btn-outline-primary btn-sm w-100 text-white"
        >
          Ver detalles
        </Link>
      </div>
    </div>
  );
};

export default SubjectCard;
