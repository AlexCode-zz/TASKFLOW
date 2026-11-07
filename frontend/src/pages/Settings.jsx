import { useState } from 'react';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('perfil');

  const sections = [
    { id: 'perfil', label: 'Perfil académico', icon: '👤' },
    { id: 'carrera', label: 'Carrera y semestre', icon: '🎓' },
    { id: 'horarios', label: 'Horarios y disponibilidad', icon: '🕒' },
    { id: 'planificacion', label: 'Preferencias de planificación', icon: '📋' },
    { id: 'apariencia', label: 'Apariencia', icon: '🎨' },
    { id: 'ia', label: 'Asistente IA', icon: '🤖' },
  ];

  return (
    <div className="fade-in">
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
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Nombre completo</label>
                    <input type="text" className="form-control bg-surface border-secondary text-white" placeholder="Juan Pérez" />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Correo institucional</label>
                    <input type="email" className="form-control bg-surface border-secondary text-white" placeholder="juan@universidad.edu" />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Código de estudiante</label>
                    <input type="text" className="form-control bg-surface border-secondary text-white" placeholder="20240001" />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Teléfono</label>
                    <input type="text" className="form-control bg-surface border-secondary text-white" placeholder="+52 1 000 000 0000" />
                  </div>
                  <button className="btn btn-primary mt-3">Guardar cambios</button>
                </div>
              )}

              {activeSection === 'carrera' && (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Carrera</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>Ingeniería en Sistemas Computacionales</option>
                      <option>Licenciatura en Matemáticas</option>
                      <option>Licenciatura en Física</option>
                      <option>Ingeniería Industrial</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Semestre</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>1º Semestre</option>
                      <option>2º Semestre</option>
                      <option>3º Semestre</option>
                      <option>4º Semestre</option>
                      <option>5º Semestre</option>
                      <option>6º Semestre</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Modalidad</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>Presencial</option>
                      <option>Híbrida</option>
                      <option>En línea</option>
                    </select>
                  </div>
                  <button className="btn btn-primary mt-3">Guardar cambios</button>
                </div>
              )}

              {activeSection === 'horarios' && (
                <div>
                  <p className="text-muted-tf small">Define tus horarios de disponibilidad para que el asistente pueda planificar tu tiempo de estudio.</p>
                  <div className="row g-3 mt-3">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => (
                      <div key={day} className="col-12 col-md-4">
                        <div className="d-flex justify-content-between align-items-center p-2 border-secondary rounded-3 bg-surface mb-2">
                          <span className="text-muted-tf small">{day}</span>
                          <div className="d-flex gap-2">
                            <input type="time" className="form-control bg-surface border-secondary text-white" />
                            <span className="text-muted-tf small">a</span>
                            <input type="time" className="form-control bg-surface border-secondary text-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'planificacion' && (
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Horas de estudio diarias (objetivo)</label>
                    <input type="number" className="form-control bg-surface border-secondary text-white" placeholder="2" />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Bloque de estudio preferido</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>Mañana</option>
                      <option>Tarde</option>
                      <option>Noche</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Días de descanso</label>
                    <select className="form-select bg-surface border-secondary text-white" multiple>
                      <option>Sábado</option>
                      <option>Domingo</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted-tf small">Recordatorios antes de clase</label>
                    <select className="form-select bg-surface border-secondary text-white">
                      <option>15 minutos</option>
                      <option>30 minutos</option>
                      <option>1 hora</option>
                      <option>Ninguno</option>
                    </select>
                  </div>
                  <button className="btn btn-primary mt-3">Guardar cambios</button>
                </div>
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
                      <input type="password" className="form-control bg-surface border-secondary text-white" placeholder="sk-or-..." />
                      <button className="btn btn-outline-primary" type="button">👁️</button>
                    </div>
                    <p className="text-muted-tf small mt-2">La API key se almacena localmente en tu dispositivo.</p>
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
