const formatDate = (dateStr) => {
  if (!dateStr) return 'No especificada';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const StepSummary = ({ student, subjects, availability, preferences }) => {
  const availabilityByDay = availability.reduce((acc, a) => {
    acc[a.day_of_week] = a;
    return acc;
  }, {});

  return (
    <div className="row g-4">
      <div className="col-12 col-md-6">
        <div className="card border-secondary h-100">
          <div className="card-header bg-transparent border-secondary">
            <h6 className="fw-semibold mb-0">Información académica</h6>
          </div>
          <div className="card-body p-3">
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Nombre</span>
              <span className="text-white">{student.name}</span>
            </div>
            {student.institution && (
              <div className="mb-2">
                <span className="text-muted-tf small d-block">Institución</span>
                <span className="text-white">{student.institution}</span>
              </div>
            )}
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Carrera</span>
              <span className="text-white">{student.career}</span>
            </div>
            {student.faculty && (
              <div className="mb-2">
                <span className="text-muted-tf small d-block">Facultad</span>
                <span className="text-white">{student.faculty}</span>
              </div>
            )}
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Año académico</span>
              <span className="text-white">{student.academic_year || 'No especificado'}</span>
            </div>
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Semestre</span>
              <span className="text-white">{student.semester || 'No especificado'}</span>
            </div>
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Inicio del ciclo</span>
              <span className="text-white">{formatDate(student.cycle_start_date)}</span>
            </div>
            <div className="mb-0">
              <span className="text-muted-tf small d-block">Fin del ciclo</span>
              <span className="text-white">{formatDate(student.cycle_end_date)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-md-6">
        <div className="card border-secondary h-100">
          <div className="card-header bg-transparent border-secondary">
            <h6 className="fw-semibold mb-0">Materias registradas ({subjects.length})</h6>
          </div>
          <div className="card-body p-3">
            {subjects.length > 0 ? (
              <div className="list-group list-group-flush">
                {subjects.map((s) => (
                  <div key={s.id} className="list-group-item bg-surface border-secondary p-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-white fw-medium">{s.name}</span>
                      <span
                        className="badge"
                        style={{ backgroundColor: s.color, color: '#ffffff' }}
                      >
                        {s.classroom || 'Sin aula'}
                      </span>
                    </div>
                    <div className="text-muted-tf small mt-1">
                      {s.code ? s.code + ' · ' : ''}{s.teacher || ''}{s.cycle ? ` · Ciclo ${s.cycle}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-tf small text-center py-3">No hay materias registradas</div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12 col-md-6">
        <div className="card border-secondary h-100">
          <div className="card-header bg-transparent border-secondary">
            <h6 className="fw-semibold mb-0">Disponibilidad semanal</h6>
          </div>
          <div className="card-body p-3">
            {DAYS_SUMMARY.map((day) => {
              const a = availabilityByDay[day.key];
              return (
                <div key={day.key} className="mb-2">
                  <div className="d-flex justify-content-between mb-1">
                    <span className={`text-muted-tf small ${a && a.is_available ? 'text-white' : 'text-muted-tf'}`}>
                      {day.label}
                    </span>
                    <span className={`badge ${a && a.is_available ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                      {a && a.is_available ? 'Disponible' : 'No disponible'}
                    </span>
                  </div>
                  {a && a.is_available && a.start_time && a.end_time && (
                    <div className="text-muted-tf small ms-3">{a.start_time} - {a.end_time}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="col-12 col-md-6">
        <div className="card border-secondary h-100">
          <div className="card-header bg-transparent border-secondary">
            <h6 className="fw-semibold mb-0">Preferencias de planificación</h6>
          </div>
          <div className="card-body p-3">
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Hora de inicio del día</span>
              <span className="text-white">{preferences.usual_start_time || 'No especificada'}</span>
            </div>
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Hora de dormir</span>
              <span className="text-white">{preferences.usual_sleep_time || 'No especificada'}</span>
            </div>
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Sesión de estudio</span>
              <span className="text-white">{preferences.preferred_study_session_minutes || 'No especificado'} min</span>
            </div>
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Descanso</span>
              <span className="text-white">{preferences.preferred_break_minutes || 'No especificado'} min</span>
            </div>
            <div className="mb-2">
              <span className="text-muted-tf small d-block">Anticipación exámenes</span>
              <span className="text-white">{preferences.exam_preparation_days || 'No especificado'} días</span>
            </div>
            <div className="mb-0">
              <span className="text-muted-tf small d-block">Tipo de planificación</span>
              <span className="text-white">{preferences.planning_preference === 'weekly' ? 'Semanal' : 'Diaria'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="alert alert-info text-white border-secondary">
          <h6 className="fw-semibold mb-2">Confirmar configuración</h6>
          <p className="text-muted-tf small mb-0">
            Al confirmar, se guardará toda esta información y podrás comenzar a usar TaskFlow.
            Podrás editar estos datos en cualquier momento desde Configuración.
          </p>
        </div>
      </div>
    </div>
  );
};

const DAYS_SUMMARY = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miércoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sábado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

export default StepSummary;
