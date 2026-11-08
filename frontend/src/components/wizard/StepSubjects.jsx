import { useState } from 'react';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#6366f1'];

const StepSubjects = ({ subjects, onAdd, onUpdate, onDelete, skip }) => {
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    teacher: '',
    description: '',
    color: '#3b82f6',
    classroom: '',
    cycle: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const validateName = () => {
    if (!newSubject.name.trim()) {
      setError('El nombre de la materia es obligatorio');
      return false;
    }
    if (subjects.some((s) => s.id !== editingId && s.name.toLowerCase() === newSubject.name.toLowerCase())) {
      setError('Ya existe una materia con este nombre');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = () => {
    if (!validateName()) return;
    if (editingId) {
      onUpdate(editingId, newSubject);
      setEditingId(null);
    } else {
      onAdd(newSubject);
    }
    setNewSubject({ name: '', code: '', teacher: '', description: '', color: '#3b82f6', classroom: '', cycle: '' });
  };

  return (
    <div>
      {error && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          {error}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-semibold mb-0">Materias</h6>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={skip}
        >
          Omitir por ahora
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <label className="form-label text-muted-tf small">Nombre <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control bg-surface border-secondary text-white"
            value={newSubject.name}
            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
            placeholder="Cálculo Diferencial"
          />
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label text-muted-tf small">Código</label>
          <input
            type="text"
            className="form-control bg-surface border-secondary text-white"
            value={newSubject.code}
            onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
            placeholder="MAT-101"
          />
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label text-muted-tf small">Docente</label>
          <input
            type="text"
            className="form-control bg-surface border-secondary text-white"
            value={newSubject.teacher}
            onChange={(e) => setNewSubject({ ...newSubject, teacher: e.target.value })}
            placeholder="Dra. Elena Rodríguez"
          />
        </div>
        <div className="col-12 col-md-2">
          <label className="form-label text-muted-tf small">Color</label>
          <div className="d-flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`btn btn-sm p-0 rounded-circle border border-secondary ${newSubject.color === c ? 'border-white' : ''}`}
                style={{ backgroundColor: c, width: '30px', height: '30px' }}
                onClick={() => setNewSubject({ ...newSubject, color: c })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <label className="form-label text-muted-tf small">Descripción</label>
          <textarea
            className="form-control bg-surface border-secondary text-white"
            rows="2"
            value={newSubject.description}
            onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
            placeholder="Descripción opcional"
          />
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label text-muted-tf small">Aula</label>
          <input
            type="text"
            maxLength={50}
            className="form-control bg-surface border-secondary text-white"
            value={newSubject.classroom}
            onChange={(e) => setNewSubject({ ...newSubject, classroom: e.target.value })}
            placeholder="Aula 302"
          />
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label text-muted-tf small">Ciclo</label>
          <select
            className="form-select bg-surface border-secondary text-white"
            value={newSubject.cycle}
            onChange={(e) => setNewSubject({ ...newSubject, cycle: e.target.value })}
          >
            <option value="">Sin ciclo</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Ciclo {n}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <button type="button" className="btn btn-primary w-100" onClick={handleSave}>
            {editingId ? 'Actualizar materia' : 'Agregar materia'}
          </button>
        </div>
      </div>

      <h6 className="fw-semibold text-white mb-3">Materias registradas</h6>
      {subjects.length === 0 ? (
        <div className="text-muted-tf text-center py-4">
          No hay materias registradas.
        </div>
      ) : (
        <div className="list-group list-group-flush">
          {subjects.map((s) => (
            <div key={s.id} className="list-group-item bg-surface border-secondary p-3 d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-medium text-white">{s.name}</div>
                <div className="text-muted-tf small">
                  {s.code ? s.code + ' - ' : ''}{s.teacher || ''}{s.cycle ? ` · Ciclo ${s.cycle}` : ''}
                </div>
              </div>
              <div className="text-end">
                <span className="badge" style={{ backgroundColor: s.color, color: '#ffffff' }}>{s.classroom || 'Sin aula'}</span>
              </div>
              <div className="d-flex gap-1">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => {
                    setNewSubject({ ...s, classroom: s.classroom || '', cycle: s.cycle ? String(s.cycle) : '' });
                    setEditingId(s.id);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onDelete(s.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StepSubjects;