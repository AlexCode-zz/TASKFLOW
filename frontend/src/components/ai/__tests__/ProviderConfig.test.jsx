import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProviderConfig from '../ProviderConfig';
import api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

let providerList;

const initialProviders = () => [
  {
    provider_name: 'openrouter',
    model: 'openai/gpt-4o-mini',
    is_active: true,
    is_configured: true,
    connection_status: 'ok',
  },
  {
    provider_name: 'openai',
    model: null,
    is_active: false,
    is_configured: true,
    connection_status: null,
  },
];

describe('ProviderConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    providerList = initialProviders();

    api.get.mockImplementation((url) => {
      if (url === '/ai/providers') return Promise.resolve({ data: providerList });
      if (url === '/ai/providers/available') {
        return Promise.resolve({ data: ['openrouter', 'openai', 'gemini', 'anthropic'] });
      }
      if (url === '/ai/providers/openai/models') {
        return Promise.resolve({ data: ['gpt-4o-mini', 'gpt-4.1'] });
      }
      return Promise.resolve({ data: [] });
    });

    api.post.mockImplementation((url) => {
      if (url === '/ai/providers/openai/activate') {
        providerList = providerList.map((provider) => ({
          ...provider,
          is_active: provider.provider_name === 'openai',
        }));
        return Promise.resolve({ data: providerList[1] });
      }
      return Promise.resolve({ data: { success: true, message: 'ok' } });
    });

    api.put.mockResolvedValue({ data: { provider_name: 'openai', model: 'gpt-4.1' } });
    api.delete.mockResolvedValue({ data: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista los proveedores y marca el activo', async () => {
    render(<ProviderConfig />);

    expect(await screen.findByText('OpenRouter')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('openai/gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('activa otro proveedor sin volver a pedir la API key', async () => {
    const onConfigChange = vi.fn();
    render(<ProviderConfig onConfigChange={onConfigChange} />);

    await screen.findByText('OpenAI');
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/ai/providers/openai/activate'),
    );
    expect(await screen.findByText('Mel ahora usa OpenAI.')).toBeInTheDocument();
    expect(onConfigChange).toHaveBeenCalled();
    // La lista se recarga para reflejar el nuevo proveedor activo.
    expect(api.get.mock.calls.filter(([url]) => url === '/ai/providers')).toHaveLength(2);
  });

  it('abre el modal para agregar otra API', async () => {
    render(<ProviderConfig />);

    fireEvent.click(await screen.findByRole('button', { name: /Agregar proveedor/ }));

    expect(
      await screen.findByRole('dialog', { name: 'Agregar proveedor de IA' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Proveedor')).toBeInTheDocument();
    expect(screen.getByLabelText('API key')).toBeInTheDocument();
    expect(screen.getByLabelText(/Modelo/)).toBeInTheDocument();
  });

  it('permite cambiar el modelo sin volver a pedir la API key', async () => {
    render(<ProviderConfig />);

    await screen.findByText('OpenAI');
    fireEvent.click(screen.getAllByRole('button', { name: 'Cambiar modelo' })[1]);

    const input = await screen.findByLabelText('Modelo');
    fireEvent.change(input, { target: { value: 'gpt-4.1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar modelo' }));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/ai/providers/openai', {
        model: 'gpt-4.1',
      }),
    );
    expect(await screen.findByText('Modelo actualizado.')).toBeInTheDocument();
  });

  it('elimina un proveedor tras confirmar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ProviderConfig />);

    await screen.findByText('OpenRouter');
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/ai/providers/openrouter'),
    );
  });

  it('no elimina si el usuario cancela', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProviderConfig />);

    await screen.findByText('OpenRouter');
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

    expect(api.delete).not.toHaveBeenCalled();
  });
});
