import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';

const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MODALITIES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hybrid', label: 'Híbrida' },
];

const SubjectScheduleModal = ({ subject, open, onClose }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    day_of_week: 'lunes',
    start_time: '08:00',
    end_time: '10:00',
    room: '',
    teacher: '',
    modality: 'presencial',
    observations: '',
  });

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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room || null,
        teacher: form.teacher || null,
        modality: form.modality,
        observations: form.observations || null,
      };
      if (editingId) {
        await api.put(`/class-schedules/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post('/class-schedules/', { ...payload, subject_id: subject.id });
      }
      setForm({
        day_of_week: 'lunes',
        start_time: '08:00',
        end_time: '10:00',
        room: '',
        teacher: '',
        modality: 'presencial',
        observations: '',
      });
      if (subject?.id) await loadSchedules(subject.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo guardar el horario.');
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

  const handleEdit = (schedule) => {
    setEditingId(schedule.id);
    setForm({
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      room: schedule.room || '',
      teacher: schedule.teacher || '',
      modality: schedule.modality || 'presencial',
      observations: schedule.observations || '',
    });
  };

  if (!subject) return null;

  return (
    <Modal
      open={open}
      title={`Horario · ${subject.name}`}
      onClose={onClose}
      className="modal-lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="row g-3">
        <div className="col-12">
          <div className="card border-secondary shadow-sm">
            <div className="card-header bg-transparent border-secondary">
              <h6 className="fw-semibold mb-0">{editingId ? 'Editar horario de clase' : 'Nuevo horario de clase'}</h6>
            </div>
            <div className="card-body p-3">
              <form onSubmit={handleSave}>
                <div className="row g-3">
                  <div className="col-12 col-md-3">
                    <label className="form-label text-muted-tf small">Día <span className="text-danger">*</span></label>
                    <select
                      required
                      className="form-select bg-surface border-secondary text-white"
                      value={form.day_of_week}
                      onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
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
                  <div className="col-12 col-md-3">
                    <label className="form-label text-muted-tf small">Aula</label>
                    <input
                      type="text"
                      className="form-control bg-surface border-secondary text-white"
                      value={form.room}
                      onChange={(e) => setForm({ ...form, room: e.target.value })}
                      placeholder="Salón A-101"
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label text-muted-tf small">Docente</label>
                    <input
                      type="text"
                      className="form-control bg-surface border-secondary text-white"
                      value={form.teacher}
                      onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                      placeholder="Dra. Rodríguez"
                    />
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
                  <div className="col-12 d-flex gap-2 mt-3">
                    <Button type="submit" variant="primary">
                      {editingId ? 'Actualizar horario' : 'Registrar horario'}
                    </Button>
                    {editingId && (
                      <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12">
          <h6 className="fw-semibold text-white mb-2">Horarios de {subject.name}</h6>
          {loading ? (
            <Skeleton lines={3} />
          ) : error ? (
            <div className="alert alert-danger text-white border-secondary">{error}</div>
          ) : schedules.length === 0 ? (
            <EmptyState
              icon={<i className="bi bi-clock" aria-hidden="true" />}
              title="Sin horarios"
              message="Registra el horario de esta materia."
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
                      <Button variant="outline" size="sm" className="flex-grow-1" onClick={() => handleEdit(s)}>
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
        </div>
      </div>
    </Modal>
  );
};

export default SubjectScheduleModal;
