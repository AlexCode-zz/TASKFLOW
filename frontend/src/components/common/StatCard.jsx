const StatCard = ({ label, value, trend, icon, color = '#6366f1' }) => {
  return (
    <div className="card h-100 border-secondary bg-surface shadow-sm">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-muted-tf small mb-1">{label}</p>
            <h3 className="fw-bold mb-0">{value}</h3>
          </div>
          <div
            className="stat-icon"
            style={{ backgroundColor: `${color}15`, color, width: '36px', height: '36px' }}
          >
            {icon}
          </div>
        </div>
        {trend && (
          <p className="text-muted-tf small mt-2 mb-0">{trend}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
