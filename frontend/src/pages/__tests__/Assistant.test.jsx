import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Assistant from '../Assistant';
import api from '../../services/api';
import { replayAgentEvents } from '../../utils/agentEvents';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/agentEvents', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, replayAgentEvents: vi.fn(() => Promise.resolve()) };
});

const PROVIDER = {
  provider_name: 'openrouter',
  model: 'openai/gpt-4o-mini',
  is_configured: true,
  is_active: true,
};

const CHAT_RESPONSE = {
  conversation_id: 'conv-1',
  message_id: 'msg-1',
  message: 'Tienes 2 tareas pendientes.',
  provider_name: 'openrouter',
  model: 'openai/gpt-4o-mini',
  events: [
    { type: 'query_received' },
    { type: 'tool_started', tool: 'list_tasks' },
    { type: 'tool_result', tool: 'list_tasks', success: true },
    { type: 'explanation' },
  ],
  tools_executed: [{ tool: 'list_tasks', success: true, data: [{}, {}] }],
  confirmation: null,
  error_code: null,
};

const CONFIRMATION = {
  action_id: 'act-1',
  tool: 'update_subject',
  description: 'Actualizar la materia Cálculo',
  parameters: { subject: 'Cálculo', grade: 82, confirmed: true },
};

const CHAT_WITH_CONFIRMATION = {
  ...CHAT_RESPONSE,
  message: 'Puedo actualizar la materia si me confirmas.',
  tools_executed: [],
  confirmation: CONFIRMATION,
};

const CONFIRM_RESPONSE = {
  conversation_id: 'conv-1',
  message: 'Listo, actualicé la materia.',
  success: true,
  events: [{ type: 'action_completed' }],
  tools_executed: [],
  confirmation: null,
  error_code: null,
};

/** Simula la carga inicial de proveedores y conversaciones. */
function mockInitialLoad(providers = [PROVIDER]) {
  api.get.mockImplementation((url) => {
    if (url === '/ai/providers') return Promise.resolve({ data: providers });
    return Promise.resolve({ data: [] });
  });
}

/** Escribe y envía un mensaje en el cuadro de texto. */
async function sendMessage(text, placeholder = 'Escribe tu consulta académica...') {
  const input = await screen.findByPlaceholderText(placeholder);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
}

