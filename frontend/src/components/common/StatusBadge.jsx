const STATUS_STYLE = {
  pending: { bg: 'bg-warning text-dark', label: 'Pendiente' },
  en_progreso: { bg: 'bg-info text-dark', label: 'En progreso' },
  completada: { bg: 'bg-success text-white', label: 'Completada' },
  completed: { bg: 'bg-success text-white', label: 'Completada' },
  realizado: { bg: 'bg-success text-white', label: 'Realizado' },
  cancelado: { bg: 'bg-secondary text-white', label: 'Cancelado' },
  upcoming: { bg: 'bg-info text-dark', label: 'Próxima' },
};

const StatusBadge = ({ status }) => {
  const style = STATUS_STYLE[status] || STATUS_STYLE.pending;

  return (
    <span className={`badge rounded-pill ${style.bg} small fw-medium`}>
      {style.label}
    </span>
  );
};

export default StatusBadge;
