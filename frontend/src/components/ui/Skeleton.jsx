const Skeleton = ({ lines = 3, className = '' }) => (
  <div className={`skeleton ${className}`.trim()}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="skeleton"
        style={{ height: '0.85rem', marginBottom: i < lines - 1 ? '0.6rem' : 0 }}
      />
    ))}
  </div>
);

export default Skeleton;
