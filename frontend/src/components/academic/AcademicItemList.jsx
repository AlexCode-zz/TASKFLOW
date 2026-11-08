import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../ui/Button';
import StatusBadge from '../common/StatusBadge';
import { calculateWeightedAverage, formatGrade, isItemRealizado } from '../../utils/academic';

const AcademicItemList = ({ subject }) => {
  const [parciales, setParciales] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const [editing, setEditing] = useState(null); // { kind, id, status, date, grade, weight_percentage }
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (subject?.id) {
      loadItems(subject.id);
    }
  }, [subject?.id]);

  const loadItems = async (subjectId) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/subjects/${subjectId}/academic-items`);
      setParciales(response.data.parciales || []);
      setLaboratorios(response.data.laboratorios || []);
    } catch {
      setError('No se pudieron cargar los parciales y laboratorios.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (kind, item) => {
    setEditing({
      kind,
      id: item.id,
      status: item.status || 'pendiente',
      date: item.date || '',
      grade: item.grade ?? '',
      weight_percentage: item.weight_percentage ?? '',
    });
    setEditError('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditError('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setEditError('');

    if (editing.status === 'realizado' && !editing.date) {
      setEditError(
        editing.kind === 'parcial'
          ? 'La fecha es obligatoria para registrar el parcial realizado.'
          : 'La fecha es obligatoria para registrar el laboratorio realizado.'
      );
      return;
    }

    const payload = {
      status: editing.status,
      date: editing.date || null,
      grade: editing.grade === '' || editing.grade === null ? null : Number(editing.grade),
      weight_percentage:
        editing.weight_percentage === '' || editing.weight_percentage === null
          ? null
          : Number(editing.weight_percentage),
    };

    try {
      if (editing.kind === 'parcial') {
        await api.put(`/evaluations/${editing.id}`, payload);
      } else {
        await api.put(`/laboratories/${editing.id}`, payload);
      }
      setEditing(null);
      if (subject?.id) await loadItems(subject.id);
    } catch (err) {
      setEditError(err.response?.data?.detail || 'No se pudo guardar el ítem académico.');
    }
  };

  const toggleRealizado = async (kind, itemId, currentStatus) => {
    const newStatus = currentStatus === 'realizado' ? 'pendiente' : 'realizado';
    const current = kind === 'parcial' ? parciales.find((p) => p.id === itemId) : laboratorios.find((l) => l.id === itemId);
    if (newStatus === 'realizado' && current && !current.date) {
      setActionError(
        kind === 'parcial'
          ? 'La fecha es obligatoria para registrar el parcial realizado.'
          : 'La fecha es obligatoria para registrar el laboratorio realizado.'
      );
      return;
    }
    setActionError('');
    try {
      if (kind === 'parcial') {
        await api.put(`/evaluations/${itemId}`, { status: newStatus });
      } else {
        await api.put(`/laboratories/${itemId}`, { status: newStatus });
      }
      if (subject?.id) await loadItems(subject.id);
    } catch {
      setError('No se pudo actualizar el estado del ítem.');
    }
  };

  const renderItem = (kind, item, title) => {
    const isEditing = editing?.kind === kind && editing.id === item.id;
    const isRealizado = isItemRealizado(item);

    const viewContent = (
      <div className="d-flex flex-wrap align-items-center gap-2">
        <div className="form-check mb-0">
          <input
            id={`realizado-${kind}-${item.id}`}
            type="checkbox"
            className="form-check-input"
            checked={isRealizado}
            onChange={() => toggleRealizado(kind, item.id, item.status)}
            disabled={isEditing}
          />
          <label className="form-check-label text-white small" htmlFor={`realizado-${kind}-${item.id}`}>
            Realizado
          </label>
        </div>
        <span className="fw-semibold text-white small">{title}</span>
        <StatusBadge status={item.status} />
        <span className="text-muted-tf small">Fecha: {item.date || 'Sin fecha'}</span>
        <span className="text-muted-tf small">Nota: {formatGrade(item.grade)}</span>
        <span className="text-muted-tf small">
          Peso: {item.weight_percentage !== null && item.weight_percentage !== undefined ? `${Number(item.weight_percentage)}%` : '—'}
        </span>
        <Button variant="outline" size="sm" className="ms-auto" onClick={() => startEdit(kind, item)}>
          <i className="bi bi-pencil me-1" aria-hidden="true" />
          Editar
        </Button>
      </div>
    );

    const editContent = isEditing ? (
      <div>
        <div className="text-muted-tf small mb-3">
          Estado:{' '}
          <select
            className="form-select d-inline-block w-auto bg-surface border-secondary text-white"
            value={editing.status}
            onChange={(e) => setEditing({ ...editing, status: e.target.value })}
            aria-label="Estado"
          >
            <option value="pendiente">Pendiente</option>
            <option value="realizado">Realizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        {editError && (
          <div className="alert alert-danger text-white border-secondary small mb-3" role="alert">
            {editError}
          </div>
        )}
        <div className="row g-2">
          <div className="col-12 col-md-3">
            <label className="form-label text-muted-tf small">Fecha</label>
            <input
              type="date"
              className="form-control bg-surface border-secondary text-white"
              value={editing.date}
              onChange={(e) => setEditing({ ...editing, date: e.target.value })}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label text-muted-tf small">Nota</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="form-control bg-surface border-secondary text-white"
              value={editing.grade}
              onChange={(e) => setEditing({ ...editing, grade: e.target.value })}
              placeholder="Nota"
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label text-muted-tf small">Porcentaje (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="form-control bg-surface border-secondary text-white"
              value={editing.weight_percentage}
              onChange={(e) => setEditing({ ...editing, weight_percentage: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="col-12 d-flex gap-2 align-items-end">
            <Button variant="primary" size="sm" onClick={handleSave}>
              Guardar
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelEdit}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    ) : (
      <div className="d-flex flex-wrap align-items-center gap-2">{viewContent}</div>
    );

    return (
      <div className="py-2 px-2">{editContent}</div>
    );
  };

  const renderGroup = (title, kind, items) => (
    <div className="mb-4">
      <h6 className="fw-semibold text-white mb-2">{title}</h6>
      {items.length === 0 ? (
        <div className="text-muted-tf small mb-2">Sin ítems registrados.</div>
      ) : (
        <div className="row g-3">
          {items.map((item) => (
            <div key={`${kind}-${item.id}`} className="col-12 col-md-6 col-lg-4">
              {renderItem(kind, item, item.title)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger text-white border-secondary">{error}</div>;
  }

  const { average, weightTotal, gradedCount } = calculateWeightedAverage([...parciales, ...laboratorios]);

  if (actionError) {
    return <div className="alert alert-danger text-white border-secondary" role="alert">{actionError}</div>;
  }

  return (
    <div>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-secondary shadow-sm h-100">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Promedio ponderado</div>
              <div className="fw-bold text-white" style={{ fontSize: '2rem' }}>
                {average === null ? '—' : Number(average).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border-secondary shadow-sm h-100">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Peso total</div>
              <div className="fw-bold text-white" style={{ fontSize: '2rem' }}>
                {weightTotal}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border-secondary shadow-sm h-100">
            <div className="card-body p-3 text-center">
              <div className="text-muted-tf small mb-1">Notas con ponderación</div>
              <div className="fw-bold text-white" style={{ fontSize: '2rem' }}>
                {gradedCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderGroup('Parciales', 'parcial', parciales)}
      {renderGroup('Laboratorios', 'laboratorio', laboratorios)}
    </div>
  );
};

export default AcademicItemList;
