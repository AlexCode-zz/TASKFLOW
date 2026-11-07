const StepPreferences = ({ preferences, onChange }) => {
  return (
    <div className="row g-4">
      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Hora habitual para comenzar el día</label>
        <input
          type="time"
          className="form-control bg-surface border-secondary text-white"
          value={preferences.usual_start_time || ''}
          onChange={(e) => onChange('usual_start_time', e.target.value)}
          placeholder="07:30"
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Hora habitual para dormir</label>
        <input
          type="time"
          className="form-control bg-surface border-secondary text-white"
          value={preferences.usual_sleep_time || ''}
          onChange={(e) => onChange('usual_sleep_time', e.target.value)}
          placeholder="23:00"
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Duración preferida de sesiones de estudio (minutos)</label>
        <input
          type="number"
          min="5"
          max="480"
          className="form-control bg-surface border-secondary text-white"
          value={preferences.preferred_study_session_minutes || ''}
          onChange={(e) => onChange('preferred_study_session_minutes', e.target.value)}
          placeholder="60"
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Duración de descansos (minutos)</label>
        <input
          type="number"
          min="1"
          max="120"
          className="form-control bg-surface border-secondary text-white"
          value={preferences.preferred_break_minutes || ''}
          onChange={(e) => onChange('preferred_break_minutes', e.target.value)}
          placeholder="15"
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Días de anticipación para preparar exámenes</label>
        <input
          type="number"
          min="1"
          max="30"
          className="form-control bg-surface border-secondary text-white"
          value={preferences.exam_preparation_days || ''}
          onChange={(e) => onChange('exam_preparation_days', e.target.value)}
          placeholder="3"
        />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label text-muted-tf small">Preferencia de planificación</label>
        <select
          className="form-select bg-surface border-secondary text-white"
          value={preferences.planning_preference || 'daily'}
          onChange={(e) => onChange('planning_preference', e.target.value)}
        >
          <option value="daily">Diaria</option>
          <option value="weekly">Semanal</option>
        </select>
      </div>

      <div className="col-12">
        <p className="text-muted-tf small">
          Estas preferencias se utilizarán posteriormente para el motor de planificación automática de TaskFlow.
        </p>
      </div>
    </div>
  );
};

export default StepPreferences;
