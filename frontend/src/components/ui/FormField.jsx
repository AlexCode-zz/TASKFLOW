const FormField = ({ label, name, error, required, children }) => (
  <div className="form-field">
    {label && (
      <label className="form-field-label" htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>
    )}
    {children}
    {error && <div className="form-field-error">{error}</div>}
  </div>
);

export default FormField;
