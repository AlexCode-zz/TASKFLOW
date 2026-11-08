import { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

const TYPE_LABELS = {
  parcial: 'Parcial',
  final: 'Final',
  quiz: 'Quiz',
  practico: 'Examen práctico',
  exposicion: 'Exposición',
  proyecto: 'Proyecto evaluado',
  laboratorio: 'Laboratorio evaluado',
  otro: 'Otro',
};

const Evaluations = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    subject_id: '',
    title: '',
    evaluation_type: 'parcial',
    date: '',
    start_time: '',
    end_time: '',
    weight_percentage: '',
    description: '',
    topics: '',
    preparation_level: 'no_iniciado',
    status: 'pendiente',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eRes, subRes] = await Promise.all([
        api.get('/evaluations/'),
        api.get('/subjects/'),
      ]);
      setEvaluations(eRes.data);
      setSubjects(subRes.data);
    } catch {
      setError('No se pudieron cargar las evaluaciones.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      const payload = { ...form };
      if (payload.weight_percentage === '') payload.weight_percentage = null;
      if (payload.weight_percentage !== null) payload.weight_percentage = Number(payload.weight_percentage);
      if (editingId) {
        await api.put(`/evaluations/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/evaluations/', payload);
      }
      setForm({
        subject_id: '',
        title: '',
        evaluation_type: 'parcial',
        date: '',
        start_time: '',
        end_time: '',
        weight_percentage: '',
        description: '',
        topics: '',
        preparation_level: 'no_iniciado',
        status: 'pendiente',
      });
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar la evaluación.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta evaluación?')) return;
    try {
      await api.delete(`/evaluations/${id}`);
      await loadData();
    } catch {
      setError('No se pudo eliminar la evaluación.');
    }
  };

  const handleEdit = (item) => {
    setForm({ ...item, weight_percentage: item.weight_percentage || '' });
    setEditingId(item.id);
  };

  if (loading) {
    return (
      <div className="fade-in">
        <Skeleton lines={4} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {error && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <span>{error}</span>
            <button type="button" className="btn btn-outline-light btn-sm" onClick={loadData}>
              Reintentar
            </button>
          </div>
        </div>
      )}
      {saveError && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          {saveError}
        </div>
      )}
      <PageHeader
        title="Evaluaciones"
        description="Exámenes, laboratorios, exposiciones y proyectos calificados."
        actions={
          <Button onClick={() => setEditingId(null)}>Registrar evaluación</Button>
        }
      />

      <div className="card border-secondary shadow-sm mb-4">
        <div className="card-header bg-transparent border-secondary">
          <h6 className="fw-semibold mb-0">{editingId ? 'Editar evaluación' : 'Nueva evaluación'}</h6>
        </div>
        <div className="card-body p-3">
          <form onSubmit={handleSave}>
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Materia <span className="text-danger">*</span></label>
                <select
                  required
                  className="form-select bg-surface border-secondary text-white"
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value === '' ? '' : Number(e.target.value) })}
                >
                  <option value="">Seleccionar materia</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'sin código'})</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Título <span className="text-danger">*</span></label>
                <input
                  type="text"
                  required
                  className="form-control bg-surface border-secondary text-white"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Parcial 1"
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Tipo</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.evaluation_type}
                  onChange={(e) => setForm({ ...form, evaluation_type: e.target.value })}
                >
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Fecha <span className="text-danger">*</span></label>
                <input
                  type="date"
                  required
                  className="form-control bg-surface border-secondary text-white"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-1">
                <label className="form-label text-muted-tf small">Hora inicio</label>
                <input
                  type="time"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-1">
                <label className="form-label text-muted-tf small">Hora fin</label>
                <input
                  type="time"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Ponderación (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.weight_percentage}
                  onChange={(e) => setForm({ ...form, weight_percentage: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Nivel de preparación</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.preparation_level}
                  onChange={(e) => setForm({ ...form, preparation_level: e.target.value })}
                >
                  <option value="no_iniciado">No iniciado</option>
                  <option value="estudiando">Estudiando</option>
                  <option value="preparado">Preparado</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Estado</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label text-muted-tf small">Temas a evaluar</label>
                <textarea
                  className="form-control bg-surface border-secondary text-white"
                  rows="2"
                  value={form.topics}
                  onChange={(e) => setForm({ ...form, topics: e.target.value })}
                  placeholder="Temas que se evaluarán"
                />
              </div>
              <div className="col-12">
                <label className="form-label text-muted-tf small">Descripción</label>
                <textarea
                  className="form-control bg-surface border-secondary text-white"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción adicional"
                />
              </div>
              <div className="col-12 d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar evaluación' : 'Registrar evaluación'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Total evaluaciones</div>
              <div className="fw-bold text-white">{evaluations.length}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Próximas</div>
              <div className="fw-bold text-white">
                {evaluations.filter((e) => e.status === 'pendiente').length}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Realizadas</div>
              <div className="fw-bold text-white">
                {evaluations.filter((e) => e.status === 'realizado').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <h6 className="fw-semibold text-white mb-3">Evaluaciones registradas</h6>
      {evaluations.length === 0 ? (
        <EmptyState
          icon="📝"
          title="Aún no tienes evaluaciones"
          message="Registra tu primera evaluación para comenzar."
          actionLabel="Registrar evaluación"
          onAction={() => setEditingId(null)}
        />
      ) : (
        <div className="row g-3">
          {evaluations.map((e) => {
            const subject = subjects.find((sub) => sub.id === e.subject_id);
            return (
              <div key={e.id} className="col-12 col-md-6 col-lg-4">
                <div className="card border-secondary shadow-sm h-100">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-semibold mb-0">{e.title}</h6>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="mb-2">
                      <span className="badge bg-dark text-white small me-2">{TYPE_LABELS[e.evaluation_type] || e.evaluation_type}</span>
                      <span className="badge bg-dark text-white small">{subject?.code || ''}</span>
                    </div>
                    <div className="text-muted-tf small mb-2">{subject ? subject.name : 'Materia'}</div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted-tf small">{e.date}</span>
                      {e.start_time && <span className="text-muted-tf small">{e.start_time}</span>}
                    </div>
                    {e.weight_percentage && (
                      <div className="mb-2">
                        <span className="text-muted-tf small d-block">Ponderación</span>
                        <span className="fw-medium text-white">{e.weight_percentage}%</span>
                      </div>
                    )}
                    {e.preparation_level && (
                      <div className="mb-2">
                        <span className="text-muted-tf small d-block">Preparación</span>
                        <span className="fw-medium text-white">{e.preparation_level}</span>
                      </div>
                    )}
                  </div>
                  <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm flex-grow-1"
                      onClick={() => handleEdit(e)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(e.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Evaluations;
