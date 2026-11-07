import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StepProgress from './StepProgress';
import StepAcademic from './StepAcademic';
import StepSubjects from './StepSubjects';
import StepAvailability from './StepAvailability';
import StepPreferences from './StepPreferences';
import StepSummary from './StepSummary';

const INITIAL_STUDENT = {
  name: '',
  institution: '',
  career: '',
  faculty: '',
  academic_year: '',
  semester: '',
  cycle_start_date: '',
  cycle_end_date: '',
};

const INITIAL_SUBJECTS = [];
const INITIAL_AVAILABILITY = [
  { day_of_week: 'lunes', is_available: true, start_time: '', end_time: '' },
  { day_of_week: 'martes', is_available: true, start_time: '', end_time: '' },
  { day_of_week: 'miércoles', is_available: true, start_time: '', end_time: '' },
  { day_of_week: 'jueves', is_available: true, start_time: '', end_time: '' },
  { day_of_week: 'viernes', is_available: true, start_time: '', end_time: '' },
  { day_of_week: 'sábado', is_available: true, start_time: '', end_time: '' },
  { day_of_week: 'domingo', is_available: true, start_time: '', end_time: '' },
];
const INITIAL_PREFERENCES = {
  usual_start_time: '',
  usual_sleep_time: '',
  preferred_study_session_minutes: '',
  preferred_break_minutes: '',
  exam_preparation_days: '',
  planning_preference: 'daily',
};

const ConfigurationWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [student, setStudent] = useState(INITIAL_STUDENT);
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const canGoNext = () => {
    if (currentStep === 1) {
      return !student.name.trim() ? false : true;
    }
    if (currentStep === 2) {
      return subjects.length > 0;
    }
    if (currentStep === 3) {
      return true;
    }
    if (currentStep === 4) {
      return true;
    }
    return true;
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveError('');
    try {
      // Paso 1: Guardar información académica
      await api.post('/students/', student);

      // Paso 2: Guardar materias
      for (const subject of subjects) {
        await api.post('/subjects/', {
          name: subject.name,
          code: subject.code || undefined,
          teacher: subject.teacher || undefined,
          description: subject.description || undefined,
          color: subject.color,
          credits: subject.credits ? parseInt(subject.credits) : undefined,
        });
      }

      // Paso 3: Guardar disponibilidad
      for (const day of availability) {
        if (day.is_available && day.start_time && day.end_time) {
          await api.post('/availability/', {
            day_of_week: day.day_of_week,
            is_available: day.is_available,
            start_time: day.start_time,
            end_time: day.end_time,
          });
        } else if (day.is_available) {
          await api.post('/availability/', {
            day_of_week: day.day_of_week,
            is_available: true,
          });
        }
      }

      // Paso 4: Guardar preferencias
      await api.post('/preferences/', preferences);

      // Paso 5: Marcar como configurado
      await api.post('/students/me/complete');

      navigate('/');
    } catch (err) {
      setSaveError('Error al guardar la configuración. Intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
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

      <div className="card border-secondary shadow-sm">
        <div className="card-body p-4">
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
                setSubjects(subjects.map((sub) => (sub.id === id ? { ...sub, ...s } : sub)))
              }
              onDelete={(id) => setSubjects(subjects.filter((sub) => sub.id !== id))}
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
            />
          )}
          {currentStep === 4 && (
            <StepPreferences
              preferences={preferences}
              onChange={(field, value) => setPreferences({ ...preferences, [field]: value })}
            />
          )}
          {currentStep === 5 && (
            <StepSummary
              student={student}
              subjects={subjects}
              availability={availability}
              preferences={preferences}
              onEditStep={(step) => setCurrentStep(step)}
            />
          )}
        </div>
        <div className="card-footer border-secondary bg-transparent d-flex justify-content-between align-items-center px-4 pb-3">
          {currentStep > 1 && (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={loading}
            >
              ← Anterior
            </button>
          )}
          {currentStep < 5 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (canGoNext()) {
                  if (currentStep === 1) {
                    const isValid = !errors.name && !errors.career && !errors.academic_year && !errors.cycle_end_date;
                    if (isValid) setCurrentStep(currentStep + 1);
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }
              }}
              disabled={loading || !canGoNext()}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Finalizar configuración'}
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
