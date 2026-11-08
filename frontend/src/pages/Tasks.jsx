import { useState, useEffect } from 'react';
import api from '../services/api';
import PriorityBadge from '../components/common/PriorityBadge';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    subject_id: '',
    title: '',
    description: '',
    assigned_date: '',
    due_date: '',
    due_time: '',
    priority: 'media',
    status: 'pendiente',
    estimated_minutes: '',
    observations: '',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tRes, subRes] = await Promise.all([
        api.get('/tasks/'),
        api.get('/subjects/'),
      ]);
      setTasks(tRes.data);
      setSubjects(subRes.data);
    } catch {
      setError('No se puderon cargar las tareas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      const payload = { ...form };
      if (payload.assigned_date === '') payload.assigned_date = null;
      if (payload.due_date === '') payload.due_date = null;
      if (payload.due_time === '') payload.due_time = null;
      if (payload.estimated_minutes === '') payload.estimated_minutes = null;
      if (payload.estimated_minutes !== null) payload.estimated_minutes = Number(payload.estimated_minutes);
      if (payload.subject_id !== '' && payload.subject_id !== null) payload.subject_id = Number(payload.subject_id);
      if (editingId) {
        await api.put(`/tasks/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/tasks/', payload);
      }
      setForm({
        subject_id: '',
        title: '',
        description: '',
        assigned_date: '',
        due_date: '',
        due_time: '',
        priority: 'media',
        status: 'pendiente',
        estimated_minutes: '',
        observations: '',
      });
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar la tarea.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      await loadData();
    } catch {
      setError('No se pudo eliminar la tarea.');
    }
  };

  const handleEdit = (task) => {
    setForm({ ...task });
    setEditingId(task.id);
  };

  const toggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completada' ? 'pendiente' : 'completada';
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      await loadData();
    } catch {
      setError('No se pudo actualizar el estado de la tarea.');
    }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

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
      <PageHeader title="Tareas y proyectos" description="Organiza tus actividades académicas." />

      <div className="card border-secondary shadow-sm mb-4">
        <div className="card-header bg-transparent border-secondary">
          <h6 className="fw-semibold mb-0">{editingId ? 'Editar tarea' : 'Nueva tarea'}</h6>
        </div>
        <div className="card-body p-3">
          <form onSubmit={handleSave}>
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Materia <span className="text-danger">*</span></label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: parseInt(e.target.value) })}
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
                  className="form-control bg-surface border-secondary text-white"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Problemas de límites"
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Fecha entrega <span className="text-danger">*</span></label>
                <input
                  type="date"
                  required
                  className="form-control bg-surface border-secondary text-white"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Hora entrega</label>
                <input
                  type="time"
                  className="form-control bg-surface border-secondary text-white"
                  value={form.due_time}
                  onChange={(e) => setForm({ ...form, due_time: e.target.value })}
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
              <div className="col-12 col-md-3">
                <label className="form-label text-muted-tf small">Estado</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="completada">Completada</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label text-muted-tf small">Descripción</label>
                <textarea
                  className="form-control bg-surface border-secondary text-white"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción de la tarea"
                />
              </div>
              <div className="col-12 d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar tarea' : 'Registrar tarea'}
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
              <div className="text-muted-tf small mb-1">Total tareas</div>
              <div className="fw-bold text-white">{tasks.length}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Pendientes</div>
              <div className="fw-bold text-white">
                {tasks.filter((t) => t.status === 'pendiente').length}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Completadas</div>
              <div className="fw-bold text-white">
                {tasks.filter((t) => t.status === 'completada').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="btn-group" role="group">
            {['all', 'pendiente', 'en_progreso', 'completada'].map((f) => (
              <button
                key={f}
                type="button"
                className={`btn btn-outline-primary btn-sm ${filter === f ? 'bg-primary text-white border-primary' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Todas' : f === 'pendiente' ? 'Pendientes' : f === 'en_progreso' ? 'En progreso' : 'Completadas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h6 className="fw-semibold text-white mb-3">Tareas registradas</h6>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<i className="bi bi-check2-circle" aria-hidden="true" />}
          title="Aún no tienes tareas"
          message="Registra tu primera tarea pendiente para comenzar a organizar tu semana."
          actionLabel="Crear tarea"
          onAction={() => setEditingId(null)}
        />
      ) : (
        <div className="row g-3">
          {filtered.map((t) => {
            const subject = subjects.find((sub) => sub.id === t.subject_id);
            return (
              <div key={t.id} className="col-12 col-md-6 col-lg-4">
                <div className="card border-secondary shadow-sm h-100 task-card">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-semibold mb-0">{t.title}</h6>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="mb-2">
                      <span className="badge bg-dark text-white small me-2">{subject?.code || ''}</span>
                      <span className="badge bg-dark text-white small">{t.due_date}</span>
                    </div>
                    <div className="text-muted-tf small mb-2">{subject ? subject.name : 'Materia'}</div>
                    <p className="text-muted-tf small mb-3">{t.description}</p>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <StatusBadge status={t.status} />
                      {t.estimated_minutes && (
                        <span className="text-muted-tf small">{t.estimated_minutes} min estimados</span>
                      )}
                    </div>
                    <div className="progress bg-secondary" style={{ height: '6px' }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: t.status === 'completada' ? '100%' : '0%',
                          backgroundColor: '#10b981',
                        }}
                        role="progressbar"
                      />
                    </div>
                  </div>
                  <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm flex-grow-1"
                      onClick={() => toggleComplete(t)}
                    >
                      {t.status === 'completada' ? 'Marcar pendiente' : 'Marcar completada'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleEdit(t)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(t.id)}
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

export default Tasks;
