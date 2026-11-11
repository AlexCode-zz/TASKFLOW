import { useState, useEffect } from 'react';
import api from '../services/api';
import PriorityBadge from '../components/common/PriorityBadge';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const initialTaskForm = {
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
};

const initialProjectForm = {
  subject_id: '',
  name: '',
  description: '',
  start_date: '',
  due_date: '',
  priority: 'media',
  status: 'pendiente',
  progress_percentage: 0,
};

const initialQuickAdd = { title: '', due_date: '', subject_id: '' };

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState('all');
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [taskDrafts, setTaskDrafts] = useState({});

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(initialQuickAdd);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tRes, pRes, subRes] = await Promise.all([
        api.get('/tasks/'),
        api.get('/projects/'),
        api.get('/subjects/'),
      ]);
      setTasks(tRes.data);
      setProjects(pRes.data);
      setSubjects(subRes.data);
    } catch {
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      const payload = { ...taskForm };
      if (payload.subject_id === '') payload.subject_id = null;
      if (payload.subject_id !== null) payload.subject_id = Number(payload.subject_id);
      if (payload.due_date === '') payload.due_date = null;
      if (payload.due_time === '') payload.due_time = null;
      if (payload.estimated_minutes === '') payload.estimated_minutes = null;
      if (payload.estimated_minutes !== null) payload.estimated_minutes = Number(payload.estimated_minutes);
      if (editingTaskId) {
        await api.put(`/tasks/${editingTaskId}`, payload);
        setEditingTaskId(null);
      }
      setTaskForm(initialTaskForm);
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar la tarea.');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      await loadData();
    } catch {
      setError('No se pudo eliminar la tarea.');
    }
  };

  const handleEditTask = (task) => {
    setTaskForm({
      subject_id: task.subject_id ? String(task.subject_id) : '',
      title: task.title,
      description: task.description || '',
      assigned_date: task.assigned_date || '',
      due_date: task.due_date || '',
      due_time: task.due_time || '',
      priority: task.priority || 'media',
      status: task.status || 'pendiente',
      estimated_minutes: task.estimated_minutes ?? '',
      observations: task.observations || '',
    });
    setEditingTaskId(task.id);
  };

  const toggleTask = async (task) => {
    const newStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      await loadData();
    } catch {
      setError('No se pudo actualizar el estado de la tarea.');
    }
  };

  const submitQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAdd.title) return;
    setSaving(true);
    try {
      await addTask({
        subject_id: quickAdd.subject_id || null,
        project_id: null,
        title: quickAdd.title,
        due_date: quickAdd.due_date || null,
        status: 'pendiente',
        priority: 'media',
      });
      setQuickAdd(initialQuickAdd);
      setQuickAddOpen(false);
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al agregar la tarea.');
    } finally {
      setSaving(false);
    }
  };

  const addTaskToProject = async (project, taskData) => {
    setSaving(true);
    try {
      await addTask({
        subject_id: project.subject_id || null,
        project_id: project.id,
        title: taskData.title,
        due_date: taskData.due_date || null,
        status: taskData.status || 'pendiente',
        priority: taskData.priority || 'media',
      });
      setTaskDrafts((prev) => ({ ...prev, [project.id]: { title: '', due_date: '' } }));
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al agregar la tarea.');
    } finally {
      setSaving(false);
    }
  };

  const saveProject = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      const payload = {
        subject_id: projectForm.subject_id ? Number(projectForm.subject_id) : null,
        name: projectForm.name.trim(),
        description: projectForm.description || null,
        start_date: projectForm.start_date || null,
        due_date: projectForm.due_date || null,
        priority: projectForm.priority || 'media',
        status: projectForm.status || 'pendiente',
        progress_percentage: Number(projectForm.progress_percentage) || 0,
      };
      if (editingProjectId) {
        await api.put(`/projects/${editingProjectId}`, payload);
        setEditingProjectId(null);
      } else {
        await api.post('/projects/', payload);
        setProjectFormOpen(false);
      }
      setProjectForm(initialProjectForm);
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar el proyecto.');
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este proyecto?')) return;
    try {
      await api.delete(`/projects/${id}`);
      if (expandedProjectId === id) setExpandedProjectId(null);
      await loadData();
    } catch {
      setError('No se pudo eliminar el proyecto.');
    }
  };

  const openProjectCreate = () => {
    setEditingProjectId(null);
    setProjectForm(initialProjectForm);
    setSaveError('');
    setProjectFormOpen(true);
  };

  const openProjectEdit = (project) => {
    setEditingProjectId(project.id);
    setProjectForm({
      subject_id: project.subject_id ? String(project.subject_id) : '',
      name: project.name || '',
      description: project.description || '',
      start_date: project.start_date || '',
      due_date: project.due_date || '',
      priority: project.priority || 'media',
      status: project.status || 'pendiente',
      progress_percentage: project.progress_percentage ?? 0,
    });
    setSaveError('');
    setProjectFormOpen(true);
  };

  const closeProjectForm = () => {
    if (saving) return;
    setProjectFormOpen(false);
    setEditingProjectId(null);
    setProjectForm(initialProjectForm);
    setSaveError('');
  };

  const addTask = async (taskData) => {
    const payload = {
      subject_id: taskData.subject_id || null,
      project_id: taskData.project_id || null,
      title: taskData.title,
      status: taskData.status || 'pendiente',
      due_date: taskData.due_date || null,
      priority: taskData.priority || 'media',
    };
    const resp = await api.post('/tasks/', payload);
    return resp.data;
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

  const standaloneTasks = tasks.filter((t) => !t.project_id);
  const filteredTasks = filter === 'all' ? standaloneTasks : standaloneTasks.filter((t) => t.status === filter);
  const stats = {
    total: standaloneTasks.length,
    pending: standaloneTasks.filter((t) => t.status === 'pendiente').length,
    completed: standaloneTasks.filter((t) => t.status === 'completada').length,
  };

  const projectTasks = (projectId) => tasks.filter((t) => t.project_id === projectId);
  const projectProgress = (project) => {
    const list = projectTasks(project.id);
    const completed = list.filter((t) => t.status === 'completada').length;
    const percent = list.length > 0 ? Math.round((completed / list.length) * 100) : 0;
    const status =
      list.length === 0
        ? project.status || 'pendiente'
        : completed === list.length
          ? 'completada'
          : completed > 0
            ? 'en_progreso'
            : 'pendiente';
    return { list, completed, percent, status };
  };

  const renderTaskCard = (t) => {
    const subject = subjects.find((s) => s.id === t.subject_id);
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
              <span className="badge bg-dark text-white small">{t.due_date || 'Sin fecha'}</span>
              {!t.project_id && <span className="badge bg-dark text-white small">Sin proyecto</span>}
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
              onClick={() => toggleTask(t)}
            >
              {t.status === 'completada' ? 'Marcar pendiente' : 'Marcar completada'}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => handleEditTask(t)}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => handleDeleteTask(t.id)}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  };

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
        title="Tareas y proyectos"
        description="Organiza tus actividades académicas."
        actions={
          <Button variant="primary" onClick={openProjectCreate}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true" />
            Agregar proyecto
          </Button>
        }
      />

      {editingTaskId && (
        <div className="card border-secondary shadow-sm mb-4">
          <div className="card-header bg-transparent border-secondary">
            <h6 className="fw-semibold mb-0">Editar tarea</h6>
          </div>
          <div className="card-body p-3">
            <form onSubmit={handleTaskSave}>
              <div className="row g-3">
                <div className="col-12 col-md-3">
                  <label className="form-label text-muted-tf small">Materia</label>
                  <select
                    className="form-select bg-surface border-secondary text-white"
                    value={taskForm.subject_id}
                    onChange={(e) => setTaskForm({ ...taskForm, subject_id: e.target.value })}
                  >
                    <option value="">Sin materia</option>
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
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label text-muted-tf small">Fecha entrega</label>
                  <input
                    type="date"
                    className="form-control bg-surface border-secondary text-white"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label text-muted-tf small">Prioridad</label>
                  <select
                    className="form-select bg-surface border-secondary text-white"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
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
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
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
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>
                <div className="col-12 d-flex gap-2 mt-3">
                  <button type="submit" className="btn btn-primary">
                    {editingTaskId ? 'Actualizar tarea' : 'Guardar tarea'}
                  </button>
                  {editingTaskId && (
                    <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingTaskId(null); setTaskForm(initialTaskForm); }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <>
          <h6 className="fw-semibold text-white mb-3">Proyectos</h6>
          <div className="row g-3 mb-4">
            {projects.map((p) => {
              const subject = subjects.find((s) => s.id === p.subject_id);
              const { list, percent, status } = projectProgress(p);
              const expanded = expandedProjectId === p.id;
              return (
                <div
                  key={p.id}
                  className="col-12 col-md-6 col-lg-4"
                  onClick={() => setExpandedProjectId(expanded ? null : p.id)}
                >
                  <div
                    className="card border-secondary shadow-sm h-100"
                    style={{
                      borderColor: subject?.color || '#6c757d',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="fw-semibold mb-0">{p.name}</h6>
                        <StatusBadge status={status} />
                      </div>
                      <div className="mb-2">
                        <span className="badge bg-dark text-white small me-2">{subject?.code || ''}</span>
                        <span className="badge bg-dark text-white small">{subject ? subject.name : 'Sin materia'}</span>
                      </div>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-muted-tf small">Progreso</span>
                          <span className="text-white small fw-semibold">{percent}%</span>
                        </div>
                        <div className="progress bg-secondary" style={{ height: '6px' }}>
                          <div
                            className="progress-bar"
                            style={{ width: `${percent}%`, backgroundColor: '#10b981' }}
                            role="progressbar"
                          />
                        </div>
                      </div>
                      {expanded && (
                        <div className="border-top pt-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          {list.length === 0 ? (
                            <p className="text-muted-tf small mb-2">Sin tareas todavía. Agrega la primera.</p>
                          ) : (
                            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                            <ul className="list-unstyled mb-2">
                              {list.map((t) => (
                                <li
                                  key={t.id}
                                  className="d-flex justify-content-between align-items-center mb-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-white small text-truncate me-2">{t.title}</span>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted-tf small">{t.due_date || 'Sin fecha'}</span>
                                    <StatusBadge status={t.status} />
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => toggleTask(t)}
                                    >
                                      {t.status === 'completada' ? 'Deshacer' : 'Completar'}
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            </div>
                          )}
                          <form
                            className="d-flex gap-2"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!taskDrafts[p.id]?.title) return;
                              await addTaskToProject(p, taskDrafts[p.id]);
                            }}
                          >
                            <input
                              type="text"
                              className="form-control bg-surface border-secondary text-white"
                              placeholder="Nombre de la tarea"
                              value={taskDrafts[p.id]?.title || ''}
                              onChange={(e) => setTaskDrafts({ ...taskDrafts, [p.id]: { ...(taskDrafts[p.id] || {}), title: e.target.value } })}
                            />
                            <input
                              type="date"
                              className="form-control bg-surface border-secondary text-white"
                              value={taskDrafts[p.id]?.due_date || ''}
                              onChange={(e) => setTaskDrafts({ ...taskDrafts, [p.id]: { ...(taskDrafts[p.id] || {}), due_date: e.target.value } })}
                            />
                            <Button variant="primary" size="sm" disabled={saving} type="submit">
                              <i className="bi bi-plus-lg" aria-hidden="true" />
                              Agregar tarea
                            </Button>
                          </form>
                        </div>
                      )}
                    </div>
                    <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                      <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => openProjectEdit(p)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteProject(p.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Total tareas</div>
              <div className="fw-bold text-white">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Pendientes</div>
              <div className="fw-bold text-white">{stats.pending}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-secondary shadow-sm">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Completadas</div>
              <div className="fw-bold text-white">{stats.completed}</div>
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

      <div className="card border-secondary shadow-sm mb-4">
        <div className="card-header bg-transparent border-secondary">
          <h6 className="fw-semibold mb-0">Nueva tarea</h6>
        </div>
        <div className="card-body p-3">
          {!quickAddOpen ? (
            <div className="text-center py-2">
              <Button variant="outline" onClick={() => { setQuickAdd(initialQuickAdd); setQuickAddOpen(true); }}>
                <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                Agregar tarea
              </Button>
            </div>
          ) : (
            <form onSubmit={submitQuickAdd}>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label text-muted-tf small">Materia</label>
                  <select
                    className="form-select bg-surface border-secondary text-white"
                    value={quickAdd.subject_id}
                    onChange={(e) => setQuickAdd({ ...quickAdd, subject_id: e.target.value })}
                  >
                    <option value="">Sin materia</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code || 'sin código'})</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-5">
                  <label className="form-label text-muted-tf small">Nombre <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    required
                    className="form-control bg-surface border-secondary text-white"
                    placeholder="Nombre de la tarea"
                    value={quickAdd.title}
                    onChange={(e) => setQuickAdd({ ...quickAdd, title: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label text-muted-tf small">Fecha entrega</label>
                  <input
                    type="date"
                    className="form-control bg-surface border-secondary text-white"
                    value={quickAdd.due_date}
                    onChange={(e) => setQuickAdd({ ...quickAdd, due_date: e.target.value })}
                  />
                </div>
                <div className="col-12 d-flex gap-2 mt-3">
                  <Button type="submit" variant="primary" loading={saving}>
                    Agregar tarea
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => { setQuickAddOpen(false); setQuickAdd(initialQuickAdd); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<i className="bi bi-check2-circle" aria-hidden="true" />}
          title="Aún no tienes tareas"
          message="Registra tu primera tarea pendiente para comenzar a organizar tu semana."
          actionLabel="Agregar tarea"
          onAction={() => { setQuickAdd(initialQuickAdd); setQuickAddOpen(true); }}
        />
      ) : (
        <div className="row g-3">
          {filteredTasks.map(renderTaskCard)}
        </div>
      )}

      {projectFormOpen && (
        <Modal
          open={projectFormOpen}
          title={editingProjectId ? 'Editar proyecto' : 'Nuevo proyecto'}
          onClose={closeProjectForm}
          footer={
            <>
              <Button variant="secondary" onClick={closeProjectForm} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" form="project-form" loading={saving}>
                {editingProjectId ? 'Actualizar proyecto' : 'Registrar proyecto'}
              </Button>
            </>
          }
        >
          <form id="project-form" onSubmit={saveProject}>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small">Materia (opcional)</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={projectForm.subject_id}
                  onChange={(e) => setProjectForm({ ...projectForm, subject_id: e.target.value })}
                >
                  <option value="">Sin materia asignada</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'sin código'})</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small">Nombre <span className="text-danger">*</span></label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  className="form-control bg-surface border-secondary text-white"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Proyecto Compilador"
                />
              </div>
              <div className="col-12">
                <label className="form-label text-muted-tf small">Descripción</label>
                <textarea
                  className="form-control bg-surface border-secondary text-white"
                  rows="2"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small">Fecha inicio <span className="text-danger">*</span></label>
                <input
                  type="date"
                  required
                  className="form-control bg-surface border-secondary text-white"
                  value={projectForm.start_date}
                  onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small">Fecha entrega <span className="text-danger">*</span></label>
                <input
                  type="date"
                  required
                  className="form-control bg-surface border-secondary text-white"
                  value={projectForm.due_date}
                  onChange={(e) => setProjectForm({ ...projectForm, due_date: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small">Prioridad</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={projectForm.priority}
                  onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-muted-tf small">Estado</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="completada">Completada</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Tasks;
