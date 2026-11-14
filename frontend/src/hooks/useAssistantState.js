import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ASSISTANT_STATES,
  IDLE_TIMEOUT_MS,
  SLEEP_TRANSITION_MS,
  OCCASIONAL_DEFAULT_MS,
  isBusyState,
  allowsOccasional,
  mapEventToOccasional,
  mapEventToState,
  resolveState,
} from '../utils/assistantMachine';

/**
 * Hook de la máquina de estados del asistente Mel.
 *
 * Orquesta sobre la lógica pura de `assistantMachine.js`:
 * - transiciones con prioridad y duración mínima entre estados,
 * - retorno automático a `idle` de los estados efímeros,
 * - temporizador de inactividad: tras 60s sin actividad Mel se duerme
 *   (pasando por la transición visual "dormida" y volviendo a
 *   `normal` con cualquier interacción),
 * - expresiones ocasionales (guino, normal, feliz, enojada, ...) que
 *   no interrumpen estados importantes.
 *
 * El temporizador de inactividad nunca duerme al agente mientras esté
 * ocupado (`thinking`/`working`), y toda interacción del usuario lo
 * reinicia.
 *
 * @param {object} options
 * @param {number} options.idleTimeoutMs tiempo de inactividad para dormir
 * @returns {object} estado, expresión, etiqueta y acciones de la máquina
 */
const useAssistantState = ({ idleTimeoutMs = IDLE_TIMEOUT_MS } = {}) => {
  const [state, setState] = useState('idle');
  const [occasional, setOccasional] = useState(null);

  const stateRef = useRef({ state: 'idle', since: Date.now() });
  const timers = useRef({
    idle: null,
    sleep: null,
    occasional: null,
    autoReturn: null,
  });

  const clearTimer = useCallback((name) => {
    if (timers.current[name]) {
      clearTimeout(timers.current[name]);
      timers.current[name] = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    ['idle', 'sleep', 'occasional', 'autoReturn'].forEach(clearTimer);
  }, [clearTimer]);

  /** Duerme a Mel tras el tiempo de inactividad, con transición previa. */
  const scheduleIdleTimer = useCallback(() => {
    clearTimer('idle');
    timers.current.idle = setTimeout(() => {
      if (stateRef.current.state !== 'idle') return;
      // Transición visual previa: dormida -> durmiendo (dormida).
      setOccasional('dormida');
      clearTimer('sleep');
      timers.current.sleep = setTimeout(() => {
        if (stateRef.current.state !== 'idle') return;
        stateRef.current = { state: 'sleeping', since: Date.now() };
        setState('sleeping');
        setOccasional(null);
      }, SLEEP_TRANSITION_MS);
    }, idleTimeoutMs);
  }, [clearTimer, idleTimeoutMs]);

  /** Intenta una transición de estado respetando prioridad y duración. */
  const attemptTransition = useCallback((target, { force = false } = {}) => {
    const current = stateRef.current;
    const next = resolveState(current.state, current.since, target, Date.now(), { force });
    if (next === current.state) return false;

    clearTimer('sleep');
    clearTimer('occasional');
    clearTimer('autoReturn');
    setOccasional(null);

    stateRef.current = { state: next, since: Date.now() };
    setState(next);

    const definition = ASSISTANT_STATES[next];

    // Retorno automático a idle para los estados efímeros.
    if (definition.autoReturn) {
      timers.current.autoReturn = setTimeout(() => {
        if (stateRef.current.state === next) {
          stateRef.current = { state: 'idle', since: Date.now() };
          setState('idle');
          scheduleIdleTimer();
        }
      }, definition.minDurationMs);
    }

    // El temporizador de inactividad solo corre en reposo: nunca
    // interfiere con una operación en curso (thinking/working).
    if (next === 'idle') {
      scheduleIdleTimer();
    } else if (isBusyState(next)) {
      clearTimer('idle');
    }

    return true;
  }, [clearTimer, scheduleIdleTimer]);

  /**
   * Registra actividad del usuario: reinicia el temporizador de
   * inactividad y despierta a Mel si estaba dormida.
   */
  const notifyActivity = useCallback(() => {
    clearTimer('sleep');
    clearTimer('occasional');
    setOccasional(null);

    if (stateRef.current.state === 'sleeping') {
      // Despertar siempre tiene prioridad.
      stateRef.current = { state: 'idle', since: Date.now() };
      setState('idle');
    }

    if (stateRef.current.state === 'idle') {
      scheduleIdleTimer();
    }
  }, [clearTimer, scheduleIdleTimer]);

  /** Muestra una expresión ocasional sin interrumpir estados importantes. */
  const showOccasional = useCallback((expression, durationMs = OCCASIONAL_DEFAULT_MS) => {
    if (!allowsOccasional(stateRef.current.state)) return false;
    clearTimer('occasional');
    setOccasional(expression);
    timers.current.occasional = setTimeout(() => {
      setOccasional(null);
    }, durationMs);
    return true;
  }, [clearTimer]);

  /**
   * Procesa un evento real del agente: cambia el estado y/o muestra
   * una expresión ocasional según el mapeo de la máquina.
   *
   * @param {string} eventType tipo de evento (query_received, ...)
   * @param {object} payload datos adicionales del evento
   */
  const sendAgentEvent = useCallback((eventType, payload = {}) => {
    const occasionalExpression = mapEventToOccasional(eventType);
    if (occasionalExpression) {
      showOccasional(occasionalExpression);
      return;
    }

    const mapping = mapEventToState(eventType, payload);
    if (mapping) {
      attemptTransition(mapping.state, { force: mapping.force });
    }
  }, [attemptTransition, showOccasional]);

  /** Saludo del asistente (con rebote y guiño). */
  const greet = useCallback(() => {
    attemptTransition('greeting', { force: true });
  }, [attemptTransition]);

  // Limpieza al desmontar.
  useEffect(() => {
    scheduleIdleTimer();
    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = isBusyState(state);

  return {
    state,
    status: ASSISTANT_STATES[state]?.label || '',
    expression: occasional || ASSISTANT_STATES[state]?.expression || 'normal',
    occasional,
    busy,
    notifyActivity,
    sendAgentEvent,
    showOccasional,
    greet,
  };
};

export default useAssistantState;
