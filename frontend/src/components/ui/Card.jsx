const Card = ({ title, actions, children, className = '', footer, bodyClassName = '' }) => (
  <div className={`card ${className}`.trim()}>
    {(title || actions) && (
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>{title}</span>
        {actions}
      </div>
    )}
    <div className={`card-body ${bodyClassName}`.trim()}>{children}</div>
    {footer && <div className="card-footer">{footer}</div>}
  </div>
);

export default Card;
