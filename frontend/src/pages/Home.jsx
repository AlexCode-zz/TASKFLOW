import { Link } from 'react-router-dom';
import { UPCOMING_CLASSES, TASKS, EVALUATIONS, SUBJECTS } from '../data/mockData';
import StatCard from '../components/common/StatCard';
import PriorityBadge from '../components/common/PriorityBadge';
import StatusBadge from '../components/common/StatusBadge';

const pendingTasks = TASKS.filter((t) => t.status === 'pending');
const upcomingExams = EVALUATIONS.filter((e) => e.status === 'upcoming');

const Home = () => {
  return (
    <div className="fade-in">
      <header className="mb-4">
        <h1 className="fw-bold mb-1">Inicio</h1>
        <p className="text-muted-tf mb-0">
          Aquí tienes lo más importante para comenzar tu día.
        </p>
      </header>

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <StatCard
            label="Próximas clases"
            value={UPCOMING_CLASSES.length}
            icon="📚"
            color="#3b82f6"
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard
            label="Tareas pendientes"
            value={pendingTasks.length}
            trend={pendingTasks.length > 0 ? 'Revisa tu lista' : 'Al día'}
            icon="✅"
            color="#f59e0b"
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard
            label="Exámenes próximos"
            value={upcomingExams.length}
            icon="📝"
            color="#8b5cf6"
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard
            label="Materias activas"
            value={SUBJECTS.length}
            icon="📚"
            color="#10b981"
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <section className="card border-secondary shadow-sm mb-4">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">Próximas clases</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-dark table-hover mb-0">
                  <thead>
                    <tr>
                      <th className="border-secondary text-muted-tf small">Materia</th>
                      <th className="border-secondary text-muted-tf small">Código</th>
                      <th className="border-secondary text-muted-tf small">Día</th>
                      <th className="border-secondary text-muted-tf small">Hora</th>
                      <th className="border-secondary text-muted-tf small">Aula</th>
                    </tr>
                  </thead>
                  <tbody>
                    {UPCOMING_CLASSES.map((cls) => (
                      <tr key={cls.code + cls.day + cls.time}>
                        <td className="border-secondary">{cls.subject}</td>
                        <td className="border-secondary">
                          <span className="badge bg-dark text-white small">{cls.code}</span>
                        </td>
                        <td className="border-secondary">{cls.day}</td>
                        <td className="border-secondary">{cls.time}</td>
                        <td className="border-secondary text-muted-tf small">{cls.room}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="card border-secondary shadow-sm">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">Tareas pendientes</h5>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="list-group-item bg-surface border-secondary p-3">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h6 className="fw-semibold mb-0">{task.title}</h6>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="mb-1">
                      <span className="badge bg-dark text-white small me-2">{task.subjectCode}</span>
                      <span className="badge bg-dark text-white small">{task.due}</span>
                    </div>
                    <p className="text-muted-tf small mb-2">{task.description}</p>
                    <div className="progress bg-secondary" style={{ height: '6px' }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${task.progress}%`, backgroundColor: '#f59e0b' }}
                        role="progressbar"
                      />
                    </div>
                  </div>
                ))}
                {pendingTasks.length === 0 && (
                  <div className="list-group-item bg-surface border-secondary text-muted-tf text-center py-4">
                    No tienes tareas pendientes. ¡Al día!
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="col-lg-4">
          <section className="card border-secondary shadow-sm mb-4">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">Exámenes próximos</h5>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {upcomingExams.map((item) => (
                  <div key={eval.id} className="list-group-item bg-surface border-secondary p-3">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h6 className="fw-semibold mb-0">{item.title}</h6>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mb-1">
                      <span className="badge bg-dark text-white small me-2">{item.type}</span>
                      <span className="badge bg-dark text-white small">{item.subjectCode}</span>
                    </div>
                    <div className="text-muted-tf small mb-2">{item.subject}</div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted-tf small">{item.date}</span>
                      <span className="text-muted-tf small">{item.time}</span>
                    </div>
                  </div>
                ))}
                {upcomingExams.length === 0 && (
                  <div className="list-group-item bg-surface border-secondary text-muted-tf text-center py-4">
                    Sin exámenes programados.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="card border-secondary shadow-sm">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">Resumen de la semana</h5>
            </div>
            <div className="card-body p-3">
              <div className="row g-3 text-center">
                <div className="col-4">
                  <div className="text-muted-tf small mb-1">Clases esta semana</div>
                  <div className="fw-bold text-white">{UPCOMING_CLASSES.length}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted-tf small mb-1">Tareas pendientes</div>
                  <div className="fw-bold text-white">{pendingTasks.length}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted-tf small mb-1">Evaluaciones</div>
                  <div className="fw-bold text-white">{upcomingExams.length}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Home;
