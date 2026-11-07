const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => {
  return (
    <div className="text-center py-5">
      <div className="empty-icon mb-3">{icon}</div>
      <h3 className="fw-semibold mb-2">{title}</h3>
      <p className="text-muted-tf mb-4">{subtitle}</p>
      {actionLabel && onAction && (
        <button className="btn btn-outline-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
