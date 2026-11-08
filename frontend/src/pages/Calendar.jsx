import { useState, useEffect } from 'react';
import api from '../services/api';
import EventCard from '../components/common/EventCard';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const typeColors = {
  class: '#3b82f6',
  laboratory: '#06b6d4',
  evaluation: '#8b5cf6',
  task: '#10b981',
  project: '#f59e0b',
};

const Calendar = () => {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setError('');
    try {
      const [classes, labs, evals, tasks, projects] = await Promise.allSettled([
        api.get('/class-schedules/'),
        api.get('/laboratories/'),
        api.get('/evaluations/'),
        api.get('/tasks/'),
        api.get('/projects/'),
      ]);

      const allEvents = [];

      if (classes.status === 'fulfilled') {
        classes.value.data.forEach((c) => {
          allEvents.push({
            id: `class-${c.id}`,
            title: c.subject_name || 'Clase',
            type: 'class',
            day_of_week: c.day_of_week,
            start_time: c.start_time,
            end_time: c.end_time,
            room: c.room,
            color: typeColors.class,
          });
        });
      }

      if (labs.status === 'fulfilled') {
        labs.value.data.forEach((l) => {
          allEvents.push({
            id: `lab-${l.id}`,
            title: l.title,
            type: 'laboratory',
            date: l.date,
            start_time: l.start_time,
            end_time: l.end_time,
            location: l.location,
            color: typeColors.laboratory,
          });
        });
      }

      if (evals.status === 'fulfilled') {
        evals.value.data.forEach((e) => {
          allEvents.push({
            id: `eval-${e.id}`,
            title: e.title,
            type: 'evaluation',
            date: e.date,
            start_time: e.start_time,
            end_time: e.end_time,
            color: typeColors.evaluation,
          });
        });
      }

      if (tasks.status === 'fulfilled') {
        tasks.value.data.forEach((t) => {
          allEvents.push({
            id: `task-${t.id}`,
            title: t.title,
            type: 'task',
            date: t.due_date,
            start_time: t.due_time,
            color: typeColors.task,
          });
        });
      }

      if (projects.status === 'fulfilled') {
        projects.value.data.forEach((p) => {
          allEvents.push({
            id: `project-${p.id}`,
            title: p.name,
            type: 'project',
            date: p.due_date,
            color: typeColors.project,
          });
        });
      }

      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading calendar events:', err);
      setError('No se pudieron cargar los eventos del calendario.');
    } finally {
      setLoading(false);
    }
  };

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const firstDay = new Date(year, month, 1).getDay() || 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const changeMonth = (offset) => {
    const d = new Date(year, month + offset, 1);
    setCurrentDate(d);
  };

  const today = new Date();
  const isToday = (d) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const eventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(
      (e) => (typeFilter === 'all' || e.type === typeFilter) && e.date === dateStr
    );
  };

  const typeFilters = [
    { value: 'all', label: 'Todos' },
    { value: 'class', label: 'Clases' },
    { value: 'laboratory', label: 'Laboratorios' },
    { value: 'evaluation', label: 'Evaluaciones' },
    { value: 'task', label: 'Tareas' },
    { value: 'project', label: 'Proyectos' },
  ];

  const monthLabel = `${MONTHS[month]} ${year}`;

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger text-white border-secondary" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <span>{error}</span>
            <button type="button" className="btn btn-outline-light btn-sm" onClick={loadEvents}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Calendario"
        description="Organización académica por fechas."
        actions={
          <div className="d-flex flex-column gap-2 align-items-md-start">
            <div className="btn-group btn-group-outline" role="group" aria-label="Vista del calendario">
              {['month', 'week', 'day'].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={view === v ? 'btn btn-primary btn-sm' : 'btn btn-outline-primary btn-sm'}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                >
                  {v === 'month' ? 'Mensual' : v === 'week' ? 'Semanal' : 'Diaria'}
                </button>
              ))}
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
                Mes anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
                Mes siguiente
              </Button>
            </div>
          </div>
        }
      />

      <div className="mb-4">
        <div className="btn-group" role="group" aria-label="Filtrar por tipo de evento">
          {typeFilters.map((t) => (
            <Button
              key={t.value}
              variant={typeFilter === t.value ? 'primary' : 'outline'}
              size="sm"
              className=""
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {view === 'month' ? (
        <div className="card border-secondary shadow-sm">
          <div className="card-body p-3">
            <div className="row g-2 mb-3 text-center">
              <div className="col text-muted-tf small fw-medium">{monthLabel}</div>
            </div>
            <div className="row g-0">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="col border-secondary text-center text-muted-tf small fw-medium py-2">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDay - 1 }).map((_, i) => (
                <div key={'empty' + i} className="col border-secondary py-3" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsForDay(day);
                return (
                  <div
                    key={day}
                    className={`col border-secondary position-relative p-2 ${isToday(new Date(year, month, day)) ? 'bg-primary text-white' : 'bg-surface'}`}
                    style={{ minHeight: '90px' }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <span className="fw-medium">{day}</span>
                      {dayEvents.length > 0 && (
                        <span className="badge bg-dark text-white border border-secondary" style={{ fontSize: '0.65rem' }}>
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    {dayEvents.slice(0, 3).map((e) => (
                      <EventCard key={e.id} event={e} compact />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-muted-tf small opacity-80">+{dayEvents.length - 3} más</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card border-secondary shadow-sm">
          <div className="card-body p-4 text-center py-5">
            <div className="text-muted-tf mb-3">Vista {view === 'week' ? 'semanal' : 'diaria'}</div>
            <div className="empty-icon mb-3">🗓️</div>
            <h5 className="fw-semibold text-white">Vista {view === 'week' ? 'semanal' : 'diaria'}</h5>
            <p className="text-muted-tf small">Selecciona el calendario &quot;Mensual&quot; para ver el calendario completo.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
