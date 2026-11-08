import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StepProgress from './StepProgress';
import StepAcademic from './StepAcademic';
import StepSubjects from './StepSubjects';
import StepAvailability from './StepAvailability';

const INITIAL_STUDENT = {
  name: '',
};

const INITIAL_SUBJECTS = [];

const INITIAL_AVAILABILITY = [
  { day_of_week: 'lunes', is_available: false, start_time: '', end_time: '' },
  { day_of_week: 'martes', is_available: false, start_time: '', end_time: '' },
  { day_of_week: 'miércoles', is_available: false, start_time: '', end_time: '' },
  { day_of_week: 'jueves', is_available: false, start_time: '', end_time: '' },
  { day_of_week: 'viernes', is_available: false, start_time: '', end_time: '' },
  { day_of_week: 'sábado', is_available: false, start_time: '', end_time: '' },
  { day_of_week: 'domingo', is_available: false, start_time: '', end_time: '' },
];

const ConfigurationWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [student, setStudent] = useState(INITIAL_STUDENT);
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [errors, setErrors] = useState({});

  const cleanValue = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    return v;
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveError('');
    try {
      const studentPayload = {
        name: student.name.trim(),
      };
      await api.post('/students/', studentPayload);

      for (const subject of subjects) {
        if (!subject.name || !subject.name.trim()) continue;
        await api.post('/subjects/', {
          name: subject.name.trim(),
          code: cleanValue(subject.code),
          teacher: cleanValue(subject.teacher),
          description: cleanValue(subject.description),
          color: subject.color || '#6366f1',
          classroom: cleanValue(subject.classroom),
          cycle: subject.cycle ? Number(subject.cycle) : null,
        });
      }

      for (const day of availability) {
        if (day.is_available && day.start_time && day.end_time) {
          await api.post('/availability/', {
            day_of_week: day.day_of_week,
            is_available: true,
            start_time: day.start_time,
            end_time: day.end_time,
          });
        }
      }

      await api.post('/students/me/complete');
      navigate('/');
    } catch (err) {
      if (err.response && err.response.status === 422) {
        const detail = err.response.data?.detail;
        if (Array.isArray(detail)) {
          const msgs = detail.map((d) => `${d.loc.join('.')}: ${d.msg}`).join(', ');
          setSaveError(`Error de validación: ${msgs}`);
        } else {
          setSaveError(`Error de validación: ${detail}`);
        }
      } else {
        setSaveError('Error al guardar la configuración. Intenta nuevamente.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    // Validación inline del paso 1: el nombre es obligatorio
    if (currentStep === 1) {
      const e = {};
      if (!student.name.trim()) e.name = 'El nombre es obligatorio';
      setErrors(e);
      if (Object.keys(e).length > 0) return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handleAddQuickAvailability = (dayStart, dayEnd, days) => {
    const newAvailability = availability.map((a) => {
      if (days.includes(a.day_of_week)) {
        return { ...a, is_available: true, start_time: dayStart, end_time: dayEnd };
      }
      return a;
    });
    setAvailability(newAvailability);
  };

  return (
    <div className="fade-in">
      <header className="mb-4 text-center">
        <h1 className="fw-bold mb-2">Configuración inicial</h1>
        <p className="text-muted-tf mb-0">Configura TaskFlow para organizar tu semestre académico.</p>
      </header>

      {saveError && (
        <div className="alert alert-danger text-white border-secondary mb-4" role="alert">
          {saveError}
        </div>
      )}

      <StepProgress currentStep={currentStep} />

      <div className="wizard-card">
        <div className="card-body">
          {currentStep === 1 && (
            <StepAcademic
              form={student}
              onChange={(field, value) => setStudent({ ...student, [field]: value })}
              errors={errors}
              setErrors={setErrors}
            />
          )}
          {currentStep === 2 && (
            <StepSubjects
              subjects={subjects}
              onAdd={(s) => setSubjects([...subjects, { ...s, id: Date.now() }])}
              onUpdate={(id, s) =>
                setSubjects(subjects.map((sub) => (sub.id === id ? { ...sub, ...s } : sub)))}
              onDelete={(id) => setSubjects(subjects.filter((sub) => sub.id !== id))}
              skip={() => setCurrentStep(3)}
            />
          )}
          {currentStep === 3 && (
            <StepAvailability
              availability={availability}
              onChange={(newForm) => {
                const newAvailability = Object.entries(newForm).map(([day, data]) => ({
                  day_of_week: day,
                  is_available: data.is_available,
                  start_time: data.start_time || '',
                  end_time: data.end_time || '',
                }));
                setAvailability(newAvailability);
              }}
              onAddQuickAvailability={handleAddQuickAvailability}
            />
          )}
        </div>
        <div className="card-footer border-secondary bg-transparent d-flex justify-content-between align-items-center">
          {currentStep > 1 && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={loading}
            >
              <i className="bi bi-arrow-left me-1" aria-hidden="true" /> Anterior
            </button>
          )}
          {currentStep < 3 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              disabled={loading}
            >
              Siguiente <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Comenzar'}
            </button>
          )}
          <Link to="/" className="text-muted-tf small text-decoration-none">
            Saltar configuración
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationWizard;