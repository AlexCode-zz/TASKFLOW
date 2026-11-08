import { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';

const DAY_KEYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MODALITIES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hybrid', label: 'Híbrida' },
];

const emptyForm = {
  subject_id: '',
  day_of_week: 'lunes',
  start_time: '08:00',
  end_time: '10:00',
  modality: 'presencial',
  observations: '',
};

const ClassSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sRes, subRes] = await Promise.all([
        api.get('/class-schedules/'),
        api.get('/subjects/'),
      ]);
      setSchedules(sRes.data);
      setSubjects(subRes.data);
    } catch {
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSaveError('');
    setFormOpen(true);
  };

  const openEdit = (schedule) => {
    setEditingId(schedule.id);
    setForm({
      subject_id: schedule.subject_id ? String(schedule.subject_id) : '',
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      modality: schedule.modality || 'presencial',
      observations: schedule.observations || '',
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
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        modality: form.modality,
        observations: form.observations || null,
      };
      const subjectId = Number(form.subject_id);
      if (editingId) {
        await api.put(`/class-schedules/${editingId}`, { ...payload, subject_id: subjectId });
        setEditingId(null);
      } else {
        await api.post('/class-schedules/', { ...payload, subject_id: subjectId });
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Error al guardar el horario de clase.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este horario de clase?')) return;
    try {
      await api.delete(`/class-schedules/${id}`);
      await loadData();
    } catch {
      setError('No se pudo eliminar el horario de clase.');
    }
  };

  const getDayLabel = (key) => DAYS[DAY_KEYS.indexOf(key)] || key;

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

      <PageHeader
        title="Horarios"
        description="Registra las sesiones semanales de cada materia."
        actions={
          schedules.length > 0 ? (
            <Button variant="primary" onClick={openCreate}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Agregar horario
            </Button>
          ) : null
        }
      />

      {!error && schedules.length === 0 ? (
        <EmptyState
          icon={<i className="bi bi-clock" aria-hidden="true" />}
          title="Aún no tienes horarios"
          message="Registra tu primer horario de clase para comenzar."
          actionLabel="Agregar horario"
          onAction={openCreate}
        />
      ) : schedules.length > 0 ? (
        <>
          <h6 className="fw-semibold text-white mb-3">Horarios registrados</h6>
          <div className="row g-3">
            {schedules.map((s) => {
              const subject = subjects.find((sub) => sub.id === s.subject_id);
              return (
                <div key={s.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card border-secondary shadow-sm h-100">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="fw-semibold mb-0">{subject ? subject.name : 'Materia'}</h6>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: subject ? subject.color : '#6366f1',
                            color: '#ffffff',
                          }}
                        >
                          {s.modality}
                        </span>
                      </div>
                      <div className="mb-2">
                        <span className="badge bg-dark text-white small me-2">{subject?.code || ''}</span>
                        <span className="text-muted-tf small">{getDayLabel(s.day_of_week)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-medium text-white">{s.start_time} - {s.end_time}</span>
                        {s.room && <span className="text-muted-tf small">{s.room}</span>}
                      </div>
                      {s.teacher && (
                        <div className="text-muted-tf small mb-2">{s.teacher}</div>
                      )}
                      {s.observations && (
                        <div className="text-muted-tf small mb-2">{s.observations}</div>
                      )}
                    </div>
                    <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm flex-grow-1"
                        onClick={() => openEdit(s)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDelete(s.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <Modal
        open={formOpen}
        title={editingId ? 'Editar horario de clase' : 'Nuevo horario de clase'}
        onClose={closeForm}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="class-schedule-form" loading={saving}>
              {editingId ? 'Actualizar horario' : 'Registrar horario'}
            </Button>
          </>
        }
      >
        <form id="class-schedule-form" onSubmit={handleSave}>
          {saveError && (
            <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
              {saveError}
            </div>
          )}

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label text-muted-tf small" htmlFor="class-schedule-subject">
                Materia <span className="text-danger">*</span>
              </label>
              <select
                id="class-schedule-subject"
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
              <label className="form-label text-muted-tf small">Día <span className="text-danger">*</span></label>
              <select
                required
                className="form-select bg-surface border-secondary text-white"
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
              >
                {DAY_KEYS.map((d) => (
                  <option key={d} value={d}>{DAYS[DAY_KEYS.indexOf(d)]}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label text-muted-tf small">Hora inicio <span className="text-danger">*</span></label>
              <input
                type="time"
                required
                className="form-control bg-surface border-secondary text-white"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="form-label text-muted-tf small">Hora fin <span className="text-danger">*</span></label>
              <input
                type="time"
                required
                className="form-control bg-surface border-secondary text-white"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label text-muted-tf small">Modalidad</label>
              <select
                className="form-select bg-surface border-secondary text-white"
                value={form.modality}
                onChange={(e) => setForm({ ...form, modality: e.target.value })}
              >
                {MODALITIES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12">
              <label className="form-label text-muted-tf small">Observaciones</label>
              <textarea
                className="form-control bg-surface border-secondary text-white"
                rows="2"
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                placeholder="Observaciones adicionales"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassSchedules;
