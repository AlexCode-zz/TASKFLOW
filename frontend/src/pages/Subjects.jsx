import { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#6366f1'];

const emptyForm = {
  name: '',
  code: '',
  teacher: '',
  description: '',
  color: '#6366f1',
  credits: '',
};

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/subjects/');
      setSubjects(response.data);
    } catch {
      setError('No se pudieron cargar las materias.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code || null,
        teacher: form.teacher || null,
        description: form.description || null,
        color: form.color || '#6366f1',
        credits: form.credits ? Number(form.credits) : null,
      };
      if (editingId) {
        await api.put(`/subjects/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/subjects/', payload);
      }
      setForm(emptyForm);
      await loadSubjects();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar la materia.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta materia?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      await loadSubjects();
    } catch {
      setError('No se pudo eliminar la materia.');
    }
  };

  const handleEdit = (subject) => {
    setForm({
      name: subject.name || '',
      code: subject.code || '',
      teacher: subject.teacher || '',
      description: subject.description || '',
      color: subject.color || '#6366f1',
      credits: subject.credits ? String(subject.credits) : '',
    });
    setEditingId(subject.id);
  };

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fade-in">
      {error && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <span>{error}</span>
            <button type="button" className="btn btn-outline-light btn-sm" onClick={loadSubjects}>
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
        title="Materias"
        description="Administra tus materias académicas."
        actions={
          <Button variant="primary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
            + Nueva materia
          </Button>
        }
      />

      <div className="card border-secondary shadow-sm mb-4">
        <div className="card-header bg-transparent border-secondary">
          <h6 className="fw-semibold mb-0">{editingId ? 'Editar materia' : 'Nueva materia'}</h6>
        </div>
        <div className="card-body p-3">
          <form onSubmit={handleSave}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label text-muted-tf small">Nombre <span className="text-danger">*</span></label>
                <input
                  type="text"
                  required
                  className="form-control bg-surface border-secondary text-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Cálculo Diferencial"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Código</label>
                <input
                  type="text"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="MAT-101"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Docente</label>
                <input
                  type="text"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  placeholder="Dra. Elena Rodríguez"
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Créditos</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                  placeholder="4"
                />
              </div>
              <div className="col-12">
                <label className="form-label text-muted-tf small">Descripción</label>
                <textarea
                  className="form-control bg-surface border-secondary text-white"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción opcional"
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small">Color</label>
                <div className="d-flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`btn btn-sm p-0 rounded-circle border ${form.color === c ? 'border-white' : ''}`}
                      style={{ backgroundColor: c, width: '30px', height: '30px' }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>
              <div className="col-12 d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar materia' : 'Agregar materia'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-4">
          <div className="input-group">
            <span className="input-group-text bg-surface border-secondary text-white">🔍</span>
            <input
              type="text"
              className="form-control bg-surface border-secondary text-white"
              placeholder="Buscar materia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="fade-in">
          <Skeleton lines={5} />
        </div>
      ) : filtered.length > 0 ? (
        <div className="row g-4">
          {filtered.map((subject) => (
            <div key={subject.id} className="col-12 col-sm-6 col-lg-4">
              <div className="card border-secondary shadow-sm h-100">
                <div className="card-body p-3">
                  <div className="d-flex align-items-start mb-2">
                    <span className="subject-badge me-3" style={{ backgroundColor: subject.color }} />
                    <div className="flex-grow-1">
                      <h6 className="fw-semibold mb-1">{subject.name}</h6>
                      <span className="badge bg-dark text-white small">{subject.code || 'Sin código'}</span>
                    </div>
                  </div>
                  <div className="text-muted-tf small mb-2">{subject.teacher || 'Sin docente'}</div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted-tf small">Créditos</span>
                    <span className="fw-semibold text-white">{subject.credits || '—'}</span>
                  </div>
                </div>
                <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm flex-grow-1"
                    onClick={() => handleEdit(subject)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(subject.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📚"
          title={search ? 'No se encontraron materias' : 'Aún no tienes materias'}
          message={search ? 'Intenta con otro término de búsqueda.' : 'Registra tu primera materia para comenzar.'}
          actionLabel={search ? null : 'Agregar materia'}
          onAction={search ? null : () => { setEditingId(null); setForm(emptyForm); }}
        />
      )}
    </div>
  );
};

export default Subjects;
