/**
 * Máquina de estados centralizada del asistente académico Mel.
 *
 * Un único punto de verdad decide qué expresión muestra el avatar en
 * cada momento: los eventos del backend (consulta, herramienta, error,
 * cuota agotada...) se traducen a estados con prioridad, y solo se
 * acepta una transición si la prioridad del destino lo permite o si la
 * duración mínima del estado actual ya se cumplió. Así se evita que
 * eventos distintos cambien el avatar de forma descontrolada.
 *
 * Este módulo es puro (sin React ni temporizadores) para poder
 * probarlo de forma aislada; la orquestación de temporizadores vive en
 * el hook `useAssistantState`.
 */

/** Tiempo de inactividad antes de dormir (ms). */
export const IDLE_TIMEOUT_MS = 60000;

/** Duración del estado previo "durmiéndose" antes de dormir (ms). */
export const SLEEP_TRANSITION_MS = 2500;

/** Duración por defecto de una expresión ocasional (ms). */
export const OCCASIONAL_DEFAULT_MS = 2200;

/** Estados de la máquina: expresión, prioridad, duración mínima y retorno a idle. */
export const ASSISTANT_STATES = {
  sleeping: {
    expression: 'dormida',
    priority: 1,
    minDurationMs: 0,
    label: 'Durmiendo',
    autoReturn: false,
  },
  idle: {
    expression: 'normal',
    priority: 2,
    minDurationMs: 0,
    label: 'Lista para ayudar',
    autoReturn: false,
  },
  greeting: {
    expression: 'guino',
    priority: 3,
    minDurationMs: 2200,
    label: 'Saludando',
    autoReturn: true,
  },
  explaining: {
    expression: 'enojada',
    priority: 4,
    minDurationMs: 4000,
    label: 'Explicando información importante',
    autoReturn: true,
  },
  thinking: {
    expression: 'trabajando',
    priority: 5,
    minDurationMs: 0,
    label: 'Pensando tu consulta',
    autoReturn: false,
  },
  success: {
    expression: 'feliz',
    priority: 6,
    minDurationMs: 2400,
    label: 'Acción completada',
    autoReturn: true,
  },
  conflict: {
    expression: 'enojada',
    priority: 7,
    minDurationMs: 3200,
    label: 'Conflicto detectado',
    autoReturn: true,
  },
  error: {
    expression: 'enojada',
    priority: 7,
    minDurationMs: 3200,
    label: 'Algo salió mal',
    autoReturn: true,
  },
  working: {
    expression: 'trabajando',
    priority: 8,
    minDurationMs: 0,
    label: 'Trabajando',
    autoReturn: false,
  },
  quota_exhausted: {
    expression: 'llorando',
    priority: 9,
    minDurationMs: 6000,
    label: 'Límite de uso de la IA alcanzado',
    autoReturn: true,
  },
};

export const STATE_KEYS = Object.keys(ASSISTANT_STATES);

/** Estados durante los que el agente está ocupado (no debe dormir). */
export const BUSY_STATES = ['thinking', 'working'];

/**
 * Comprueba si un estado está ocupado ejecutando una operación.
 *
 * @param {string} state
 * @returns {boolean}
 */
export function isBusyState(state) {
  return BUSY_STATES.includes(state);
}

/**
 * Determina si la transición entre dos estados está permitida.
 *
 * Reglas:
 * - Un estado con prioridad mayor interrumpe al actual de inmediato.
 * - Un estado con prioridad menor o igual solo se acepta si la duración
 *   mínima del estado actual ya transcurrió (evita cambios rápidos y
 *   repetitivos de expresión).
 * - `idle` solo se alcanza mediante retorno automático del estado
 *   efímero o por actividad del usuario (siempre con `force`).
 * - `force` omite todas las reglas.
 *
 * @param {string} current estado actual
 * @param {string} target estado destino
 * @param {number} elapsedMs milisegundos transcurridos en el estado actual
 * @param {object} options
 * @param {boolean} options.force ignora prioridad y duración mínima
 * @returns {boolean}
 */
export function canTransition(current, target, elapsedMs, { force = false } = {}) {
  const from = ASSISTANT_STATES[current];
  const to = ASSISTANT_STATES[target];
  if (!from || !to) return false;
  if (current === target) return false;
  if (force) return true;
  if (target === 'idle') return false;
  if (to.priority > from.priority) return true;
  return elapsedMs >= from.minDurationMs;
}

/**
 * Calcula el siguiente estado tras intentar una transición.
 *
 * @param {string} current estado actual
 * @param {number} since marca temporal (ms) en la que entró al estado actual
 * @param {string} target estado destino
 * @param {number} now marca temporal actual (ms)
 * @param {object} options opciones de canTransition
 * @returns {string} el estado resultante (puede ser el mismo)
 */
export function resolveState(current, since, target, now, options) {
  if (current === target) return current;
  const elapsed = now - since;
  return canTransition(current, target, elapsed, options) ? target : current;
}

/**
 * Traduce un evento real del agente al estado destino de la máquina.
 * Los eventos marcados como `force` reflejan decisiones del usuario o
 * situaciones graves que deben verse de inmediato.
 */
export const EVENT_STATE_MAP = {
  query_received: { state: 'thinking', force: true },
  tool_started: { state: 'working' },
  tool_result: { state: 'working' },
  conflict_detected: { state: 'conflict', force: true },
  confirmation_required: { state: 'explaining', force: true },
  action_completed: { state: 'success', force: true },
  explanation: { state: 'explaining', force: true },
  quota_exhausted: { state: 'quota_exhausted', force: true },
  provider_error: { state: 'error', force: true },
  backend_error: { state: 'error', force: true },
};

/**
 * Eventos que muestran una expresión ocasional sin interrumpir el
 * estado importante en curso. Se reutilizan las expresiones oficiales
 * del catálogo de los 7 PNG disponibles.
 */
export const EVENT_OCCASIONAL_MAP = {
  informal: 'guino',
  ambiguous_query: 'normal',
  unexpected_query: 'feliz',
  overload_detected: 'enojada',
  tool_recovered: 'feliz',
  backend_unavailable: 'enojada',
};

/**
 * Devuelve el estado destino que produce un evento del agente
 * (o null si el evento no cambia el estado).
 *
 * @param {string} eventType
 * @param {object} payload datos del evento
 * @returns {{ state: string, force: boolean } | null}
 */
export function mapEventToState(eventType, payload = {}) {
  if (eventType === 'tool_result' && payload.success === false) {
    return { state: 'error', force: true };
  }
  const mapping = EVENT_STATE_MAP[eventType];
  if (!mapping) return null;
  return { state: mapping.state, force: Boolean(mapping.force) };
}

/**
 * Devuelve la expresión ocasional asociada a un evento del agente
 * (o null si el evento no tiene expresión ocasional).
 *
 * @param {string} eventType
 * @returns {string | null}
 */
export function mapEventToOccasional(eventType) {
  return EVENT_OCCASIONAL_MAP[eventType] || null;
}

/**
 * Estados en los que se permite una expresión ocasional: solo cuando
 * el asistente no está ejecutando nada importante.
 *
 * @param {string} state
 * @returns {boolean}
 */
export function allowsOccasional(state) {
  return state === 'idle' || state === 'greeting' || state === 'explaining';
}
