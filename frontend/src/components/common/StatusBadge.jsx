const STATUS_STYLE = {
  pending: { bg: 'bg-warning text-dark', label: 'Pendiente' },
  completed: { bg: 'bg-success text-white', label: 'Completada' },
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
