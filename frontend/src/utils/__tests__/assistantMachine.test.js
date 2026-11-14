import { describe, it, expect } from 'vitest';
import {
  ASSISTANT_STATES,
  STATE_KEYS,
  IDLE_TIMEOUT_MS,
  isBusyState,
  canTransition,
  resolveState,
  mapEventToState,
  mapEventToOccasional,
  allowsOccasional,
} from '../assistantMachine';

describe('assistantMachine: definición de estados', () => {
  it('define los 10 estados principales', () => {
    expect(STATE_KEYS).toEqual(
      expect.arrayContaining([
        'idle',
        'greeting',
        'thinking',
        'working',
        'explaining',
        'success',
        'conflict',
        'error',
        'sleeping',
        'quota_exhausted',
      ])
    );
    expect(STATE_KEYS).toHaveLength(10);
  });

  it('asigna expresiones válidas y coherentes por estado', () => {
    STATE_KEYS.forEach((k) => {
      expect(ASSISTANT_STATES[k].expression).toBeTruthy();
      expect(typeof ASSISTANT_STATES[k].priority).toBe('number');
    });
    // Pensar y trabajar son el mismo momento del personaje: comparten
    // la expresión "trabajando" del catálogo de los 7 PNG.
    expect(ASSISTANT_STATES.thinking.expression).toBe('trabajando');
    expect(ASSISTANT_STATES.working.expression).toBe('trabajando');
  });

  it('mapea cada estado a la expresión requerida', () => {
    expect(ASSISTANT_STATES.idle.expression).toBe('normal');
    expect(ASSISTANT_STATES.greeting.expression).toBe('guino');
    expect(ASSISTANT_STATES.thinking.expression).toBe('trabajando');
    expect(ASSISTANT_STATES.working.expression).toBe('trabajando');
    expect(ASSISTANT_STATES.explaining.expression).toBe('enojada');
    expect(ASSISTANT_STATES.success.expression).toBe('feliz');
    expect(ASSISTANT_STATES.conflict.expression).toBe('enojada');
    expect(ASSISTANT_STATES.error.expression).toBe('enojada');
    expect(ASSISTANT_STATES.sleeping.expression).toBe('dormida');
    expect(ASSISTANT_STATES.quota_exhausted.expression).toBe('llorando');
  });

  it('usa un temporizador de inactividad de 60 segundos', () => {
    expect(IDLE_TIMEOUT_MS).toBe(60000);
  });

  it('identifica thinking y working como estados ocupados', () => {
    expect(isBusyState('thinking')).toBe(true);
    expect(isBusyState('working')).toBe(true);
    expect(isBusyState('idle')).toBe(false);
    expect(isBusyState('sleeping')).toBe(false);
  });
});

