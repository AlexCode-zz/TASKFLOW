const steps = [
  { id: 1, label: 'Tu nombre' },
  { id: 2, label: 'Tus materias' },
  { id: 3, label: 'Tu horario' },
];

const StepProgress = ({ currentStep }) => {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="stepper">
      <div className="stepper-track">
        <div className="stepper-line">
          <div className="stepper-fill" style={{ width: `${progress}%` }} />
        </div>
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <div key={step.id} className={`step-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
              <div className="step-circle">{isCompleted ? '✓' : step.id}</div>
              <div className={`step-label ${isCurrent ? 'active' : ''}`}>{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepProgress;
