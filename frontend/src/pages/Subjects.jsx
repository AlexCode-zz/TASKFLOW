import { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import SubjectAcademicModal from '../components/academic/SubjectAcademicModal';
import SubjectScheduleModal from '../components/academic/SubjectScheduleModal';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#6366f1'];

const emptyForm = {
  name: '',
  code: '',
  teacher: '',
  classroom: '',
  cycle: '',
  description: '',
  color: '#6366f1',
  start_date: '',
  end_date: '',
};

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [academicSubject, setAcademicSubject] = useState(null);
  const [academicOpen, setAcademicOpen] = useState(false);
  const [scheduleSubject, setScheduleSubject] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await api.get('/subjects/');
      setSubjects(response.data);
    } catch {
      setError('No se pudieron cargar las materias.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSaveError('');
    setFormOpen(true);
  };

  const openEdit = (subject) => {
    setEditingId(subject.id);
    setForm({
      name: subject.name || '',
      code: subject.code || '',
      teacher: subject.teacher || '',
      classroom: subject.classroom || '',
      cycle: subject.cycle ? String(subject.cycle) : '',
      description: subject.description || '',
      color: subject.color || '#6366f1',
      start_date: subject.start_date || '',
      end_date: subject.end_date || '',
    });
    setSaveError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setSaveError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        teacher: form.teacher.trim() || null,
        classroom: form.classroom.trim() || null,
        cycle: form.cycle ? Number(form.cycle) : null,
        description: form.description.trim() || null,
        color: form.color || '#6366f1',
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editingId) {
        await api.put(`/subjects/${editingId}`, payload);
      } else {
        await api.post('/subjects/', payload);
      }
      // Al guardar, el formulario se cierra automáticamente y la materia aparece en la lista.
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadSubjects(false);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar la materia.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta materia?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      await loadSubjects(false);
    } catch {
      setError('No se pudo eliminar la materia.');
    }
  };

  const toggleFavorite = async (subject) => {
    const updated = { ...subject, is_favorite: !subject.is_favorite };
    setSubjects((prev) => prev.map((s) => (s.id === subject.id ? updated : s)));
    try {
      const response = await api.put(`/subjects/${subject.id}`, { is_favorite: updated.is_favorite });
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? response.data : s)));
    } catch {
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? subject : s)));
      setError('No se pudo actualizar la materia fijada.');
    }
  };

  const filtered = subjects
    .filter((s) => {
      if (cycleFilter === 'none' && s.cycle) return false;
      if (cycleFilter !== 'all' && cycleFilter !== 'none' && Number(s.cycle) !== Number(cycleFilter)) {
        return false;
      }
      const term = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        (s.code && s.code.toLowerCase().includes(term)) ||
        (s.teacher && s.teacher.toLowerCase().includes(term)) ||
        (s.classroom && s.classroom.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      const favoriteDiff = Number(b.is_favorite) - Number(a.is_favorite);
      return favoriteDiff !== 0 ? favoriteDiff : a.id - b.id;
    });

  const hasFilters = search !== '' || cycleFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setCycleFilter('all');
  };

  const previewName = form.name.trim() || 'Nombre de la materia';
  const previewMeta = [
    form.cycle ? `Ciclo ${form.cycle}` : 'Sin ciclo',
    form.classroom.trim() || 'Aula sin definir',
    form.code.trim(),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fade-in">
      {error && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <span>{error}</span>
            <button type="button" className="btn btn-outline-light btn-sm" onClick={() => loadSubjects()}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      <PageHeader
        title="Materias"
        description="Administra tus materias académicas."
        actions={
          subjects.length > 0 ? (
            <Button variant="primary" onClick={openCreate}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Nueva materia
            </Button>
          ) : null
        }
      />

      {loading ? (
        <Skeleton lines={5} />
      ) : subjects.length === 0 ? (
        <div className="state-container">
          <div className="state-icon" aria-hidden="true">
            <i className="bi bi-book" />
          </div>
          <h2 className="state-title">Aún no tienes materias</h2>
          <p className="state-message">Crea tu primera materia para organizar tus clases, tareas y evaluaciones.</p>
          <div className="state-actions">
            <Button variant="primary" size="lg" onClick={openCreate}>
              <i className="bi bi-plus-lg me-2" aria-hidden="true" />
              Nueva materia
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-5">
              <div className="input-group">
                <span className="input-group-text bg-surface border-secondary text-white">
                  <i className="bi bi-search" aria-hidden="true" />
                </span>
                <input
                  type="text"
                  className="form-control bg-surface border-secondary text-white"
                  placeholder="Buscar por nombre, código, docente o aula..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar materias"
                />
              </div>
            </div>
            <div className="col-12 col-md-5 col-lg-4">
              <div className="input-group">
                <span className="input-group-text bg-surface border-secondary text-white">
                  <i className="bi bi-layers" aria-hidden="true" />
                </span>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={cycleFilter}
                  onChange={(e) => setCycleFilter(e.target.value)}
                  aria-label="Filtrar por ciclo"
                >
                  <option value="all">Todos los ciclos</option>
                  <option value="none">Sin ciclo</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Ciclo {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasFilters && (
              <div className="col-12 col-md-2 col-lg-3 d-flex align-items-center">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                  <i className="bi bi-x-lg me-1" aria-hidden="true" />
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {filtered.length > 0 ? (
            <div className="row g-4">
              {filtered.map((subject) => (
                <div key={subject.id} className="col-12 col-sm-6 col-xl-4">
                  <article className="card subject-card h-100" style={{ borderTopColor: subject.color }}>
                    <button
                      type="button"
                      className={`subject-favorite ${subject.is_favorite ? 'is-favorite' : ''}`}
                      onClick={() => toggleFavorite(subject)}
                      aria-pressed={subject.is_favorite}
                      aria-label={
                        subject.is_favorite
                          ? `Quitar ${subject.name} de fijadas`
                          : `Fijar ${subject.name} como favorita`
                      }
                      title={subject.is_favorite ? 'Quitar de fijadas' : 'Fijar materia'}
                    >
                      <i
                        className={`bi ${subject.is_favorite ? 'bi-star-fill' : 'bi-star'}`}
                        aria-hidden="true"
                      />
                    </button>
                    <div className="card-body p-3">
                      <div className="d-flex align-items-start gap-3 mb-3 pe-5">
                        <span className="subject-dot" style={{ backgroundColor: subject.color }} aria-hidden="true" />
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <h3 className="h6 fw-semibold mb-1 text-truncate">{subject.name}</h3>
                          <span className="badge bg-dark text-white border border-secondary">
                            {subject.code || 'Sin código'}
                          </span>
                        </div>
                      </div>

                      {subject.description && (
                        <p className="text-muted-tf small mb-3 subject-description">{subject.description}</p>
                      )}

                      <div className="d-flex flex-column gap-1 small">
                        <span className="text-muted-tf">
                          <i className="bi bi-person me-2" aria-hidden="true" />
                          {subject.teacher || 'Sin docente'}
                        </span>
                        <span className="text-muted-tf">
                          <i className="bi bi-layers me-2" aria-hidden="true" />
                          {subject.cycle ? `Ciclo ${subject.cycle}` : 'Sin ciclo'}
                        </span>
                        <span className="text-muted-tf">
                          <i className="bi bi-door-open me-2" aria-hidden="true" />
                          {subject.classroom || 'Aula sin definir'}
                        </span>
                      </div>
                    </div>
                    <div className="card-footer border-secondary bg-transparent pt-2 pb-2">
                    <div className="d-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScheduleSubject(subject);
                          setScheduleOpen(true);
                        }}
                      >
                        <i className="bi bi-clock me-1" aria-hidden="true" />
                        Horario
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAcademicSubject(subject);
                          setAcademicOpen(true);
                        }}
                      >
                        <i className="bi bi-journal-text me-1" aria-hidden="true" />
                        Parciales y laboratorios
                      </Button>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-grow-1"
                        onClick={() => openEdit(subject)}
                        aria-label={`Editar ${subject.name}`}
                      >
                        <i className="bi bi-pencil me-1" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(subject.id)}
                        aria-label={`Eliminar ${subject.name}`}
                      >
                        <i className="bi bi-trash me-1" aria-hidden="true" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                  </article>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<i className="bi bi-search" aria-hidden="true" />}
              title="No se encontraron materias"
              message="Prueba con otro nombre, código, docente, aula o ciclo."
              actionLabel="Limpiar filtros"
              onAction={clearFilters}
            />
          )}
        </>
      )}

      <Modal
        open={formOpen}
        title={editingId ? 'Editar materia' : 'Nueva materia'}
        onClose={closeForm}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="subject-form" loading={saving}>
              {editingId ? 'Guardar cambios' : 'Agregar materia'}
            </Button>
          </>
        }
      >
        <form id="subject-form" onSubmit={handleSave}>
          {saveError && (
            <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
              {saveError}
            </div>
          )}

          <div
            className="subject-preview mb-4"
            style={{
              borderLeftColor: form.color,
              background: `linear-gradient(135deg, ${form.color}1f, transparent 75%)`,
            }}
            aria-live="polite"
          >
            <span className="subject-preview-swatch" style={{ backgroundColor: form.color }} aria-hidden="true" />
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="fw-semibold text-truncate">{previewName}</div>
              <div className="text-muted-tf small text-truncate">{previewMeta}</div>
            </div>
            <span className="subject-preview-hex">{form.color}</span>
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label text-muted-tf small" htmlFor="subject-name">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                id="subject-name"
                type="text"
                required
                autoFocus
                maxLength={100}
                className="form-control bg-surface border-secondary text-white"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Cálculo Diferencial"
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label text-muted-tf small" htmlFor="subject-code">
                Código
              </label>
              <input
                id="subject-code"
                type="text"
                maxLength={20}
                className="form-control bg-surface border-secondary text-white"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="MAT-101"
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label text-muted-tf small" htmlFor="subject-teacher">
                Docente
              </label>
              <input
                id="subject-teacher"
                type="text"
                maxLength={100}
                className="form-control bg-surface border-secondary text-white"
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                placeholder="Dra. Elena Rodríguez"
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label text-muted-tf small" htmlFor="subject-classroom">
                Aula
              </label>
              <input
                id="subject-classroom"
                type="text"
                maxLength={50}
                className="form-control bg-surface border-secondary text-white"
                value={form.classroom}
                onChange={(e) => setForm({ ...form, classroom: e.target.value })}
                placeholder="Aula 302 / Laboratorio B"
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label text-muted-tf small" htmlFor="subject-cycle">
                Ciclo
              </label>
              <select
                id="subject-cycle"
                className="form-select bg-surface border-secondary text-white"
                value={form.cycle}
                onChange={(e) => setForm({ ...form, cycle: e.target.value })}
              >
                <option value="">Sin ciclo</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Ciclo {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label text-muted-tf small" htmlFor="subject-start_date">
                Fecha inicio
              </label>
              <input
                id="subject-start_date"
                type="date"
                className="form-control bg-surface border-secondary text-white"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label text-muted-tf small" htmlFor="subject-end_date">
                Fecha fin
              </label>
              <input
                id="subject-end_date"
                type="date"
                className="form-control bg-surface border-secondary text-white"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div className="col-12">
              <label className="form-label text-muted-tf small" htmlFor="subject-description">
                Descripción
              </label>
              <textarea
                id="subject-description"
                className="form-control bg-surface border-secondary text-white"
                rows="2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="col-12">
              <span className="form-label text-muted-tf small d-block">Color de la materia</span>
              <div className="d-flex flex-wrap gap-2" role="group" aria-label="Color de la materia">
                {COLORS.map((c) => {
                  const selected = form.color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      className="subject-color-swatch"
                      style={{
                        backgroundColor: c,
                        boxShadow: selected ? '0 0 0 2px #000, 0 0 0 4px #fff' : 'none',
                      }}
                      onClick={() => setForm({ ...form, color: c })}
                      aria-label={`Usar color ${c}`}
                      aria-pressed={selected}
                    >
                      {selected && <i className="bi bi-check-lg" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <SubjectAcademicModal
        subject={academicSubject}
        open={academicOpen}
        onClose={() => {
          setAcademicOpen(false);
          setAcademicSubject(null);
        }}
      />

      <SubjectScheduleModal
        subject={scheduleSubject}
        open={scheduleOpen}
        onClose={() => {
          setScheduleOpen(false);
          setScheduleSubject(null);
        }}
      />
    </div>
  );
};

export default Subjects;
