import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const Home = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [subjectsRes, tasksRes, evalsRes, classesRes] = await Promise.allSettled([
          api.get('/subjects/'),
          api.get('/tasks/'),
          api.get('/evaluations/'),
          api.get('/class-schedules/'),
        ]);
        const subjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data : [];
        const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data : [];
        const evals = evalsRes.status === 'fulfilled' ? evalsRes.value.data : [];
        const classes = classesRes.status === 'fulfilled' ? classesRes.value.data : [];

        const pendingTasks = tasks.filter((t) => t.status !== 'completada');
        const upcomingEvals = evals
          .filter((e) => e.status === 'pendiente')
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setSummary({
          subjects,
          pendingTasks,
          upcomingEvals,
          classes,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayClasses = summary?.classes?.filter(
    (c) => WEEKDAYS.indexOf(c.day_of_week) === todayIndex
  )?.length ?? 0;

  return (
    <div className="fade-in">
      <PageHeader
        title="Inicio"
        description="Resumen de hoy: clases, tareas que vencen y próximos exámenes."
        actions={
          <Link to="/tareas" className="btn btn-primary">
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Nueva tarea
          </Link>
        }
      />

      {loading ? (
        <div className="state-container">
          <div className="skeleton" style={{ width: '100%', maxWidth: '720px' }}>
            <div className="skeleton" style={{ height: '1rem', marginBottom: '0.6rem' }} />
            <div className="skeleton" style={{ height: '1rem', marginBottom: '0.6rem' }} />
            <div className="skeleton" style={{ height: '1rem' }} />
          </div>
        </div>
      ) : (
        <>
          <div className="row g-4 mb-5">
            <div className="col-12 col-md-4">
              <Card>
                <div className="card-body">
                  <div className="text-muted-tf small mb-1">Clases hoy</div>
                  <div className="fw-bold" style={{ fontSize: '2rem' }}>{todayClasses ?? 0}</div>
                </div>
              </Card>
            </div>
            <div className="col-12 col-md-4">
              <Card>
                <div className="card-body">
                  <div className="text-muted-tf small mb-1">Tareas pendientes</div>
                  <div className="fw-bold" style={{ fontSize: '2rem' }}>{summary?.pendingTasks?.length ?? 0}</div>
                </div>
              </Card>
            </div>
            <div className="col-12 col-md-4">
              <Card>
                <div className="card-body">
                  <div className="text-muted-tf small mb-1">Exámenes próximos</div>
                  <div className="fw-bold" style={{ fontSize: '2rem' }}>{summary?.upcomingEvals?.length ?? 0}</div>
                </div>
              </Card>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <Card title="Tareas que requieren atención" className="mb-4">
                <div className="card-body p-0">
                  {summary?.pendingTasks?.length ? (
                    <div className="list-group list-group-flush">
                      {summary.pendingTasks.slice(0, 5).map((t) => (
                        <div key={t.id} className="list-group-item bg-surface border-secondary p-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <h6 className="fw-semibold mb-0">{t.title}</h6>
                            <span className={`badge bg-${t.priority === 'alta' ? 'danger' : t.priority === 'media' ? 'warning' : 'success'} text-white`}>
                              {t.priority}
                            </span>
                          </div>
                          <div className="text-muted-tf small">{t.due_date}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon="✅"
                      title="Al día"
                      message="No tienes tareas pendientes. ¡Buen trabajo!"
                    />
                  )}
                </div>
              </Card>
            </div>
            <div className="col-12 col-lg-4">
              <Card title="Próximos exámenes">
                <div className="card-body p-0">
                  {summary?.upcomingEvals?.length ? (
                    <div className="list-group list-group-flush">
                      {summary.upcomingEvals.slice(0, 5).map((e) => (
                        <div key={e.id} className="list-group-item bg-surface border-secondary p-3">
                          <div className="fw-medium text-white">{e.title}</div>
                          <div className="text-muted-tf small">{e.subject_id}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="📝" title="Sin exámenes" message="No hay exámenes programados." />
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <div className="mt-5">
        <h2 className="h5 fw-semibold">Accesos rápidos</h2>
        <div className="row g-3 mt-3">
          {[
            { to: '/semana', icon: 'bi-calendar-week', label: 'Mi semana' },
            { to: '/materias', icon: 'bi-book', label: 'Materias' },
            { to: '/laboratorios', icon: 'bi-flask', label: 'Laboratorios' },
            { to: '/evaluaciones', icon: 'bi-clipboard-check', label: 'Evaluaciones' },
            { to: '/tareas', icon: 'bi-list-task', label: 'Tareas' },
            { to: '/proyectos', icon: 'bi-folder-2-open', label: 'Proyectos' },
          ].map((item) => (
            <div key={item.to} className="col-6 col-md-4 col-lg-2">
              <Link to={item.to} className="card h-100 text-decoration-none" style={{ color: 'var(--text)' }}>
                <div className="card-body d-flex flex-column align-items-center text-center gap-2">
                  <i className={`bi ${item.icon} fs-3 text-primary`} aria-hidden="true" />
                  <span className="small fw-medium">{item.label}</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