describe('assistantMachine: transiciones', () => {
  it('permite que un estado de mayor prioridad interrumpa al actual', () => {
    // working (8) interrumpe a thinking (5)
    expect(canTransition('thinking', 'working', 0)).toBe(true);
    // quota_exhausted (9) interrumpe a working (8)
    expect(canTransition('working', 'quota_exhausted', 0)).toBe(true);
    // conflict (7) interrumpe a idle (2)
    expect(canTransition('idle', 'conflict', 0)).toBe(true);
  });

  it('bloquea estados de menor prioridad durante la duración mínima', () => {
    // explaining (4) no interrumpe a success (6) antes de su duración mínima
    expect(canTransition('success', 'explaining', 0)).toBe(false);
  });

  it('acepta estados de menor prioridad tras la duración mínima', () => {
    // thinking (5) permite explaining (4) al cumplir su duración mínima de 0
    expect(canTransition('thinking', 'explaining', 0)).toBe(true);
    // success (6) permite explaining (4) tras su duración mínima
    expect(canTransition('success', 'explaining', ASSISTANT_STATES.success.minDurationMs)).toBe(true);
  });

  it('al terminar una operación, success entra de inmediato (working sin duración mínima)', () => {
    expect(ASSISTANT_STATES.working.minDurationMs).toBe(0);
    expect(canTransition('working', 'success', 0)).toBe(true);
  });

  it('idle solo se alcanza por retorno automático o actividad forzada', () => {
    expect(canTransition('success', 'idle', ASSISTANT_STATES.success.minDurationMs)).toBe(false);
    expect(canTransition('working', 'idle', 9999)).toBe(false);
    expect(canTransition('sleeping', 'idle', 0, { force: true })).toBe(true);
  });

  it('force omite prioridad y duración (actividad del usuario)', () => {
    expect(canTransition('working', 'idle', 0, { force: true })).toBe(true);
    expect(canTransition('sleeping', 'idle', 0, { force: true })).toBe(true);
  });

  it('la actividad del usuario despierta a sleeping (con fuerza, sin esperar)', () => {
    expect(canTransition('sleeping', 'idle', 0)).toBe(false);
    expect(canTransition('sleeping', 'idle', 0, { force: true })).toBe(true);
  });

  it('resolveState devuelve el mismo estado si la transición no es válida', () => {
    expect(resolveState('success', 1000, 'explaining', 1000)).toBe('success');
    expect(
      resolveState('success', 1000, 'explaining', 1000 + ASSISTANT_STATES.success.minDurationMs)
    ).toBe('explaining');
    expect(resolveState('working', 1000, 'quota_exhausted', 1500)).toBe('quota_exhausted');
    expect(resolveState('sleeping', 1000, 'no_existe', 2000)).toBe('sleeping');
  });

  it('rechaza estados o transiciones inválidas', () => {
    expect(canTransition('no_existe', 'idle', 0)).toBe(false);
    expect(canTransition('idle', 'no_existe', 0)).toBe(false);
    expect(canTransition('idle', 'idle', 0)).toBe(false);
  });
});

describe('assistantMachine: eventos del agente', () => {
  it('una consulta activa thinking y luego working refleja el trabajo real', () => {
    expect(mapEventToState('query_received')).toEqual({ state: 'thinking', force: true });
    expect(mapEventToState('tool_started')).toEqual({ state: 'working', force: false });
  });

  it('una operación completada activa success (feliz)', () => {
    expect(mapEventToState('action_completed').state).toBe('success');
  });

  it('un conflicto de horarios activa conflict (enojada)', () => {
    expect(mapEventToState('conflict_detected').state).toBe('conflict');
  });

  it('una explicación importante activa explaining (enojada)', () => {
    expect(mapEventToState('explanation').state).toBe('explaining');
  });

  it('el agotamiento de cuota activa quota_exhausted (llorando)', () => {
    expect(mapEventToState('quota_exhausted').state).toBe('quota_exhausted');
  });

  it('un resultado de herramienta fallido activa error', () => {
    expect(mapEventToState('tool_result', { success: false })).toEqual({ state: 'error', force: true });
    expect(mapEventToState('tool_result', { success: true }).state).toBe('working');
  });

  it('los eventos ocasionales no cambian el estado principal', () => {
    expect(mapEventToState('informal')).toBeNull();
    expect(mapEventToOccasional('informal')).toBe('guino');
    expect(mapEventToOccasional('ambiguous_query')).toBe('normal');
    expect(mapEventToOccasional('unexpected_query')).toBe('feliz');
    expect(mapEventToOccasional('overload_detected')).toBe('enojada');
    expect(mapEventToOccasional('tool_recovered')).toBe('feliz');
    expect(mapEventToOccasional('backend_unavailable')).toBe('enojada');
  });

  it('las expresiones ocasionales solo se permiten en estados tranquilos', () => {
    expect(allowsOccasional('idle')).toBe(true);
    expect(allowsOccasional('working')).toBe(false);
    expect(allowsOccasional('thinking')).toBe(false);
    expect(allowsOccasional('quota_exhausted')).toBe(false);
  });
});
