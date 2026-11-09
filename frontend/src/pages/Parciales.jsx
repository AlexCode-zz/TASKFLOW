import { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const initialForm = {
  subject_id: '',
  title: '',
  date: '',
  status: 'pendiente',
  weight_percentage: '',
  grade: '',
};

const Parciales = () => {
  const [parciales, setParciales] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
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
      setParciales(eRes.data.filter((e) => e.evaluation_type === 'parcial'));
      setSubjects(subRes.data);
    } catch {
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setSaveError('');
    setFormOpen(true);
  };

  const openEdit = (parcial) => {
    setEditingId(parcial.id);
    setForm({
      subject_id: parcial.subject_id ? String(parcial.subject_id) : '',
      title: parcial.title || '',
      date: parcial.date || '',
      status: parcial.status || 'pendiente',
      weight_percentage: parcial.weight_percentage ?? '',
      grade: parcial.grade ?? '',
    });
    setSaveError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setSaveError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const payload = {
        subject_id: form.subject_id ? Number(form.subject_id) : null,
        title: form.title,
        date: form.date || null,
        status: form.status,
        weight_percentage: form.weight_percentage === '' ? null : Number(form.weight_percentage),
        grade: form.grade === '' ? null : Number(form.grade),
      };
      if (editingId) {
        await api.put(`/evaluations/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/evaluations/', { ...payload, evaluation_type: 'parcial' });
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar el parcial.');
    } finally {
      setSaving(false);
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

  const grouped = subjects
    .map((subject) => ({
      subject,
      parciales: parciales.filter((p) => p.subject_id === subject.id),
    }))
    .filter((group) => group.parciales.length > 0);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
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
        description="Exámenes parciales de tus materias."
        actions={
          parciales.length > 0 ? (
            <Button variant="primary" onClick={openCreate}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Agregar parcial
            </Button>
          ) : null
        }
      />

      {formOpen ? (
        <Modal
          open={formOpen}
          title={editingId ? 'Editar parcial' : 'Nuevo parcial'}
          onClose={closeForm}
          footer={
            <>
              <Button variant="secondary" onClick={closeForm} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" form="parcial-form" loading={saving}>
                {editingId ? 'Actualizar parcial' : 'Registrar parcial'}
              </Button>
            </>
          }
        >
          <form id="parcial-form" onSubmit={handleSave}>
            {saveError && (
              <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
                {saveError}
              </div>
            )}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small" htmlFor="parcial-subject">
                  Materia <span className="text-danger">*</span>
                </label>
                <select
                  id="parcial-subject"
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
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small" htmlFor="parcial-title">
                  Título <span className="text-danger">*</span>
                </label>
                <input
                  id="parcial-title"
                  type="text"
                  required
                  maxLength={150}
                  className="form-control bg-surface border-secondary text-white"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Parcial 1"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Fecha</label>
                <input
                  type="date"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
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
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Peso (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.weight_percentage}
                  onChange={(e) => setForm({ ...form, weight_percentage: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="col-12 col-md-3">
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
            </div>
          </form>
        </Modal>
      ) : parciales.length === 0 ? (
        <EmptyState
          icon={<i className="bi bi-clipboard2" aria-hidden="true" />}
          title="Aún no tienes parciales"
          message="Registra tu primer parcial para comenzar."
          actionLabel="Agregar parcial"
          onAction={openCreate}
        />
      ) : (
        <>
          <h6 className="fw-semibold text-white mb-3">Parciales por materia</h6>
          {grouped.map(({ subject, parciales: subjectParciales }) => (
            <div key={subject.id} className="mb-4">
              <h6 className="fw-semibold text-white mb-2">{subject.name}</h6>
              <div className="row g-3">
                {subjectParciales.map((p) => (
                  <div key={p.id} className="col-12 col-md-6 col-lg-4">
                    <div
                      className="card parcial-card shadow-sm h-100"
                      style={{
                        borderColor: subject.color,
                        borderWidth: '2px',
                        borderStyle: 'solid',
                      }}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="fw-semibold mb-0">{p.title}</h6>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="text-muted-tf small mb-2">{subject.code || ''}</div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted-tf small">{p.date || 'Sin fecha'}</span>
                          {p.start_time && <span className="text-muted-tf small">{p.start_time}</span>}
                        </div>
                        {p.grade !== null && p.grade !== undefined && (
                          <div className="d-flex justify-content-end mb-2">
                            <span
                              className="fw-bold parcial-grade"
                              data-testid="parcial-grade"
                              style={{
                                fontSize: '2rem',
                                lineHeight: '1.2',
                                color: Number(p.grade) <= 6 ? '#ff4d4f' : '#ffffff',
                                textShadow:
                                  Number(p.grade) <= 6
                                    ? '0 0 14px rgba(255, 77, 79, 0.95)'
                                    : '0 0 14px rgba(255, 255, 255, 0.95)',
                              }}
                            >
                              {Number(p.grade).toFixed(1)}
                            </span>
                          </div>
                        )}
                        {p.weight_percentage && (
                          <div className="mb-2">
                            <span className="text-muted-tf small d-block">Peso</span>
                            <span className="fw-medium text-white">{Number(p.weight_percentage)}%</span>
                          </div>
                        )}
                        {p.topics && <div className="text-muted-tf small">{p.topics}</div>}
                      </div>
                      <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                        <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => openEdit(p)}>
                          Editar
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Parciales;
