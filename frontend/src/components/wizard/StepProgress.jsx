const steps = [
  { id: 1, label: '¿Cómo te llamas?' },
  { id: 2, label: 'Tus materias' },
  { id: 3, label: 'Tu horario' },
];

const StepProgress = ({ currentStep }) => {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="step-progress mb-4">
      <div className="step-progress-line">
        <div className="step-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="d-flex justify-content-between">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <div key={step.id} className="step-item text-center flex-grow-1">
              <div
                className={`step-circle ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
              >
                {isCompleted ? '✓' : step.id}
              </div>
              <div className={`step-label ${isCurrent ? 'active' : ''}`}>{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepProgress;