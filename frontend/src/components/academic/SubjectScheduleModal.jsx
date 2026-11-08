import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';

const DAY_KEYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MODALITIES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hybrid', label: 'Híbrida' },
];

const emptyForm = {
  day_of_week: 'lunes',
  start_time: '08:00',
  end_time: '10:00',
  modality: 'presencial',
  observations: '',
};

const SubjectScheduleModal = ({ subject, open, onClose }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (subject?.id) {
      loadSchedules(subject.id);
    }
  }, [subject?.id]);

  const loadSchedules = async (subjectId) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/class-schedules/subject/${subjectId}`);
      setSchedules(response.data || []);
    } catch {
      setError('No se pudieron cargar los horarios de esta materia.');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSaveError('');
    setFormOpen(true);
  };

  const startEdit = (schedule) => {
    setEditingId(schedule.id);
    setForm({
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
      if (editingId) {
        await api.put(`/class-schedules/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post(`/class-schedules/`, { ...payload, subject_id: subject.id });
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      if (subject?.id) await loadSchedules(subject.id);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'No se pudo guardar el horario.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este horario de clase?')) return;
    try {
      await api.delete(`/class-schedules/${id}`);
      if (subject?.id) await loadSchedules(subject.id);
      if (editingId === id) setEditingId(null);
    } catch {
      setError('No se pudo eliminar el horario de clase.');
    }
  };

  const handleClose = () => {
    if (formOpen) closeForm();
    else onClose();
  };

  if (!subject) return null;

  return (
    <Modal
      open={open}
      title={formOpen ? (editingId ? 'Editar horario de clase' : 'Nuevo horario de clase') : `Horario · ${subject.name}`}
      onClose={handleClose}
      className="modal-lg"
      footer={
        formOpen ? (
          <>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="subject-schedule-form" loading={saving}>
              {editingId ? 'Actualizar horario' : 'Registrar horario'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        )
      }
    >
      {formOpen ? (
        <div className="card border-secondary shadow-sm">
          <div className="card-header bg-transparent border-secondary">
            <h6 className="fw-semibold mb-0">{editingId ? 'Editar horario de clase' : 'Nuevo horario de clase'}</h6>
          </div>
          <div className="card-body p-3">
            <form id="subject-schedule-form" onSubmit={handleSave}>
              {saveError && (
                <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
                  {saveError}
                </div>
              )}
              <div className="row g-3">
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
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-semibold text-white mb-0">Horarios de {subject.name}</h6>
            <Button variant="outline" size="sm" onClick={startCreate}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Agregar horario
            </Button>
          </div>
          {loading ? (
            <Skeleton lines={3} />
          ) : error ? (
            <div className="alert alert-danger text-white border-secondary">{error}</div>
          ) : schedules.length === 0 ? (
            <EmptyState
              icon={<i className="bi bi-clock" aria-hidden="true" />}
              title="Sin horarios"
              message="Registra el horario de esta materia."
              actionLabel="Agregar horario"
              onAction={startCreate}
            />
          ) : (
            <div className="row g-3">
              {schedules.map((s) => (
                <div key={s.id} className="col-12 col-md-6">
                  <div className="card border-secondary shadow-sm h-100">
                    <div className="card-body p-3">
                      <h6 className="fw-semibold mb-0">{s.day_of_week}</h6>
                      <div className="text-muted-tf small mt-1">
                        {s.start_time} - {s.end_time}
                      </div>
                      {s.room && <div className="text-muted-tf small mt-1">{s.room}</div>}
                      {s.teacher && <div className="text-muted-tf small">{s.teacher}</div>}
                      {s.observations && <div className="text-muted-tf small mt-1">{s.observations}</div>}
                    </div>
                    <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                      <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => startEdit(s)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default SubjectScheduleModal;
