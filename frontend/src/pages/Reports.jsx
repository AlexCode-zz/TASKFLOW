import StatCard from '../components/common/StatCard';

const Reports = () => {
  return (
    <div className="fade-in">
      <header className="mb-4">
        <h1 className="fw-bold mb-1">Informes</h1>
        <p className="text-muted-tf mb-0">
          Resumen de tu actividad académica y progreso.
        </p>
      </header>

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <StatCard label="Tiempo de estudio (semana)" value="12 h" icon="⏱️" color="#3b82f6" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard label="Actividades completadas" value="24" trend="+3 esta semana" icon="✅" color="#10b981" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard label="Tareas pendientes" value="7" icon="⏳" color="#f59e0b" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard label="Promedio general" value="3.8 / 5.0" icon="📊" color="#8b5cf6" />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <section className="card border-secondary shadow-sm mb-4">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">Progreso por materia</h5>
            </div>
            <div className="card-body p-3">
              <div className="row g-3">
                {[
                  { name: 'Cálculo Diferencial', progress: 62, color: '#3b82f6' },
                  { name: 'Programación II', progress: 78, color: '#10b981' },
                  { name: 'Física General I', progress: 45, color: '#ef4444' },
                  { name: 'Literatura', progress: 90, color: '#f59e0b' },
                  { name: 'Química Orgánica', progress: 55, color: '#06b6d4' },
                ].map((m) => (
                  <div key={m.name} className="col-12 col-md-6">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted-tf small">{m.name}</span>
                      <span className="text-muted-tf small">{m.progress}%</span>
                    </div>
                    <div className="progress bg-secondary" style={{ height: '6px' }}>
                      <div className="progress-bar" style={{ width: `${m.progress}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card border-secondary shadow-sm">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">Próximas fechas importantes</h5>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {[
                  { date: '14 Nov', title: 'Parcial 1 - Programación II', type: 'exam' },
                  { date: '18 Nov', title: 'Parcial 1 - Cálculo', type: 'exam' },
                  { date: '20 Nov', title: 'Informe de óptica', type: 'lab' },
                  { date: '25 Nov', title: 'Ensayo final - Literatura', type: 'project' },
                ].map((item, i) => (
                  <div key={i} className="list-group-item bg-surface border-secondary p-3 d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-medium text-white">{item.title}</div>
                      <span className="badge bg-dark text-white small">{item.type}</span>
                    </div>
                    <div className="text-muted-tf small">{item.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="col-lg-4">
          <section className="card border-secondary shadow-sm mb-4">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">Distribución del tiempo</h5>
            </div>
            <div className="card-body p-3 text-center">
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted-tf small">Clases</span>
                  <span className="text-muted-tf small">40%</span>
                </div>
                <div className="progress bg-secondary" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: '40%', backgroundColor: '#3b82f6' }} />
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted-tf small">Estudio</span>
                  <span className="text-muted-tf small">35%</span>
                </div>
                <div className="progress bg-secondary" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: '35%', backgroundColor: '#10b981' }} />
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted-tf small">Tareas</span>
                  <span className="text-muted-tf small">25%</span>
                </div>
                <div className="progress bg-secondary" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: '25%', backgroundColor: '#f59e0b' }} />
                </div>
              </div>
            </div>
          </section>

          <section className="card border-secondary shadow-sm">
            <div className="card-header bg-transparent border-secondary pb-2">
              <h5 className="fw-semibold mb-0">Nota</h5>
            </div>
            <div className="card-body p-3">
              <p className="text-muted-tf small">
                Esta pantalla muestra la estructura visual de Informes. Los cálculos reales se implementarán en fases posteriores.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Reports;
