const Badge = ({ color = 'secondary', children }) => (
  <span className={`badge bg-${color} text-white`}>{children}</span>
);

export default Badge;
