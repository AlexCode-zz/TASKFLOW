const Button = ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...rest }) => {
  const base = 'btn';
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'outline'
        ? 'btn-outline-primary'
        : variant === 'secondary'
          ? 'btn-outline-secondary'
          : 'btn-outline-danger';
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const classes = [base, variantClass, sizeClass, className].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} disabled={disabled || loading} {...rest}>
      {loading ? 'Cargando...' : children}
    </button>
  );
};

export default Button;
