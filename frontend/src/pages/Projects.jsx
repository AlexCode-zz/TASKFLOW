import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PriorityBadge from '../components/common/PriorityBadge';
import StatusBadge from '../components/common/StatusBadge';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    subject_id: '',
    name: '',
    description: '',
    start_date: '',
    due_date: '',
    priority: 'media',
    status: 'pendiente',
    progress_percentage: 0,
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pRes, subRes] = await Promise.all([
        api.get('/projects/'),
        api.get('/subjects/'),
      ]);
      setProjects(pRes.data);
      setSubjects(subRes.data);
    } catch (err) {
      setError('No se pudieron cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      await api.post('/projects/', form);
      setForm({
        subject_id: '',
        name: '',
        description: '',
        start_date: '',
        due_date: '',
        priority: 'media',
        status: 'pendiente',
        progress_percentage: 0,
      });
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar el proyecto.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este proyecto?')) return;
    try {
      await api.delete(`/projects/${id}`);
      await loadData();
    } catch (err) {
      setError('No se pudo eliminar el proyecto.');
    }
  };

  const handleEdit = (project) => {
    setForm({ ...project });
    setEditingId(project.id);
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

  return (
    <div className="fade-in">
      {error && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          {error}
        </div>
      )}
      {saveError && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          {saveError}
        </div>
      )}
      <header className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="fw-bold mb-1">Proyectos</h1>
          <p className="text-muted-tf mb-0">Gestiona tus proyectos académicos.</p>
        </div>
        <Link to="/" className="btn btn-outline-secondary btn-sm">
          ← Volver a Mi semana
        </Link>
      </header>

      <div className="card border-secondary shadow-sm mb-4">
        <div className="card-header bg-transparent border-secondary">
          <h6 className="fw-semibold mb-0">Nuevo proyecto</h6>
        </div>
        <div className="card-body p-3">
          <form onSubmit={handleSave}>
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Materia (opcional)</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">Sin materia asignada</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'sin código'})</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Nombre <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Proyecto Compilador"
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Fecha inicio</label>
                <input
                  type="date"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Fecha entrega</label>
                <input
                  type="date"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Prioridad</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label text-muted-tf small">Descripción</label>
                <textarea
                  className="form-control bg-surface border-secondary text-white"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción del proyecto"
                />
              </div>
              <div className="col-12 d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary">Registrar proyecto</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <h6 className="fw-semibold text-white mb-3">Proyectos registrados</h6>
      {projects.length === 0 ? (
        <div className="text-muted-tf text-center py-4">
          No hay proyectos registrados.
        </div>
      ) : (
        <div className="row g-3">
          {projects.map((p) => {
            const subject = subjects.find((sub) => sub.id === p.subject_id);
            return (
              <div key={p.id} className="col-12 col-md-6 col-lg-4">
                <div className="card border-secondary shadow-sm h-100">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-semibold mb-0">{p.name}</h6>
                      <PriorityBadge priority={p.priority} />
                    </div>
                    <div className="mb-2">
                      <span className="badge bg-dark text-white small me-2">{subject?.code || ''}</span>
                      <span className="badge bg-dark text-white small">{p.status}</span>
                    </div>
                    <div className="text-muted-tf small mb-2">{subject ? subject.name : 'Sin materia'}</div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted-tf small">Inicio</span>
                      <span className="text-muted-tf small">{p.start_date}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted-tf small">Entrega</span>
                      <span className="text-muted-tf small">{p.due_date}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-muted-tf small d-block">Avance</span>
                      <div className="progress bg-secondary" style={{ height: '6px' }}>
                        <div
                          className="progress-bar"
                          style={{ width: `${p.progress_percentage}%`, backgroundColor: '#3b82f6' }}
                          role="progressbar"
                        />
                      </div>
                      <span className="text-muted-tf small">{p.progress_percentage}%</span>
                    </div>
                  </div>
                  <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleEdit(p)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(p.id)}
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

export default Projects;
