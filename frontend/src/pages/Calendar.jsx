import { useState } from 'react';
import { WEEK_EVENTS } from '../data/mockData';
import EventCard from '../components/common/EventCard';

const VIEWS = ['month', 'week', 'day'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const Calendar = () => {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

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
    const eventDay = ((day - 1) % daysInMonth) + 1;
    return WEEK_EVENTS.filter((e) => e.id % daysInMonth === eventDay || e.id % daysInMonth === 0);
  };

  const monthLabel = `${MONTHS[month]} ${year}`;

  return (
    <div className="fade-in">
      <header className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="fw-bold mb-1">Calendario</h1>
          <p className="text-muted-tf mb-0">Organización académica por fechas.</p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => changeMonth(-1)}
              disabled={year <= 2024 && month === 0}
            >
              Mes anterior
            </button>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => changeMonth(1)}
            >
              Mes siguiente
            </button>
          </div>
          <div className="btn-group btn-group-outline" role="group">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                className={`btn btn-outline-primary btn-sm ${view === v ? 'bg-primary text-white border-primary' : 'text-muted-tf'}`}
                onClick={() => setView(v)}
              >
                {v === 'month' ? 'Mensual' : v === 'week' ? 'Semanal' : 'Diaria'}
              </button>
            ))}
          </div>
        </div>
      </header>

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
                const events = eventsForDay(day);
                return (
                  <div
                    key={day}
                    className={`col border-secondary position-relative p-2 ${isToday(new Date(year, month, day)) ? 'bg-primary text-white' : 'bg-surface'}`}
                    style={{ minHeight: '90px' }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <span className={`fw-medium ${isToday(new Date(year, month, day)) ? 'text-white' : 'text-white'}`}>{day}</span>
                      {events.length > 0 && (
                        <span className="badge bg-dark text-white border border-secondary" style={{ fontSize: '0.65rem' }}>
                          {events.length}
                        </span>
                      )}
                    </div>
                    {events.slice(0, 3).map((e) => (
                      <EventCard key={e.id} event={e} compact />
                    ))}
                    {events.length > 3 && (
                      <div className="text-muted-tf small opacity-80">+{events.length - 3} más</div>
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
            <h5 className="fw-semibold text-white">Vista {view === 'week' ? 'semanal' : 'diaria'} en desarrollo</h5>
            <p className="text-muted-tf small">Selecciona "Mensual" para ver el calendario completo.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
