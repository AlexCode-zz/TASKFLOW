import { useState } from 'react';

const INITIAL_FORM = {
  name: '',
  institution: '',
  career: '',
  faculty: '',
  academic_year: '',
  semester: '',
  cycle_start_date: '',
  cycle_end_date: '',
};

const StepAcademic = ({ form, onChange, errors, setErrors }) => {
  const [localErrors, setLocalErrors] = useState(errors || {});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    if (!form.career.trim()) e.career = 'La carrera es obligatoria';
    if (form.academic_year && (form.academic_year < 1 || form.academic_year > 10)) {
      e.academic_year = 'Año académico inválido';
    }
    if (form.cycle_start_date && form.cycle_end_date && form.cycle_end_date < form.cycle_start_date) {
      e.cycle_end_date = 'La fecha de finalización debe ser posterior a la de inicio';
    }
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

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Universidad o institución</label>
        <input
          type="text"
          className="form-control bg-surface border-secondary text-white"
          value={form.institution}
          onChange={(e) => onChange('institution', e.target.value)}
          placeholder="Universidad Nacional"
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Carrera <span className="text-danger">*</span></label>
        <input
          type="text"
          className={`form-control bg-surface border-secondary text-white ${localErrors.career ? 'is-invalid' : ''}`}
          value={form.career}
          onChange={(e) => onChange('career', e.target.value)}
          placeholder="Ingeniería en Sistemas"
        />
        {localErrors.career && <div className="invalid-feedback d-block">{localErrors.career}</div>}
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Facultad</label>
        <input
          type="text"
          className="form-control bg-surface border-secondary text-white"
          value={form.faculty}
          onChange={(e) => onChange('faculty', e.target.value)}
          placeholder="Facultad de Ingeniería"
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Año académico</label>
        <input
          type="number"
          min="1"
          max="10"
          className={`form-control bg-surface border-secondary text-white ${localErrors.academic_year ? 'is-invalid' : ''}`}
          value={form.academic_year}
          onChange={(e) => onChange('academic_year', e.target.value)}
          placeholder="3"
        />
        {localErrors.academic_year && <div className="invalid-feedback d-block">{localErrors.academic_year}</div>}
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Semestre o ciclo</label>
        <input
          type="text"
          className="form-control bg-surface border-secondary text-white"
          value={form.semester}
          onChange={(e) => onChange('semester', e.target.value)}
          placeholder="3º Semestre"
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Fecha de inicio del ciclo</label>
        <input
          type="date"
          className="form-control bg-surface border-secondary text-white"
          value={form.cycle_start_date}
          onChange={(e) => onChange('cycle_start_date', e.target.value)}
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Fecha de finalización del ciclo</label>
        <input
          type="date"
          className={`form-control bg-surface border-secondary text-white ${localErrors.cycle_end_date ? 'is-invalid' : ''}`}
          value={form.cycle_end_date}
          onChange={(e) => onChange('cycle_end_date', e.target.value)}
        />
        {localErrors.cycle_end_date && <div className="invalid-feedback d-block">{localErrors.cycle_end_date}</div>}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={validate}
      >
        Validar y continuar
      </button>
    </div>
  );
};

export default StepAcademic;
