import { useState } from 'react';

const StepAcademic = ({ form, onChange, errors, setErrors }) => {
  const [localErrors, setLocalErrors] = useState(errors || {});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    setLocalErrors(e);
    if (setErrors) setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="row g-4">
      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Nombre completo <span className="text-danger">*</span></label>
        <input
          type="text"
          className={`form-control bg-surface border-secondary text-white ${localErrors.name ? 'is-invalid' : ''}`}
          value={form.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Juan Pérez"
        />
        {localErrors.name && <div className="invalid-feedback d-block">{localErrors.name}</div>}
      </div>

      <div className="col-12 text-muted-tf small">
        Solo necesitamos tu nombre para empezar. Puedes completar el resto más tarde desde Configuración.
      </div>
    </div>
  );
};

export default StepAcademic;