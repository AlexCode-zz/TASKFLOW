import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WEEK_EVENTS, SUBJECTS } from '../data/mockData';
import EventCard from '../components/common/EventCard';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIME_SLOTS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

const typeColors = {
  class: '#3b82f6',
  lab: '#06b6d4',
  task: '#10b981',
  project: '#f59e0b',
  exam: '#8b5cf6',
  study: '#94949a',
};

const typeLabels = {
  class: 'Clase',
  lab: 'Laboratorio',
  task: 'Tarea',
  project: 'Proyecto',
  exam: 'Examen',
  study: 'Estudio',
};

const Week = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());

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
  WEEK_EVENTS.forEach((e) => {
    if (!eventsByDay[e.day]) eventsByDay[e.day] = [];
    eventsByDay[e.day].push(e);
  });

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const weekLabel = `${weekDays[0].getDate()} ${monthNames[weekDays[0].getMonth()]} - ${weekDays[6].getDate()} ${monthNames[weekDays[6].getMonth()]}`;

  const canGoBack = weekDays[0].getDate() > 7;

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
                            const height = ((e.end - e.start) / (TIME_SLOTS[TIME_SLOTS.length - 1] - TIME_SLOTS[0])) * 100;
                            return (
                              <div
                                key={e.id}
                                className="mb-1"
                                style={{
                                  height: `${Math.max(height * 68, 40)}px`,
                                  backgroundColor: typeColors[e.type] || e.color,
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  fontSize: '0.78rem',
                                  lineHeight: '1.2',
                                  overflow: 'hidden',
                                }}
                              >
                                <div className="fw-semibold text-white">{e.title}</div>
                                <div className="text-white opacity-90 small">{e.room || ''}</div>
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
          {['class', 'lab', 'task', 'exam', 'project', 'study'].map((type) => {
            const events = WEEK_EVENTS.filter((e) => e.type === type);
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
                    <div className="text-muted-tf small">{events.length} bloque(s)</div>
                  </div>
                  <span className="badge bg-dark text-white border border-secondary">{events.length}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Week;
