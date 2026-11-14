import { StrictMode, createElement, useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook, screen, act } from '@testing-library/react';
import useAssistantState from '../useAssistantState';
import { ASSISTANT_STATES, IDLE_TIMEOUT_MS, SLEEP_TRANSITION_MS } from '../../utils/assistantMachine';

describe('useAssistantState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arranca en idle con expresión normal', () => {
    const { result } = renderHook(() => useAssistantState());
    expect(result.current.state).toBe('idle');
    expect(result.current.expression).toBe('normal');
    expect(result.current.busy).toBe(false);
  });

  it('una consulta pasa a thinking y la herramienta a working', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => result.current.sendAgentEvent('query_received'));
    expect(result.current.state).toBe('thinking');
    expect(result.current.expression).toBe('trabajando');

    act(() => result.current.sendAgentEvent('tool_started'));
    expect(result.current.state).toBe('working');
    expect(result.current.expression).toBe('trabajando');
  });

  it('una operación exitosa activa feliz y luego vuelve a normal', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => result.current.sendAgentEvent('query_received'));
    act(() => result.current.sendAgentEvent('tool_started'));
    act(() => result.current.sendAgentEvent('action_completed'));

    expect(result.current.state).toBe('success');
    expect(result.current.expression).toBe('feliz');

    // Tras la duración mínima de success vuelve sola a idle
    act(() => {
      vi.advanceTimersByTime(ASSISTANT_STATES.success.minDurationMs + 10);
    });
    expect(result.current.state).toBe('idle');
    expect(result.current.expression).toBe('normal');
  });

  it('un conflicto activa enojada', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => result.current.sendAgentEvent('conflict_detected'));
    expect(result.current.state).toBe('conflict');
    expect(result.current.expression).toBe('enojada');
  });

  it('el agotamiento de cuota activa llorando aunque esté trabajando', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => result.current.sendAgentEvent('query_received'));
    act(() => result.current.sendAgentEvent('tool_started'));
    act(() => result.current.sendAgentEvent('quota_exhausted'));

    expect(result.current.state).toBe('quota_exhausted');
    expect(result.current.expression).toBe('llorando');
  });

  it('el saludo activa guiño', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => result.current.greet());
    expect(result.current.state).toBe('greeting');
    expect(result.current.expression).toBe('guino');
  });

  it('el saludo vuelve solo a normal tras el doble montaje de StrictMode', () => {
    const Harness = () => {
      const { state, greet } = useAssistantState();
      useEffect(() => {
        greet();
      }, [greet]);
      return createElement('span', { 'data-testid': 'state' }, state);
    };

    render(createElement(StrictMode, null, createElement(Harness)));
    expect(screen.getByTestId('state')).toHaveTextContent('greeting');

    act(() => {
      vi.advanceTimersByTime(ASSISTANT_STATES.greeting.minDurationMs + 10);
    });
    expect(screen.getByTestId('state')).toHaveTextContent('idle');
  });

  it('se duerme tras 60s de inactividad con la expresión dormida', () => {
    const { result } = renderHook(() => useAssistantState());

    // Sin actividad durante el minuto completo
    act(() => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS);
    });
    expect(result.current.expression).toBe('dormida');
    expect(result.current.state).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(SLEEP_TRANSITION_MS);
    });
    expect(result.current.state).toBe('sleeping');
    expect(result.current.expression).toBe('dormida');
  });

  it('vuelve a normal al detectar actividad tras dormir', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS + SLEEP_TRANSITION_MS);
    });
    expect(result.current.state).toBe('sleeping');

    act(() => result.current.notifyActivity());
    expect(result.current.state).toBe('idle');
    expect(result.current.expression).toBe('normal');
  });

  it('la actividad reinicia el temporizador de inactividad', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS - 1000);
    });
    act(() => result.current.notifyActivity());
    act(() => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS - 1000);
    });
    expect(result.current.state).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.expression).toBe('dormida');
  });

  it('el temporizador de inactividad no interrumpe una operación en curso', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => result.current.sendAgentEvent('query_received'));
    act(() => result.current.sendAgentEvent('tool_started'));

    act(() => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS * 2);
    });
    // Sigue trabajando: la operación tiene prioridad sobre el sueño
    expect(result.current.state).toBe('working');
    expect(result.current.expression).toBe('trabajando');
  });

  it('una expresión ocasional no interrumpe un estado importante', () => {
    const { result } = renderHook(() => useAssistantState());

    act(() => result.current.sendAgentEvent('query_received'));
    act(() => result.current.sendAgentEvent('tool_started'));

    let shown = null;
    act(() => {
      shown = result.current.showOccasional('feliz');
    });
    expect(shown).toBe(false);
    expect(result.current.expression).toBe('trabajando');

    // En reposo sí se permite
    act(() => {
      vi.advanceTimersByTime(10);
    });
    act(() => result.current.sendAgentEvent('action_completed'));
    act(() => {
      vi.advanceTimersByTime(ASSISTANT_STATES.success.minDurationMs + 10);
    });
    expect(result.current.state).toBe('idle');
    act(() => result.current.sendAgentEvent('informal'));
    expect(result.current.expression).toBe('guino');
    expect(result.current.state).toBe('idle');
  });
});