describe('Assistant (Mel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialLoad();
  });

  it('presenta a Mel con su avatar, estado y proveedor activo', async () => {
    const { container } = render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'MEL' })).toBeInTheDocument();
    expect(
      screen.getByText('Organiza materias, tareas, notas y tu semana de estudio.'),
    ).toBeInTheDocument();
    expect(container.querySelector('.mel-avatar')).toBeInTheDocument();

    await screen.findByText('OpenRouter');
    expect(container.querySelector('.mel-provider-chip')).toHaveAttribute(
      'title',
      'OpenRouter',
    );
  });

  it('envía la consulta al endpoint del agente y muestra la respuesta real', async () => {
    api.post.mockResolvedValue({ data: CHAT_RESPONSE });
    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    await sendMessage('¿Qué tareas tengo pendientes?');

    await screen.findByText('Tienes 2 tareas pendientes.');

    expect(api.post).toHaveBeenCalledWith(
      '/ai/agent/chat',
      expect.objectContaining({
        message: '¿Qué tareas tengo pendientes?',
        provider_name: 'openrouter',
        use_academic_context: true,
      }),
    );

    // Los eventos se reproducen con pacing para animar a Mel.
    expect(replayAgentEvents).toHaveBeenCalledWith(
      CHAT_RESPONSE.events,
      expect.any(Function),
    );

    // La tarjeta resume la herramienta ejecutada con datos reales.
    expect(screen.getByText('Acción ejecutada')).toBeInTheDocument();
    expect(screen.getByText('list_tasks')).toBeInTheDocument();
    expect(screen.getByText('2 elemento(s)')).toBeInTheDocument();
  });

  it('aceptar una confirmación ejecuta la acción solo una vez', async () => {
    api.post
      .mockResolvedValueOnce({ data: CHAT_WITH_CONFIRMATION })
      .mockResolvedValueOnce({ data: CONFIRM_RESPONSE });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );
    await sendMessage('Actualiza mi nota de Cálculo');

    await screen.findByText('Necesito tu confirmación');
    expect(screen.getByText('Actualizar la materia Cálculo')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));

    await screen.findByText('Acción confirmada.');
    await screen.findByText('Listo, actualicé la materia.');

    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/ai/agent/confirm',
      expect.objectContaining({ action_id: 'act-1', decision: 'accept' }),
    );
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument();
  });

  it('cancelar una confirmación no ejecuta la acción', async () => {
    api.post
      .mockResolvedValueOnce({ data: CHAT_WITH_CONFIRMATION })
      .mockResolvedValueOnce({
        data: { ...CONFIRM_RESPONSE, message: 'No cambié nada.' },
      });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );
    await sendMessage('Actualiza mi nota de Cálculo');

    await screen.findByText('Necesito tu confirmación');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await screen.findByText('Acción cancelada.');
    await screen.findByText('No cambié nada.');

    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/ai/agent/confirm',
      expect.objectContaining({ action_id: 'act-1', decision: 'cancel' }),
    );
  });

  it('muestra el aviso de cuota agotada sin ocultar que la app funciona sin IA', async () => {
    api.post.mockResolvedValue({
      data: {
        ...CHAT_RESPONSE,
        message: 'No pude consultar al proveedor.',
        tools_executed: [],
        error_code: 'quota_exhausted',
      },
    });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );
    await sendMessage('Dame mi informe académico');

    await screen.findByText('Cuota de IA agotada');
    expect(screen.getByText(/TaskFlow funciona\s+sin la IA/)).toBeInTheDocument();
  });

  it('informa un error del backend sin inventar una respuesta', async () => {
    api.post.mockRejectedValue({
      response: { status: 500, data: { detail: 'Error interno del servidor' } },
    });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );
    const input = await screen.findByPlaceholderText('Escribe tu consulta académica...');
    fireEvent.change(input, { target: { value: 'Dame mi informe académico' } });
    // El rechazo de la petición resuelve en un microtask: se espera dentro
    // de act para que las actualizaciones de estado queden cubiertas.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    });

    await screen.findByText('Error interno del servidor');
    expect(screen.queryByText(/Listo/)).not.toBeInTheDocument();

    // Espera a que termine el envío para no dejar actualizaciones pendientes.
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText('Escribe tu consulta académica...'),
      ).not.toBeDisabled(),
    );
  });

  it('sin proveedor configurado muestra el botón de configuración inicial', async () => {
    mockInitialLoad([]);
    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    await screen.findByText('Conecta a Mel con un proveedor de IA');
    expect(
      screen.getByRole('button', { name: 'Configurar proveedor de IA' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Escribe tu consulta académica...'),
    ).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('abre el modal para agregar proveedor y API key', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/ai/providers/available') {
        return Promise.resolve({ data: ['openrouter', 'openai'] });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Configurar proveedor de IA' }),
    );

    expect(
      await screen.findByRole('dialog', { name: 'Agregar proveedor de IA' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Proveedor')).toBeInTheDocument();
    expect(screen.getByLabelText('API key')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Modelo/)).not.toBeInTheDocument();
  });

  it('ofrece cambiar de proveedor desde la cabecera', async () => {
    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    const changeLink = await screen.findByRole('link', { name: 'Cambiar' });
    expect(changeLink).toHaveAttribute('href', '/proveedores-ia');
  });

  it('abre el menu de conversaciones con el boton hamburguesa', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/ai/providers') return Promise.resolve({ data: [PROVIDER] });
      if (url === '/ai/conversations') {
        return Promise.resolve({
          data: [
            {
              id: 2,
              title: 'Cambio de nombres',
              provider_name: 'openrouter',
              model: 'openai/gpt-4o-mini',
              updated_at: '2026-11-12T02:44:00.000Z',
            },
            {
              id: 1,
              title: '¿Qué tareas tengo pendientes?',
              provider_name: 'openrouter',
              model: 'openai/gpt-4o-mini',
              updated_at: '2026-11-11T20:00:00.000Z',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter>
        <Assistant />
      </MemoryRouter>,
    );

    // Sin el menu abierto, el chat ocupa todo el espacio.
    expect(await screen.findByText('Cambio de nombres')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Conversaciones/i }));

    // El menu muestra las conversaciones más recientes primero.
    expect(await screen.findByText('¿Qué tareas tengo pendientes?')).toBeInTheDocument();
    expect(screen.getAllByText('Cambio de nombres').length).toBeGreaterThan(0);

    // No se muestra el proveedor dentro de cada conversación.
    expect(screen.queryByText(/openai\/gpt-4o-mini/)).not.toBeInTheDocument();
  });
});
