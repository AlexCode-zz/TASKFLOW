import { useState } from 'react';

const DAYS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miércoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sábado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const StepAvailability = ({ availability, onChange, onAddQuickAvailability }) => {
  const [form, setForm] = useState(
    availability.reduce((acc, a) => {
      acc[a.day_of_week] = {
        is_available: a.is_available,
        start_time: a.start_time || '',
        end_time: a.end_time || '',
      };
      return acc;
    }, {})
  );

  const handleChange = (day, field, value) => {
    const newForm = { ...form, [day]: { ...form[day], [field]: value } };
    setForm(newForm);
    onChange(newForm);
  };

  const validateTimes = (dayData) => {
    if (dayData.start_time && dayData.end_time && dayData.end_time <= dayData.start_time) {
      return 'La hora de finalización debe ser posterior a la de inicio';
    }
    return null;
  };

  const applyQuickAvailability = (start, end, days) => {
    const newAvailability = availability.map((a) => {
      if (days.includes(a.day_of_week)) {
        return { ...a, is_available: true, start_time: start, end_time: end };
      }
      return a;
    });
    setForm(newAvailability.reduce((acc, a) => {
      acc[a.day_of_week] = {
        is_available: a.is_available,
        start_time: a.start_time || '',
        end_time: a.end_time || '',
      };
      return acc;
    }, {}));
    onChange(newAvailability);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-semibold mb-0">Disponibilidad semanal</h6>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => {
            applyQuickAvailability('18:00', '22:00', ['lunes', 'martes', 'miércoles', 'jueves', 'viernes']);
          }}
        >
          Lun–Vie 18:00–22:00
        </button>
      </div>

      <div className="row g-3">
        {DAYS.map((day) => {
          const d = form[day.key] || { is_available: false, start_time: '', end_time: '' };
          const error = validateTimes(d);
          return (
            <div key={day.key} className="col-12 col-md-6 col-lg-4">
              <div className={`card border-secondary p-3 h-100 ${error ? 'border-danger' : ''}`}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="fw-semibold text-white">{day.label}</span>
                  <label className="form-check mb-0">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={d.is_available}
                      onChange={(e) => handleChange(day.key, 'is_available', e.target.checked)}
                    />
                    <span className="form-check-label text-muted-tf small">Disponible</span>
                  </label>
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label text-muted-tf small">Hora inicio</label>
                    <input
                      type="time"
                      className={`form-control bg-surface border-secondary text-white ${error ? 'is-invalid' : ''}`}
                      value={d.start_time}
                      onChange={(e) => handleChange(day.key, 'start_time', e.target.value)}
                      disabled={!d.is_available}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-muted-tf small">Hora fin</label>
                    <input
                      type="time"
                      className={`form-control bg-surface border-secondary text-white ${error ? 'is-invalid' : ''}`}
                      value={d.end_time}
                      onChange={(e) => handleChange(day.key, 'end_time', e.target.value)}
                      disabled={!d.is_available}
                    />
                  </div>
                </div>
                {error && <div className="invalid-feedback d-block mt-2">{error}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => {
            const allDays = DAYS.map((d) => d.key);
            applyQuickAvailability('08:00', '20:00', allDays);
          }}
        >
          Copiar a todos los días (08:00–20:00)
        </button>
      </div>
    </div>
  );
};

export default StepAvailability;