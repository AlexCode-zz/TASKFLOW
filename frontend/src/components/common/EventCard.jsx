const EventCard = ({ event, compact = false }) => {
  const typeLabels = {
    class: 'Clase',
    lab: 'Laboratorio',
    task: 'Tarea',
    project: 'Proyecto',
    exam: 'Examen',
    study: 'Estudio',
  };

  const typeColors = {
    class: '#3b82f6',
    lab: '#06b6d4',
    task: '#10b981',
    project: '#f59e0b',
    exam: '#8b5cf6',
    study: '#94949a',
  };

  const label = typeLabels[event.type] || 'Evento';
  const color = typeColors[event.type] || event.color;

  return (
    <div
      className="event-card p-2 rounded-2 border-0"
      style={{
        backgroundColor: color,
        color: '#ffffff',
        fontSize: compact ? '0.75rem' : '0.85rem',
      }}
    >
      <div className="d-flex justify-content-between align-items-start mb-1">
        <span className="fw-semibold">{event.title}</span>
        <span
          className="badge bg-dark text-white border border-secondary"
          style={{ fontSize: '0.65rem', padding: '0.2em 0.5em' }}
        >
          {label}
        </span>
      </div>
      {event.room && (
        <div className="small opacity-90">{event.room}</div>
      )}
    </div>
  );
};

export default EventCard;
