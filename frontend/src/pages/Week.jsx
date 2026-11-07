import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIME_SLOTS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

const typeColors = {
  class: '#3b82f6',
  laboratory: '#06b6d4',
  evaluation: '#8b5cf6',
  task: '#10b981',
  project: '#f59e0b',
};

const typeLabels = {
  class: 'Clase',
  laboratory: 'Laboratorio',
  evaluation: 'Evaluación',
  task: 'Tarea',
  project: 'Proyecto',
};

const Week = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
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
        classes.data.forEach((c) => {
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
          });
        });
      }

      if (labs.status === 'fulfilled') {
        labs.data.forEach((l) => {
          const d = new Date(l.date);
          const dayIndex = d.getDay() || 7;
          dayIndex - 1; // ajustar a 0-6 donde 0=lunes
          allEvents.push({
            id: `lab-${l.id}`,
            title: l.title,
            type: 'laboratory',
            day: ((dayIndex + 5) % 7), // convertir domingo=0 a domingo=6
            start: parseInt(l.start_time.split(':')[0]),
            end: parseInt(l.end_time.split(':')[0]),
            room: l.location,
            color: typeColors.laboratory,
            date: l.date,
          });
        });
      }

      if (evals.status === 'fulfilled') {
        evals.data.forEach((e) => {
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
          });
        });
      }

      if (tasks.status === 'fulfilled') {
        tasks.data.forEach((t) => {
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
          });
        });
      }

      if (projects.status === 'fulfilled') {
        projects.data.forEach((p) => {
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
          });
        });
      }

      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading week events:', err);
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

  const eventsByDay = {};
  events.forEach((e) => {
    if (!eventsByDay[e.day]) eventsByDay[e.day] = [];
    eventsByDay[e.day].push(e);
  });

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const weekLabel = `${weekDays[0].getDate()} ${monthNames[weekDays[0].getMonth()]} - ${weekDays[6].getDate()} ${monthNames[weekDays[6].getMonth()]}`;

  const canGoBack = weekDays[0].getDate() > 7;

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <header className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="fw-bold mb-1">Mi semana</h1>
          <p className="text-muted-tf mb-0">{weekLabel}</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => changeWeek(-1)}
            disabled={!canGoBack}
          >
            Semana anterior
          </button>
          <button
            className="btn btn-outline-primary"
            onClick={() => changeWeek(1)}
          >
            Semana siguiente
          </button>
        </div>
      </header>

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
                        {eventsByDay[dayIndex]
                          ?.filter((e) => e.start <= hour && e.end > hour)
                          .map((e) => {
                            const height = ((e.end - e.start) / 15) * 100;
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
                                }}
                              >
                                <div className="fw-semibold text-white">{e.title}</div>
                                <div className="text-white opacity-90 small">{e.room || e.date || ''}</div>
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
          {['class', 'laboratory', 'evaluation', 'task', 'project'].map((type) => {
            const typeEvents = events.filter((e) => e.type === type);
            const color = typeColors[type];
            return (
              <div key={type} className="col-12 col-md-6 col-lg-4">
                <div className="d-flex align-items-center p-3 border-secondary rounded-3 bg-surface">
                  <div
                    className="me-3"
                    style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-medium text-white">{typeLabels[type]}</div>
                    <div className="text-muted-tf small">{typeEvents.length} bloque(s)</div>
                  </div>
                  <span className="badge bg-dark text-white border border-secondary">{typeEvents.length}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <h6 className="fw-semibold text-white mb-3">Accesos rápidos</h6>
        <div className="row g-2">
          <div className="col-12 col-md-3 col-lg-2">
            <Link to="/clases" className="btn btn-outline-primary w-100 text-white">
              Horarios
            </Link>
          </div>
          <div className="col-12 col-md-3 col-lg-2">
            <Link to="/laboratorios" className="btn btn-outline-primary w-100 text-white">
              Laboratorios
            </Link>
          </div>
          <div className="col-12 col-md-3 col-lg-2">
            <Link to="/evaluaciones" className="btn btn-outline-primary w-100 text-white">
              Evaluaciones
            </Link>
          </div>
          <div className="col-12 col-md-3 col-lg-2">
            <Link to="/tareas" className="btn btn-outline-primary w-100 text-white">
              Tareas
            </Link>
          </div>
          <div className="col-12 col-md-3 col-lg-2">
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
