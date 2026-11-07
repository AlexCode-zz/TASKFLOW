import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import SubjectCard from '../components/common/SubjectCard';
import EmptyState from '../components/common/EmptyState';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await api.get('/subjects/');
      setSubjects(response.data);
    } catch (err) {
      setError('No se pudieron cargar las materias.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta materia?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      setSubjects(subjects.filter((s) => s.id !== id));
    } catch (err) {
      setError('No se pudo eliminar la materia.');
    }
  };

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fade-in">
      {error && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          {error}
        </div>
      )}
      <header className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="fw-bold mb-1">Materias</h1>
          <p className="text-muted-tf mb-0">Administra tus materias académicas.</p>
        </div>
        <Link to="/materias/nueva" className="btn btn-primary">
          + Nueva materia
        </Link>
      </header>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-4">
          <div className="input-group">
            <span className="input-group-text bg-surface border-secondary text-white">🔍</span>
            <input
              type="text"
              className="form-control bg-surface border-secondary text-white"
              placeholder="Buscar materia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="row g-4">
          {filtered.map((subject) => (
            <div key={subject.id} className="col-12 col-sm-6 col-lg-4">
              <SubjectCard subject={subject} />
              <button
                type="button"
                className="btn btn-outline-danger btn-sm mt-2 w-100"
                onClick={() => handleDelete(subject.id)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🔍"
          title="No se encontraron materias"
          subtitle="Intenta con otro término de búsqueda."
        />
      )}
    </div>
  );
};

export default Subjects;
