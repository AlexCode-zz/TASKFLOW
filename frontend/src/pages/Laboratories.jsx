import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const Laboratories = () => {
  const [laboratories, setLaboratories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    subject_id: '',
    title: '',
    date: '',
    start_time: '08:00',
    end_time: '10:00',
    location: '',
    description: '',
    materials: '',
    status: 'pendiente',
  });
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
    } catch (err) {
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    try {
      if (editingId) {
        await api.put(`/laboratories/${editingId}`, form);
        setEditingId(null);
      } else {
        await api.post('/laboratories/', form);
      }
      setForm({
        subject_id: '',
        title: '',
        date: '',
        start_time: '08:00',
        end_time: '10:00',
        location: '',
        description: '',
        materials: '',
        status: 'pendiente',
      });
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
    } catch (err) {
      setError('No se pudo eliminar el laboratorio.');
    }
  };

  const handleEdit = (lab) => {
    setForm({ ...lab });
    setEditingId(lab.id);
  };

  const getDayLabel = (key) => DAYS[['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].indexOf(key)] || key;

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
          <h1 className="fw-bold mb-1">Laboratorios</h1>
          <p className="text-muted-tf mb-0">Registra tus sesiones de laboratorio.</p>
        </div>
        <Link to="/" className="btn btn-outline-secondary btn-sm">
          ← Volver a Mi semana
        </Link>
      </header>

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
                  placeholder="Laboratorio de óptica"
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label text-muted-tf small">Fecha <span className="text-danger">*</span></label>
                <input
                  type="date"
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
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar laboratorio' : 'Registrar laboratorio'}
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

      <h6 className="fw-semibold text-white mb-3">Laboratorios registrados</h6>
      {laboratories.length === 0 ? (
        <div className="text-muted-tf text-center py-4">
          No hay laboratorios registrados.
        </div>
      ) : (
        <div className="row g-3">
          {laboratories.map((l) => {
            const subject = subjects.find((sub) => sub.id === l.subject_id);
            return (
              <div key={l.id} className="col-12 col-md-6 col-lg-4">
                <div className="card border-secondary shadow-sm h-100">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-semibold mb-0">{l.title}</h6>
                      <StatusBadge status={l.status} />
                    </div>
                    <div className="mb-2">
                      <span className="badge bg-dark text-white small me-2">{subject?.code || ''}</span>
                      <span className="text-muted-tf small">{subject ? subject.name : 'Materia'}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted-tf small">{l.date}</span>
                      <span className="text-muted-tf small">{l.start_time} - {l.end_time}</span>
                    </div>
                    {l.location && (
                      <div className="text-muted-tf small mb-2">{l.location}</div>
                    )}
                    {l.materials && (
                      <div className="text-muted-tf small mb-2">
                        <strong className="text-white">Materiales:</strong> {l.materials}
                      </div>
                    )}
                    {l.description && (
                      <div className="text-muted-tf small">{l.description}</div>
                    )}
                  </div>
                  <div className="card-footer border-secondary bg-transparent pt-2 pb-2 d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm flex-grow-1"
                      onClick={() => handleEdit(l)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(l.id)}
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

export default Laboratories;
