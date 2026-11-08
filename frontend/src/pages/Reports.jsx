import StatCard from '../components/common/StatCard';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';

const Reports = () => {
  const progressBySubject = [
    { name: 'Cálculo Diferencial', progress: 62, color: '#3b82f6' },
    { name: 'Programación II', progress: 78, color: '#10b981' },
    { name: 'Física General I', progress: 45, color: '#ef4444' },
    { name: 'Literatura', progress: 90, color: '#f59e0b' },
    { name: 'Química Orgánica', progress: 55, color: '#06b6d4' },
  ];

  const upcomingEvents = [
    { date: '14 Nov', title: 'Parcial 1 - Programación II', type: 'exam' },
    { date: '18 Nov', title: 'Parcial 1 - Cálculo', type: 'exam' },
    { date: '20 Nov', title: 'Informe de óptica', type: 'lab' },
    { date: '25 Nov', title: 'Ensayo final - Literatura', type: 'project' },
  ];

  const timeDistribution = [
    { label: 'Clases', percentage: 40, color: '#3b82f6' },
    { label: 'Estudio', percentage: 35, color: '#10b981' },
    { label: 'Tareas', percentage: 25, color: '#f59e0b' },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title="Informes"
        description="Resumen de tu actividad académica y progreso."
      />

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <StatCard label="Tiempo de estudio (semana)" value="12 h" icon={<i className="bi bi-clock-history" aria-hidden="true" />} color="#3b82f6" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard label="Actividades completadas" value="24" trend="+3 esta semana" icon={<i className="bi bi-check2-circle" aria-hidden="true" />} color="#10b981" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard label="Tareas pendientes" value="7" icon={<i className="bi bi-hourglass-split" aria-hidden="true" />} color="#f59e0b" />
        </div>
        <div className="col-md-6 col-lg-3">
          <StatCard label="Promedio general" value="3.8 / 5.0" icon={<i className="bi bi-graph-up" aria-hidden="true" />} color="#8b5cf6" />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <Card title="Progreso por materia" className="mb-4">
            <div className="card-body p-3">
              <div className="row g-3">
                {progressBySubject.map((m) => (
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
          </Card>

          <Card title="Próximas fechas importantes">
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {upcomingEvents.map((item, i) => (
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
          </Card>
        </div>

        <div className="col-lg-4">
          <Card title="Distribución del tiempo" className="mb-4">
            <div className="card-body p-3 text-center">
              {timeDistribution.map((t) => (
                <div key={t.label} className="mb-3 text-start">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted-tf small">{t.label}</span>
                    <span className="text-muted-tf small">{t.percentage}%</span>
                  </div>
                  <div className="progress bg-secondary" style={{ height: '8px' }}>
                    <div className="progress-bar" style={{ width: `${t.percentage}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Nota">
            <div className="card-body p-3">
              <p className="text-muted-tf small">
                Esta pantalla muestra la estructura visual de Informes. Los cálculos reales se implementarán en fases posteriores.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
