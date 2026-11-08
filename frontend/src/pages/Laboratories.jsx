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

const Laboratories = () => {
  const [laboratories, setLaboratories] = useState([]);
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
      const [lRes, subRes] = await Promise.all([
        api.get('/laboratories/'),
        api.get('/subjects/'),
      ]);
      setLaboratories(lRes.data);
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

  const openEdit = (lab) => {
    setEditingId(lab.id);
    setForm({
      subject_id: lab.subject_id ? String(lab.subject_id) : '',
      title: lab.title || '',
      date: lab.date || '',
      status: lab.status || 'pendiente',
      weight_percentage: lab.weight_percentage ?? '',
      grade: lab.grade ?? '',
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
        title: form.title || null,
        date: form.date || null,
        status: form.status,
        weight_percentage: form.weight_percentage === '' ? null : Number(form.weight_percentage),
        grade: form.grade === '' ? null : Number(form.grade),
      };
      if (editingId) {
        await api.put(`/laboratories/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/laboratories/', payload);
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar el laboratorio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este laboratorio?')) return;
    try {
      await api.delete(`/laboratories/${id}`);
      await loadData();
    } catch {
      setError('No se pudo eliminar el laboratorio.');
    }
  };

  const grouped = subjects
    .map((subject) => ({
      subject,
      labs: laboratories.filter((l) => l.subject_id === subject.id),
    }))
    .filter((group) => group.labs.length > 0);

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
        title="Laboratorios"
        description="Sesiones de laboratorio y prácticas de tus materias."
        actions={
          laboratories.length > 0 ? (
            <Button variant="primary" onClick={openCreate}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Agregar laboratorio
            </Button>
          ) : null
        }
      />

      {formOpen ? (
        <Modal
          open={formOpen}
          title={editingId ? 'Editar laboratorio' : 'Nuevo laboratorio'}
          onClose={closeForm}
          footer={
            <>
              <Button variant="secondary" onClick={closeForm} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" form="laboratory-form" loading={saving}>
                {editingId ? 'Actualizar laboratorio' : 'Registrar laboratorio'}
              </Button>
            </>
          }
        >
          <form id="laboratory-form" onSubmit={handleSave}>
            {saveError && (
              <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
                {saveError}
              </div>
            )}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small" htmlFor="laboratory-subject">
                  Materia <span className="text-danger">*</span>
                </label>
                <select
                  id="laboratory-subject"
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
                <label className="form-label text-muted-tf small" htmlFor="laboratory-title">Título</label>
                <input
                  id="laboratory-title"
                  type="text"
                  maxLength={150}
                  className="form-control bg-surface border-secondary text-white"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Laboratorio de óptica"
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
      ) : laboratories.length === 0 ? (
        <EmptyState
          icon={<i className="bi bi-flask" aria-hidden="true" />}
          title="Aún no tienes laboratorios"
          message="Registra tu primera sesión de laboratorio para comenzar."
          actionLabel="Agregar laboratorio"
          onAction={openCreate}
        />
      ) : (
        <>
          <h6 className="fw-semibold text-white mb-3">Laboratorios por materia</h6>
          {grouped.map(({ subject, labs }) => (
            <div key={subject.id} className="mb-4">
              <h6 className="fw-semibold text-white mb-2">{subject.name}</h6>
              <div className="row g-3">
                {labs.map((l) => (
                  <div key={l.id} className="col-12 col-md-6 col-lg-4">
                    <div
                      className="card border-secondary shadow-sm h-100"
                      style={{ backgroundColor: subject.color }}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="fw-semibold mb-0">{l.title}</h6>
                          <StatusBadge status={l.status} />
                        </div>
                        <div className="text-muted-tf small mb-2">{subject.code || ''}</div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted-tf small">{l.date}</span>
                          <span className="text-muted-tf small">{l.start_time} - {l.end_time}</span>
                        </div>
                        {l.location && <div className="text-muted-tf small mb-2">{l.location}</div>}
                        {l.grade !== null && l.grade !== undefined && (
                          <div className="d-flex justify-content-end mb-2">
                            <span
                              className="fw-bold lab-grade"
                              data-testid="lab-grade"
                              style={{
                                fontSize: '2rem',
                                lineHeight: '1.2',
                                color: Number(l.grade) <= 6 ? '#ff4d4f' : '#ffffff',
                                textShadow:
                                  Number(l.grade) <= 6
                                    ? '0 0 14px rgba(255, 77, 79, 0.95)'
                                    : '0 0 14px rgba(255, 255, 255, 0.95)',
                              }}
                            >
                              {Number(l.grade).toFixed(1)}
                            </span>
                          </div>
                        )}
                        {l.weight_percentage && (
                          <div className="mb-2">
                            <span className="text-muted-tf small d-block">Peso</span>
                            <span className="fw-medium text-white">{Number(l.weight_percentage)}%</span>
                          </div>
                        )}
                        {l.description && <div className="text-muted-tf small">{l.description}</div>}
                      </div>
                      <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                        <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => openEdit(l)}>
                          Editar
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(l.id)}>
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

export default Laboratories;
