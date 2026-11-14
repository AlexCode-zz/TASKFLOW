/**
 * Reproducción temporizada de los eventos del agente.
 *
 * El backend devuelve todos los eventos de un turno en la respuesta
 * HTTP; para que la secuencia de estados de Mel se aprecie sin saltos
 * se reproducen uno a uno con una pequeña pausa entre ellos. La lógica
 * es pura y recibe `sleep` inyectable para poder probarla sin esperas.
 */

/** Pausa por defecto entre eventos del agente (ms). */
export const AGENT_EVENT_DELAY_MS = 260;

/** Pausa por defecto para eventos que cambian de estado rápido (ms). */
export const AGENT_FAST_EVENT_DELAY_MS = 120;

/** Eventos que pueden mostrarse casi de inmediato. */
const FAST_EVENTS = new Set(['tool_started', 'tool_result']);

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reproduce una lista de eventos llamando a `sendEvent` en orden.
 *
 * @param {Array<{type: string}>} events eventos del backend
 * @param {(type: string, payload: object) => void} sendEvent
 * @param {object} options
 * @param {number} options.delayMs pausa general entre eventos
 * @param {number} options.fastDelayMs pausa para eventos rápidos
 * @param {(ms: number) => Promise<void>} options.sleep espera inyectable
 * @returns {Promise<void>}
 */
export async function replayAgentEvents(
  events,
  sendEvent,
  { delayMs = AGENT_EVENT_DELAY_MS, fastDelayMs = AGENT_FAST_EVENT_DELAY_MS, sleep = defaultSleep } = {},
) {
  if (!Array.isArray(events) || typeof sendEvent !== 'function') return;

  for (const event of events) {
    if (!event || typeof event.type !== 'string') continue;
    sendEvent(event.type, event);
    const pause = FAST_EVENTS.has(event.type) ? fastDelayMs : delayMs;
    if (pause > 0) {
      await sleep(pause);
    }
  }
}

/**
 * Resumen legible del resultado de una herramienta para las tarjetas.
 *
 * @param {object} result resultado devuelto por el backend
 * @returns {{tool: string, success: boolean, summary: string}}
 */
export function summarizeToolResult(result) {
  const tool = result?.tool || 'herramienta';
  const success = Boolean(result?.success);
  const data = result?.data;

  let summary = '';
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.message === 'string' && data.message) {
      summary = data.message;
    } else if (Array.isArray(data.conflicts) && data.conflicts.length > 0) {
      summary = `${data.conflicts.length} conflicto(s) detectado(s)`;
    } else if (data.has_plan === false) {
      summary = 'No hay plan semanal activo';
    }
  } else if (Array.isArray(data)) {
    summary = `${data.length} elemento(s)`;
  }

  if (!summary) {
    summary = success ? 'Listo' : result?.error || 'No se pudo completar';
  }

  return { tool, success, summary };
}
