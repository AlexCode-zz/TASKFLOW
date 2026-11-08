import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIME_SLOTS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

const typeColors = {
  class: '#3b82f6',
  laboratory: '#06b6d4',
  evaluation: '#8b5cf6',
  task: '#10b981',
  project: '#f59e0b',
  study: '#6366f1',
};

const Week = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    loadData();
  }, [currentWeek]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classes, labs, evals, tasks, projects, planRes] = await Promise.allSettled([
        api.get('/class-schedules/'),
        api.get('/laboratories/'),
        api.get('/evaluations/'),
        api.get('/tasks/'),
        api.get('/projects/'),
        api.get('/planning/sessions'),
      ]);

      const allEvents = [];

      if (classes.status === 'fulfilled') {
        classes.value.data.forEach((c) => {
          allEvents.push({
            id: `class-${c.id}`,
            title: c.subject_name || 'Clase',
            type: 'class',
            day: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].indexOf(c.day_of_week),
            start: parseInt(c.start_time.split(':')[0]),
            end: parseInt(c.end_time.split(':')[0]),
            room: c.room,
            color: typeColors.class,
            subject: c.subject_name,
            origin: 'academic',
          });
        });
      }

      if (labs.status === 'fulfilled') {
        labs.value.data.forEach((l) => {
          const d = new Date(l.date);
          const dayIndex = d.getDay() || 7;
          allEvents.push({
            id: `lab-${l.id}`,
            title: l.title,
            type: 'laboratory',
            day: ((dayIndex + 5) % 7),
            start: parseInt(l.start_time.split(':')[0]),
            end: parseInt(l.end_time.split(':')[0]),
            room: l.location,
            color: typeColors.laboratory,
            date: l.date,
            origin: 'academic',
          });
        });
      }

      if (evals.status === 'fulfilled') {
        evals.value.data.forEach((e) => {
          const d = new Date(e.date);
          const dayIndex = d.getDay() || 7;
          allEvents.push({
            id: `eval-${e.id}`,
            title: e.title,
            type: 'evaluation',
            day: ((dayIndex + 5) % 7),
            start: e.start_time ? parseInt(e.start_time.split(':')[0]) : 9,
            end: e.end_time ? parseInt(e.end_time.split(':')[0]) : 11,
            color: typeColors.evaluation,
            date: e.date,
            origin: 'academic',
          });
        });
      }

      if (tasks.status === 'fulfilled') {
        tasks.value.data.forEach((t) => {
          const d = new Date(t.due_date);
          const dayIndex = d.getDay() || 7;
          allEvents.push({
            id: `task-${t.id}`,
            title: t.title,
            type: 'task',
            day: ((dayIndex + 5) % 7),
            start: t.due_time ? parseInt(t.due_time.split(':')[0]) : 9,
            end: t.due_time ? parseInt(t.due_time.split(':')[0]) + 1 : 10,
            color: typeColors.task,
            date: t.due_date,
            origin: 'academic',
          });
        });
      }

      if (projects.status === 'fulfilled') {
        projects.value.data.forEach((p) => {
          const d = new Date(p.due_date);
          const dayIndex = d.getDay() || 7;
          allEvents.push({
            id: `project-${p.id}`,
            title: p.name,
            type: 'project',
            day: ((dayIndex + 5) % 7),
            start: 9,
            end: 10,
            color: typeColors.project,
            date: p.due_date,
            origin: 'academic',
          });
        });
      }

      // Sesiones de planificación (estudio)
      if (planRes.status === 'fulfilled') {
        planRes.value.data.forEach((s) => {
          const d = new Date(s.scheduled_date);
          const dayIndex = d.getDay() || 7;
          allEvents.push({
            id: `plan-${s.id}`,
            title: `Estudio: ${s.title}`,
            type: 'study',
            day: ((dayIndex + 5) % 7),
            start: parseInt(s.start_time.split(':')[0]),
            end: parseInt(s.end_time.split(':')[0]),
            room: s.subject_id ? 'Materia' : '',
            color: typeColors.study,
            date: s.scheduled_date,
            origin: s.origin || 'automatic',
            isManual: s.is_manually_modified || false,
            status: s.status,
          });
        });
      }

      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading week data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startOfWeek = () => {
    const d = new Date(currentWeek);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek());
    d.setDate(d.getDate() + i);
    return d;
  });

  const changeWeek = (offset) => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + offset * 7);
    setCurrentWeek(d);
  };

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const weekLabel = `${weekDays[0].getDate()} ${monthNames[weekDays[0].getMonth()]} - ${weekDays[6].getDate()} ${monthNames[weekDays[6].getMonth()]}`;

  const canGoBack = weekDays[0].getDate() > 7;

  const weekStartISO = weekDays[0].toISOString().split('T')[0];

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const response = await api.post('/planning/generate', {
        week_start_date: weekStartISO,
      });
      if (response.data.success) {
        setUnscheduledTasks(response.data.unscheduled_tasks || []);
        setWarnings(response.data.warnings || []);
        setExplanations(response.data.explanations || []);
        await loadData();
      } else {
        setGenerateError(response.data.error || 'Error al generar la planificación.');
      }
    } catch {
      setGenerateError('Error al conectar con el servidor.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="fade-in">
        <Skeleton lines={4} />
        <div className="mt-5">
          <Skeleton lines={14} />
        </div>
      </div>
    );
  }

  const now = new Date();
  const isTodayWeek = weekDays.some(
    (d) =>
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
  );

  return (
    <div className="fade-in">
      <PageHeader
        title="Mi semana"
        description={`${weekLabel} · ${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <div className="d-flex gap-2">
            <Button variant="outline" size="sm" onClick={() => changeWeek(-1)} disabled={!canGoBack}>
              Semana anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => changeWeek(1)}>
              Semana siguiente
            </Button>
            <Button onClick={handleGeneratePlan} disabled={generating}>
              {generating ? 'Generando...' : 'Generar planificación'}
            </Button>
          </div>
        }
      />

      {isTodayWeek && (
        <div className="alert alert-info text-white border-secondary mb-4" role="status">
          <i className="bi bi-clock-history me-2" aria-hidden="true" />
          Hora actual: {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {generateError && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          {generateError}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="alert alert-warning text-white border-secondary mb-3" role="alert">
          <h6 className="fw-semibold mb-2">⚠️ Advertencias de planificación</h6>
          <ul className="mb-0 small">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {unscheduledTasks.length > 0 && (
        <div className="card border-secondary shadow-sm mb-4">
          <div className="card-header bg-transparent border-secondary">
            <h6 className="fw-semibold mb-0">Tareas no programadas ({unscheduledTasks.length})</h6>
          </div>
          <div className="card-body p-3">
            <div className="list-group list-group-flush">
              {unscheduledTasks.map((t) => (
                <div key={t.id} className="list-group-item bg-surface border-secondary p-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-medium text-white">{t.title}</div>
                      <div className="text-muted-tf small">{t.reason || 'Tiempo insuficiente'}</div>
                    </div>
                    <span className="text-muted-tf small">
                      {t.remaining_minutes} min restantes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card border-secondary shadow-sm">
        <div className="table-responsive">
          <table className="table table-dark table-hover mb-0 align-middle weekly-grid">
            <thead>
              <tr>
                <th className="border-secondary bg-surface text-muted-tf small" style={{ width: '60px' }}>
                  Hora
                </th>
                {weekDays.map((day, index) => (
                  <th key={index} className="border-secondary text-center">
                    <div className="fw-semibold text-white">{DAYS[index]}</div>
                    <div className="text-muted-tf small">
                      {day.getDate()}/{day.getMonth() + 1}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((hour) => (
                <tr key={hour}>
                  <th className="border-secondary bg-surface text-muted-tf small">
                    {hour}:00
                  </th>
                  {weekDays.map((_, dayIndex) => (
                    <td
                      key={dayIndex}
                      className="border-secondary position-relative h-100 day-cell"
                      style={{ height: '68px', minHeight: '68px' }}
                    >
                      <div className="position-absolute top-0 bottom-0 w-100 d-flex flex-column justify-content-start p-1">
                        {events
                          .filter((e) => e.day === dayIndex && e.start <= hour && e.end > hour)
                          .map((e) => {
                            const height = ((e.end - e.start) / 15) * 100;
                            const isManual = e.origin === 'manual' || e.isManual;
                            return (
                              <div
                                key={e.id}
                                className="mb-1"
                                style={{
                                  height: `${Math.max(height * 68, 40)}px`,
                                  backgroundColor: e.color || '#6366f1',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  fontSize: '0.78rem',
                                  lineHeight: '1.2',
                                  overflow: 'hidden',
                                  border: isManual ? '2px solid #ffffff' : 'none',
                                }}
                              >
                                <div className="fw-semibold text-white">{e.title}</div>
                                <div className="text-white opacity-90 small">
                                  {e.room || e.date || ''}
                                  {isManual ? ' · Manual' : ''}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <h6 className="fw-semibold text-white mb-3">Bloques de la semana</h6>
        <div className="row g-3">
          {['class', 'laboratory', 'evaluation', 'task', 'project', 'study'].map((type) => {
            const typeEvents = events.filter((e) => e.type === type);
            const color = typeColors[type];
            const labels = {
              class: 'Clases',
              laboratory: 'Laboratorios',
              evaluation: 'Evaluaciones',
              task: 'Tareas',
              project: 'Proyectos',
              study: 'Sesiones de estudio',
            };
            return (
              <div key={type} className="col-12 col-md-6 col-lg-4">
                <div className="d-flex align-items-center p-3 border-secondary rounded-3 bg-surface">
                  <div
                    className="me-3"
                    style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-medium text-white">{labels[type]}</div>
                    <div className="text-muted-tf small">{typeEvents.length} bloque(s)</div>
                  </div>
                  <span className="badge bg-dark text-white border border-secondary">{typeEvents.length}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {explanations.length > 0 && (
        <div className="mt-4">
          <h6 className="fw-semibold text-white mb-3">Explicaciones del motor</h6>
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3">
              <ul className="list-unstyled mb-0 small">
                {explanations.map((exp, i) => (
                  <li key={i} className="mb-2 text-muted-tf">
                    • {exp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <h6 className="fw-semibold text-white mb-3">Accesos rápidos</h6>
        <div className="row g-2">
          <div className="col-12 col-md-2">
            <Link to="/clases" className="btn btn-outline-primary w-100 text-white">
              Horarios
            </Link>
          </div>
          <div className="col-12 col-md-2">
            <Link to="/laboratorios" className="btn btn-outline-primary w-100 text-white">
              Laboratorios
            </Link>
          </div>
          <div className="col-12 col-md-2">
            <Link to="/evaluaciones" className="btn btn-outline-primary w-100 text-white">
              Evaluaciones
            </Link>
          </div>
          <div className="col-12 col-md-2">
            <Link to="/tareas" className="btn btn-outline-primary w-100 text-white">
              Tareas
            </Link>
          </div>
          <div className="col-12 col-md-2">
            <Link to="/proyectos" className="btn btn-outline-primary w-100 text-white">
              Proyectos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Week;
