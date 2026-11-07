const steps = [
  { id: 1, label: 'Información académica' },
  { id: 2, label: 'Materias' },
  { id: 3, label: 'Disponibilidad semanal' },
  { id: 4, label: 'Preferencias' },
  { id: 5, label: 'Resumen y confirmación' },
];

const StepProgress = ({ currentStep }) => {
  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between mb-2">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <div key={step.id} className="text-center flex-grow-1">
              <div
                className={`d-flex justify-content-center align-items-center mb-1 w-10 h-10 rounded-circle border ${
                  isCompleted || isCurrent
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-muted-tf border-secondary'
                }`}
                style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}
              >
                {isCompleted ? '✓' : step.id}
              </div>
              <div className={`fw-medium small ${isCurrent ? 'text-primary' : 'text-muted-tf'}`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="progress bg-secondary" style={{ height: '4px' }}>
        <div
          className="progress-bar bg-primary"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
      </div>
      <div className="text-muted-tf small mt-2 text-center">
        Paso {currentStep} de {steps.length}
      </div>
    </div>
  );
};

export default StepProgress;
