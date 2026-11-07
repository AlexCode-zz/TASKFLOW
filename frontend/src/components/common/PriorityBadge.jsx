const PRIORITY_STYLE = {
  high: { bg: '#ef4444', text: 'text-white' },
  medium: { bg: '#f59e0b', text: 'text-white' },
  low: { bg: '#10b981', text: 'text-white' },
};

const PriorityBadge = ({ priority }) => {
  const style = PRIORITY_STYLE[priority] || PRIORITY_STYLE.medium;
  const label = { high: 'Alta', medium: 'Media', low: 'Baja' }[priority] || 'Media';

  return (
    <span
      className={`badge rounded-pill ${style.bg} ${style.text} small fw-medium`}
      style={{ padding: '0.4em 0.8em' }}
    >
      {label}
    </span>
  );
};

export default PriorityBadge;
