import { useState } from 'react';
import { TASKS } from '../data/mockData';
import PriorityBadge from '../components/common/PriorityBadge';
import StatusBadge from '../components/common/StatusBadge';

const Tasks = () => {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? TASKS : TASKS.filter((t) => t.status === filter);

  return (
    <div className="fade-in">
      <header className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="fw-bold mb-1">Tareas y proyectos</h1>
          <p className="text-muted-tf mb-0">Organiza tus actividades académicas.</p>
        </div>
        <div className="btn-group" role="group">
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              type="button"
              className={`btn btn-outline-primary btn-sm ${filter === f ? 'bg-primary text-white border-primary' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
            </button>
          ))}
        </div>
      </header>

      <div className="row g-4">
        {filtered.length > 0 ? (
          filtered.map((task) => {
            const color =
              task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981';
            return (
              <div key={task.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-secondary shadow-sm task-card">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-semibold mb-0">{task.title}</h6>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="mb-2">
                      <span className="badge bg-dark text-white small me-2">{task.subjectCode}</span>
                      <span className="badge bg-dark text-white small">{task.due}</span>
                    </div>
                    <div className="text-muted-tf small mb-3">{task.subject}</div>
                    <p className="text-muted-tf small mb-3">{task.description}</p>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted-tf small">Avance</span>
                        <span className="text-muted-tf small">{task.progress}%</span>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    <div className="progress bg-secondary" style={{ height: '6px' }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${task.progress}%`, backgroundColor: color }}
                        role="progressbar"
                      />
                    </div>
                  </div>
                  <div className="card-footer border-secondary bg-transparent pt-2 pb-2">
                    <button className="btn btn-outline-primary btn-sm w-100 text-white">
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-12">
            <div className="text-center py-5">
              <div className="text-muted-tf mb-3">✅</div>
              <h5 className="fw-semibold text-white">No hay tareas</h5>
              <p className="text-muted-tf small">No se encontraron tareas con este filtro.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
