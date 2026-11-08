import Button from './Button';

const EmptyState = ({ icon, title, message, actionLabel, onAction }) => (
  <div className="state-container">
    <div className="state-icon" aria-hidden="true">{icon}</div>
    <h2 className="state-title">{title}</h2>
    {message && <p className="state-message">{message}</p>}
    {actionLabel && onAction && (
      <div className="state-actions">
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    )}
  </div>
);

export default EmptyState;
