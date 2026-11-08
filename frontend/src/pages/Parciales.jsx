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

const initialForm = {
  subject_id: '',
  title: '',
  evaluation_type: 'parcial',
  date: '',
  start_time: '',
  end_time: '',
  weight_percentage: '',
  grade: '',
  description: '',
  topics: '',
  preparation_level: 'no_iniciado',
  status: 'pendiente',
};

const Parciales = () => {
  const [parciales, setParciales] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [eRes, subRes] = await Promise.all([
        api.get('/evaluations/'),
        api.get('/subjects/'),
      ]);
      setParciales(eRes.data);
      setSubjects(subRes.data);
    } catch {
      setError('No se pudieron cargar los datos.');
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
      if (payload.grade === '') payload.grade = null;
      if (payload.grade !== null) payload.grade = Number(payload.grade);
      if (payload.subject_id !== '') payload.subject_id = Number(payload.subject_id);
      if (editingId) {
        await api.put(`/evaluations/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/evaluations/', payload);
      }
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar el parcial.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este parcial?')) return;
    try {
      await api.delete(`/evaluations/${id}`);
      await loadData();
    } catch {
      setError('No se pudo eliminar el parcial.');
    }
  };

  const handleEdit = (item) => {
    setForm({
      subject_id: item.subject_id,
      title: item.title,
      evaluation_type: item.evaluation_type,
      date: item.date || '',
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      weight_percentage: item.weight_percentage ?? '',
      grade: item.grade ?? '',
      description: item.description || '',
      topics: item.topics || '',
      preparation_level: item.preparation_level || 'no_iniciado',
      status: item.status || 'pendiente',
    });
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
        title="Parciales"
        description="Exámenes parciales, quizzes y evaluaciones calificadas de tus materias."
        actions={
          <Button onClick={() => { setEditingId(null); setForm(initialForm); }}>Registrar parcial</Button>
        }
      />

      <div className="card border-secondary shadow-sm mb-4">
        <div className="card-header bg-transparent border-secondary">
          <h6 className="fw-semibold mb-0">{editingId ? 'Editar parcial' : 'Nuevo parcial'}</h6>
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
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Hora inicio</label>
                <input
                  type="time"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-2">
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
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Nota</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="col-12 col-md-2">
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
              <div className="col-12 col-md-2">
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
                <Button type="submit" variant="primary">
                  {editingId ? 'Actualizar parcial' : 'Registrar parcial'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(initialForm); }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <h6 className="fw-semibold text-white mb-3">Parciales registrados</h6>
      {parciales.length === 0 ? (
        <EmptyState
          icon={<i className="bi bi-clipboard2" aria-hidden="true" />}
          title="Aún no tienes parciales"
          message="Registra tu primer parcial para comenzar."
          actionLabel="Registrar parcial"
          onAction={() => { setEditingId(null); setForm(initialForm); }}
        />
      ) : (
        <div className="row g-3">
          {parciales.map((e) => {
            const subject = subjects.find((s) => s.id === e.subject_id);
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
                    {e.grade && (
                      <div className="mb-2">
                        <span className="text-muted-tf small d-block">Nota</span>
                        <span className="fw-medium text-white">{Number(e.grade).toFixed(1)}</span>
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
                    <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => handleEdit(e)}>
                      Editar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(e.id)}>
                      Eliminar
                    </Button>
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

export default Parciales;
