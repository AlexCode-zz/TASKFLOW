import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SUBJECTS } from '../data/mockData';
import SubjectCard from '../components/common/SubjectCard';
import EmptyState from '../components/common/EmptyState';

const Subjects = () => {
  const [search, setSearch] = useState('');

  const filtered = SUBJECTS.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
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

      {filtered.length > 0 ? (
        <div className="row g-4">
          {filtered.map((subject) => (
            <div key={subject.id} className="col-12 col-sm-6 col-lg-4">
              <SubjectCard subject={subject} />
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
