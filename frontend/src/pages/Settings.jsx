import { useState, useEffect } from 'react';
import api from '../services/api';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('perfil');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  const sections = [
    { id: 'perfil', label: 'Perfil académico', icon: '👤' },
    { id: 'carrera', label: 'Carrera y semestre', icon: '🎓' },
    { id: 'horarios', label: 'Horarios y disponibilidad', icon: '🕒' },
    { id: 'planificacion', label: 'Preferencias de planificación', icon: '📋' },
    { id: 'apariencia', label: 'Apariencia', icon: '🎨' },
    { id: 'ia', label: 'Asistente IA', icon: '🤖' },
  ];

  useEffect(() => {
    loadStudent();
  }, []);

  const loadStudent = async () => {
    try {
      const response = await api.get('/students/me');
      setStudent(response.data);
    } catch (err) {
      console.error('No se pudo cargar el perfil:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/students/me', student);
      setSaveMessage('Cambios guardados correctamente.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage('Error al guardar los cambios.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-5">
        <div className="text-muted-tf mb-3">No hay configuración de estudiante.</div>
        <a href="/configuracion" className="btn btn-primary">
          Ir a configuración
        </a>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {saveMessage && (
        <div className="alert alert-success text-white border-secondary mb-3" role="alert">
          {saveMessage}
        </div>
      )}
      <header className="mb-4">
        <h1 className="fw-bold mb-1">Configuración</h1>
        <p className="text-muted-tf mb-0">Ajustes de TaskFlow.</p>
      </header>

      <div className="row">
        <div className="col-12 col-lg-3">
          <div className="list-group list-group-flush border-secondary">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`list-group-item list-group-item-action bg-surface border-secondary text-white d-flex align-items-center gap-2 ${activeSection === s.id ? 'bg-primary' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <span className="fs-5">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="col-12 col-lg-9">
          <div className="card border-secondary shadow-sm h-100">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">
                {sections.find((s) => s.id === activeSection)?.label}
              </h5>
            </div>
            <div className="card-body p-4">
              {activeSection === 'perfil' && (
                <form onSubmit={handleSave}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Nombre completo</label>
                      <input
                        type="text"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="Juan Pérez"
                        value={student.name || ''}
                        onChange={(e) =>
                          setStudent({ ...student, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Correo institucional</label>
                      <input
                        type="email"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="juan@universidad.edu"
                        value={student.institution || ''}
                        onChange={(e) =>
                          setStudent({ ...student, institution: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Código de estudiante</label>
                      <input
                        type="text"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="20240001"
                        value={student.career || ''}
                        onChange={(e) =>
                          setStudent({ ...student, career: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Teléfono</label>
                      <input
                        type="text"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="+52 1 000 000 0000"
                        value={student.faculty || ''}
                        onChange={(e) =>
                          setStudent({ ...student, faculty: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-primary mt-3" type="submit">
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {activeSection === 'carrera' && (
                <form onSubmit={handleSave}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Carrera</label>
                      <input
                        type="text"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="Ingeniería en Sistemas"
                        value={student.career || ''}
                        onChange={(e) =>
                          setStudent({ ...student, career: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Semestre</label>
                      <input
                        type="text"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="3º Semestre"
                        value={student.semester || ''}
                        onChange={(e) =>
                          setStudent({ ...student, semester: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Facultad</label>
                      <input
                        type="text"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="Facultad de Ingeniería"
                        value={student.faculty || ''}
                        onChange={(e) =>
                          setStudent({ ...student, faculty: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Año académico</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="3"
                        value={student.academic_year || ''}
                        onChange={(e) =>
                          setStudent({ ...student, academic_year: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-primary mt-3" type="submit">
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {activeSection === 'horarios' && (
                <div>
                  <p className="text-muted-tf small">
                    Define tus horarios de disponibilidad para que el asistente pueda planificar tu tiempo de estudio.
                  </p>
                  <div className="row g-3 mt-3">
                    {[
                      'Lunes',
                      'Martes',
                      'Miércoles',
                      'Jueves',
                      'Viernes',
                      'Sábado',
                      'Domingo',
                    ].map((day) => (
                      <div key={day} className="col-12 col-md-4">
                        <div className="d-flex justify-content-between align-items-center p-2 border-secondary rounded-3 bg-surface mb-2">
                          <span className="text-muted-tf small">{day}</span>
                          <div className="d-flex gap-2">
                            <input
                              type="time"
                              className="form-control bg-surface border-secondary text-white"
                              placeholder="Inicio"
                            />
                            <span className="text-muted-tf small">a</span>
                            <input
                              type="time"
                              className="form-control bg-surface border-secondary text-white"
                              placeholder="Fin"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'planificacion' && (
                <form onSubmit={handleSave}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Hora habitual para comenzar el día</label>
                      <input
                        type="time"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="07:30"
                        value={student.preferences?.usual_start_time || ''}
                        onChange={(e) =>
                          setStudent({
                            ...student,
                            preferences: { ...student.preferences, usual_start_time: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Hora habitual para dormir</label>
                      <input
                        type="time"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="23:00"
                        value={student.preferences?.usual_sleep_time || ''}
                        onChange={(e) =>
                          setStudent({
                            ...student,
                            preferences: { ...student.preferences, usual_sleep_time: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Duración de sesiones de estudio (minutos)</label>
                      <input
                        type="number"
                        min="5"
                        max="480"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="60"
                        value={student.preferences?.preferred_study_session_minutes || ''}
                        onChange={(e) =>
                          setStudent({
                            ...student,
                            preferences: {
                              ...student.preferences,
                              preferred_study_session_minutes: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-muted-tf small">Duración de descansos (minutos)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="15"
                        value={student.preferences?.preferred_break_minutes || ''}
                        onChange={(e) =>
                          setStudent({
                            ...student,
                            preferences: { ...student.preferences, preferred_break_minutes: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-primary mt-3" type="submit">
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {activeSection === 'apariencia' && (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Tema</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>Oscuro</option>
                      <option>Claro</option>
                      <option>Sistema</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Idioma</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>Español</option>
                      <option>Inglés</option>
                    </select>
                  </div>
                  <button className="btn btn-primary mt-3">Guardar cambios</button>
                </div>
              )}

              {activeSection === 'ia' && (
                <div className="row g-3">
                  <div className="col-12">
                    <div className="card border-secondary p-3 mb-4">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <span className="text-primary fw-medium">🤖</span>
                        <h6 className="fw-semibold mb-0">Configuración del asistente IA</h6>
                      </div>
                      <p className="text-muted-tf small mb-3">
                        Configura el proveedor y modelo de IA que usará el asistente académico. Cada usuario aporta su propia API key.
                      </p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Proveedor</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>OpenRouter</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Modelo</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>Seleccionar modelo...</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label text-muted-tf small">API key</label>
                    <div className="input-group">
                      <input
                        type="password"
                        className="form-control bg-surface border-secondary text-white"
                        placeholder="sk-or-..."
                      />
                      <button className="btn btn-outline-primary" type="button">
                        👁️
                      </button>
                    </div>
                    <p className="text-muted-tf small mt-2">
                      La API key se almacena localmente en tu dispositivo.
                    </p>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary">Guardar configuración de IA</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
