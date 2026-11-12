import Button from '../ui/Button';

/**
 * Tarjetas del agente Mel: confirmación de acciones, resultados de
 * herramientas y avisos de error diferenciados. Todo con el tema
 * visual de TaskFlow (negro, bordes finos blancos, sin emojis).
 */

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const CrossIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);

const ToolIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
);

/** Etiquetas legibles de los parámetros de una acción. */
const PARAM_LABELS = {
  subject: 'Materia',
  task: 'Tarea',
  item: 'Ítem',
  item_type: 'Tipo',
  name: 'Nombre',
  title: 'Título',
  grade: 'Nota',
  weight_percentage: 'Ponderación',
  day_of_week: 'Día',
  start_time: 'Inicio',
  end_time: 'Fin',
  due_date: 'Fecha límite',
  date: 'Fecha',
  status: 'Estado',
  priority: 'Prioridad',
  teacher: 'Docente',
  classroom: 'Aula',
  room: 'Aula',
  cycle: 'Ciclo',
  week_start_date: 'Semana',
};

/** Parámetros que no aportan a la descripción visible. */
const HIDDEN_PARAMS = new Set(['confirmed', 'allow_conflict']);

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Tarjeta de confirmación: muestra exactamente qué acción se ejecutará
 * y espera la decisión explícita del usuario.
 */
export function ConfirmationCard({ confirmation, onAccept, onCancel, busy = false, resolved = null }) {
  if (!confirmation) return null;

  const params = Object.entries(confirmation.parameters || {}).filter(
    ([key]) => !HIDDEN_PARAMS.has(key),
  );

  return (
    <div className="mel-confirmation-card" role="group" aria-label="Confirmación requerida">
      <div className="mel-confirmation-head">
        <AlertIcon />
        <span>Necesito tu confirmación</span>
      </div>
      <p className="mel-confirmation-desc">{confirmation.description}</p>
      {params.length > 0 && (
        <dl className="mel-confirmation-params">
          {params.map(([key, value]) => (
            <div key={key} className="mel-param-row">
              <dt>{PARAM_LABELS[key] || key}</dt>
              <dd>{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {resolved ? (
        <p className="mel-confirmation-resolved small mb-0">
          {resolved === 'accepted' ? 'Acción confirmada.' : 'Acción cancelada.'}
        </p>
      ) : (
        <div className="d-flex gap-2 mt-3">
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={onAccept}
            disabled={busy}
          >
            {busy ? 'Ejecutando...' : 'Aceptar'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Resumen de las herramientas que ejecutó el agente en este turno.
 */
export function ToolResultsCard({ tools = [] }) {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="mel-tool-card" aria-label="Resultados de herramientas">
      <div className="mel-tool-head">
        <ToolIcon />
        <span>{tools.length === 1 ? 'Acción ejecutada' : `${tools.length} acciones ejecutadas`}</span>
      </div>
      <ul className="mel-tool-list">
        {tools.map((tool, index) => (
          <li key={`${tool.tool}-${index}`} className="mel-tool-item">
            <span className={`mel-tool-status ${tool.success ? 'is-ok' : 'is-error'}`}>
              {tool.success ? <CheckIcon /> : <CrossIcon />}
            </span>
            <span className="mel-tool-name">{tool.tool}</span>
            <span className="mel-tool-summary">{tool.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ERROR_TITLES = {
  quota_exhausted: 'Cuota de IA agotada',
  rate_limit: 'Límite de solicitudes',
  invalid_api_key: 'API key inválida',
  connection_error: 'Sin conexión con el proveedor',
  provider_error: 'Error del proveedor de IA',
  provider_unavailable: 'Proveedor no disponible',
  unexpected_error: 'Error inesperado de la IA',
};

/**
 * Aviso de error diferenciado: la cuota agotada y el rate limit se
 * explican de forma distinta, y siempre se recuerda que el resto de la
 * app sigue funcionando con datos reales.
 */
export function AgentErrorBanner({ errorCode, message }) {
  if (!errorCode && !message) return null;

  const title = ERROR_TITLES[errorCode] || ERROR_TITLES.unexpected_error;
  const isQuota = errorCode === 'quota_exhausted';

  return (
    <div className={`mel-error-banner ${isQuota ? 'is-quota' : ''}`} role="alert">
      <div className="mel-error-head">
        <AlertIcon />
        <strong>{title}</strong>
      </div>
      <p className="mb-1 small">{message}</p>
      {isQuota && (
        <p className="mb-0 smaller text-muted-tf">
          Tus materias, tareas y horarios siguen disponibles: TaskFlow funciona
          sin la IA.
        </p>
      )}
    </div>
  );
}

export default ConfirmationCard;
