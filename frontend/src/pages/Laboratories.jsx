import { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';

const initialForm = {
  subject_id: '',
  title: '',
  date: '',
  start_time: '08:00',
  end_time: '10:00',
  location: '',
  description: '',
  materials: '',
  weight_percentage: '',
  grade: '',
  status: 'pendiente',
};

const Laboratories = () => {
  const [laboratories, setLaboratories] = useState([]);
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
        await api.put(`/laboratories/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/laboratories/', payload);
      }
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar el laboratorio.');
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

  const handleEdit = (lab) => {
    setForm({
      subject_id: lab.subject_id,
      title: lab.title,
      date: lab.date || '',
      start_time: lab.start_time || '08:00',
      end_time: lab.end_time || '10:00',
      location: lab.location || '',
      description: lab.description || '',
      materials: lab.materials || '',
      weight_percentage: lab.weight_percentage ?? '',
      grade: lab.grade ?? '',
      status: lab.status || 'pendiente',
    });
    setEditingId(lab.id);
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
          <Button onClick={() => { setEditingId(null); setForm(initialForm); }}>Agregar laboratorio</Button>
        }
      />

      <div className="card border-secondary shadow-sm mb-4">
        <div className="card-header bg-transparent border-secondary">
          <h6 className="fw-semibold mb-0">{editingId ? 'Editar laboratorio' : 'Nuevo laboratorio'}</h6>
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
                  placeholder="Laboratorio de óptica"
                />
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
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Ubicación</label>
                <input
                  type="text"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Lab F-301"
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
              <div className="col-12">
                <label className="form-label text-muted-tf small">Descripción</label>
                <textarea
                  className="form-control bg-surface border-secondary text-white"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción del laboratorio"
                />
              </div>
              <div className="col-12">
                <label className="form-label text-muted-tf small">Materiales necesarios</label>
                <textarea
                  className="form-control bg-surface border-secondary text-white"
                  rows="2"
                  value={form.materials}
                  onChange={(e) => setForm({ ...form, materials: e.target.value })}
                  placeholder="Materiales opcionales"
                />
              </div>
              <div className="col-12 d-flex gap-2 mt-3">
                <Button type="submit" variant="primary">
                  {editingId ? 'Actualizar laboratorio' : 'Registrar laboratorio'}
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

      <h6 className="fw-semibold text-white mb-3">Laboratorios por materia</h6>
      {laboratories.length === 0 ? (
        <EmptyState
          icon={<i className="bi bi-flask" aria-hidden="true" />}
          title="Aún no tienes laboratorios"
          message="Registra tu primera sesión de laboratorio para comenzar."
          actionLabel="Agregar laboratorio"
          onAction={() => { setEditingId(null); setForm(initialForm); }}
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<i className="bi bi-flask" aria-hidden="true" />}
          title="Sin laboratorios"
          message="Registra laboratorios para tus materias."
        />
      ) : (
        grouped.map(({ subject, labs }) => (
          <div key={subject.id} className="mb-4">
            <h6 className="fw-semibold text-white mb-2">{subject.name}</h6>
            <div className="row g-3">
              {labs.map((l) => (
                <div key={l.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card border-secondary shadow-sm h-100">
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
                      {l.grade && (
                        <div className="mb-2">
                          <span className="text-muted-tf small d-block">Nota</span>
                          <span className="fw-medium text-white">{Number(l.grade).toFixed(1)}</span>
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
                      <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => handleEdit(l)}>
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
        ))
      )}
    </div>
  );
};

export default Laboratories;
