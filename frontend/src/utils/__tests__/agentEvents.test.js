import { describe, it, expect, vi } from 'vitest';
import {
  AGENT_EVENT_DELAY_MS,
  AGENT_FAST_EVENT_DELAY_MS,
  replayAgentEvents,
  summarizeToolResult,
} from '../agentEvents';

/** Sleep falso que registra las pausas sin esperar de verdad. */
function makeSleep() {
  const pauses = [];
  const sleep = vi.fn((ms) => {
    pauses.push(ms);
    return Promise.resolve();
  });
  return { sleep, pauses };
}

describe('replayAgentEvents', () => {
  it('no hace nada si los eventos no son una lista', async () => {
    const sendEvent = vi.fn();
    await replayAgentEvents(null, sendEvent, { sleep: vi.fn() });
    await replayAgentEvents(undefined, sendEvent, { sleep: vi.fn() });
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('no hace nada si sendEvent no es una función', async () => {
    const { sleep } = makeSleep();
    await expect(replayAgentEvents([{ type: 'tool_started' }], null, { sleep })).resolves.toBeUndefined();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('envía los eventos en orden con el payload completo', async () => {
    const { sleep } = makeSleep();
    const sendEvent = vi.fn();
    const events = [
      { type: 'query_received' },
      { type: 'tool_started', tool: 'list_tasks' },
      { type: 'tool_result', tool: 'list_tasks', success: true },
      { type: 'action_completed' },
    ];

    await replayAgentEvents(events, sendEvent, { sleep });

    expect(sendEvent.mock.calls.map((call) => call[0])).toEqual([
      'query_received',
      'tool_started',
      'tool_result',
      'action_completed',
    ]);
    expect(sendEvent).toHaveBeenNthCalledWith(2, 'tool_started', events[1]);
  });

  it('usa la pausa rápida para eventos de herramienta y la general para el resto', async () => {
    const { sleep, pauses } = makeSleep();
    await replayAgentEvents(
      [
        { type: 'query_received' },
        { type: 'tool_started' },
        { type: 'tool_result' },
        { type: 'action_completed' },
      ],
      vi.fn(),
      { sleep },
    );

    expect(pauses).toEqual([
      AGENT_EVENT_DELAY_MS,
      AGENT_FAST_EVENT_DELAY_MS,
      AGENT_FAST_EVENT_DELAY_MS,
      AGENT_EVENT_DELAY_MS,
    ]);
  });

  it('respeta pausas personalizadas', async () => {
    const { sleep, pauses } = makeSleep();
    await replayAgentEvents(
      [{ type: 'query_received' }, { type: 'tool_started' }],
      vi.fn(),
      { delayMs: 50, fastDelayMs: 10, sleep },
    );
    expect(pauses).toEqual([50, 10]);
  });

  it('no espera cuando la pausa es cero', async () => {
    const { sleep } = makeSleep();
    const sendEvent = vi.fn();
    await replayAgentEvents(
      [{ type: 'query_received' }, { type: 'tool_started' }],
      sendEvent,
      { delayMs: 0, fastDelayMs: 0, sleep },
    );
    expect(sendEvent).toHaveBeenCalledTimes(2);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('ignora eventos inválidos sin cortar la reproducción', async () => {
    const { sleep } = makeSleep();
    const sendEvent = vi.fn();
    await replayAgentEvents(
      [null, {}, { type: 42 }, { type: 'action_completed' }],
      sendEvent,
      { sleep },
    );
    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent).toHaveBeenCalledWith('action_completed', { type: 'action_completed' });
  });
});

describe('summarizeToolResult', () => {
  it('usa el mensaje devuelto por la herramienta', () => {
    expect(
      summarizeToolResult({
        tool: 'create_task',
        success: true,
        data: { message: 'Tarea creada' },
      }),
    ).toEqual({ tool: 'create_task', success: true, summary: 'Tarea creada' });
  });

  it('resume listas de elementos', () => {
    expect(
      summarizeToolResult({ tool: 'list_tasks', success: true, data: [{}, {}, {}] }),
    ).toEqual({ tool: 'list_tasks', success: true, summary: '3 elemento(s)' });
  });

  it('resume conflictos detectados', () => {
    expect(
      summarizeToolResult({
        tool: 'check_schedule_conflicts',
        success: true,
        data: { conflicts: [{}, {}] },
      }),
    ).toEqual({
      tool: 'check_schedule_conflicts',
      success: true,
      summary: '2 conflicto(s) detectado(s)',
    });
  });

  it('avisa cuando no hay plan semanal activo', () => {
    expect(
      summarizeToolResult({ tool: 'get_weekly_plan', success: true, data: { has_plan: false } }),
    ).toEqual({ tool: 'get_weekly_plan', success: true, summary: 'No hay plan semanal activo' });
  });

  it('cae en "Listo" cuando tuvo éxito sin datos resumibles', () => {
    expect(summarizeToolResult({ tool: 'complete_task', success: true })).toEqual({
      tool: 'complete_task',
      success: true,
      summary: 'Listo',
    });
  });

  it('muestra el error cuando la herramienta falló', () => {
    expect(
      summarizeToolResult({ tool: 'update_task', success: false, error: 'Tarea no encontrada' }),
    ).toEqual({ tool: 'update_task', success: false, summary: 'Tarea no encontrada' });
  });

  it('usa un nombre genérico si falta la herramienta', () => {
    expect(summarizeToolResult({ success: false }).tool).toBe('herramienta');
    expect(summarizeToolResult(null)).toEqual({
      tool: 'herramienta',
      success: false,
      summary: 'No se pudo completar',
    });
  });
});
