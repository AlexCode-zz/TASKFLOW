import { useState } from 'react';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/**
 * Construye la cuadrícula del mes: 1..31 con los huecos de semana
 * anteriores (calendario tipo semana que empieza en lunes).
 */
const buildMonthCells = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay() || 7; // 1 (Lu) .. 7 (Do)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay - 1; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

/**
 * Calendario minimalista del asistente: mes actual, días de la semana,
 * números de días, navegación entre meses y marcador del día actual.
 * No carga ni muestra eventos: solo sirve para consultar fechas rápido.
 */
const MelCalendar = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = `${MONTHS[month]} ${year}`;
  const cells = buildMonthCells(year, month);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const isToday = (day) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  return (
    <div className="mel-calendar">
      <div className="mel-calendar-head">
        <span className="mel-calendar-title">{monthLabel}</span>
        <div className="mel-calendar-nav">
          <button
            type="button"
            className="mel-calendar-nav-btn"
            onClick={() => changeMonth(-1)}
            aria-label="Mes anterior"
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mel-calendar-nav-btn"
            onClick={() => changeMonth(1)}
            aria-label="Mes siguiente"
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mel-calendar-grid">
        {DAYS_SHORT.map((day) => (
          <span key={day} className="mel-calendar-dow">
            {day}
          </span>
        ))}
        {cells.map((day, index) =>
          day === null ? (
            <span key={`empty-${index}`} className="mel-calendar-day mel-calendar-day-empty" aria-hidden="true" />
          ) : (
            <span
              key={day}
              className={`mel-calendar-day${isToday(day) ? ' is-today' : ''}`}
            >
              {day}
            </span>
          ),
        )}
      </div>
    </div>
  );
};

export default MelCalendar;
