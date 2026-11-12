import { useEffect, useState } from 'react';
import api from '../../services/api';
import Button from '../ui/Button';
import ProviderSetupModal, { PROVIDER_INFO } from './ProviderSetupModal';

/**
 * Gestor de proveedores de IA.
 *
 * Lista las claves configuradas, permite añadir nuevas y activar la que
 * se quiera usar. Al agotarse la cuota de un proveedor basta con
 * activar otro: no hace falta volver a escribir la API key.
 */
const ProviderConfig = ({ onConfigChange }) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [busyProvider, setBusyProvider] = useState(null);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await api.get('/ai/providers');
      setProviders(response.data || []);
      setError('');
    } catch {
      setError('No se pudieron cargar los proveedores de IA.');
    } finally {
      setLoading(false);
    }
  };

  const notify = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSaved = async (config) => {
    setSetupOpen(false);
    await loadProviders();
    if (onConfigChange && config) onConfigChange(config);
    notify('Proveedor guardado.');
  };

  const handleActivate = async (provider) => {
    setBusyProvider(provider.provider_name);
    setError('');
    try {
      const response = await api.post(`/ai/providers/${provider.provider_name}/activate`);
      await loadProviders();
      if (onConfigChange) onConfigChange(response.data);
      const label = PROVIDER_INFO[provider.provider_name]?.name || provider.provider_name;
      notify(`Mel ahora usa ${label}.`);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'No se pudo activar el proveedor.',
      );
    } finally {
      setBusyProvider(null);
    }
  };

  const handleTest = async (provider) => {
    const name = provider.provider_name;
    setBusyProvider(name);
    setTestResults((prev) => ({ ...prev, [name]: null }));
    try {
      const response = await api.post(`/ai/providers/${name}/test`);
      setTestResults((prev) => ({ ...prev, [name]: response.data }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [name]: {
          success: false,
          message: err.response?.data?.detail || 'No se pudo probar la conexión.',
        },
      }));
    } finally {
      setBusyProvider(null);
      await loadProviders();
    }
  };

  const handleDelete = async (provider) => {
    const label = PROVIDER_INFO[provider.provider_name]?.name || provider.provider_name;
    if (!window.confirm(`¿Eliminar la configuración de ${label}?`)) return;

    setBusyProvider(provider.provider_name);
    setError('');
    try {
      await api.delete(`/ai/providers/${provider.provider_name}`);
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[provider.provider_name];
        return next;
      });
      await loadProviders();
      notify(`Se eliminó ${label}.`);
    } catch {
      setError('No se pudo eliminar el proveedor.');
    } finally {
      setBusyProvider(null);
    }
  };

  const renderStatus = (provider) => {
    const result = testResults[provider.provider_name];
    if (result) {
      return (
        <div
          className={`provider-test-result ${result.success ? 'is-ok' : 'is-error'}`}
          role="status"
        >
          {result.success ? 'Conexión correcta. ' : 'No se pudo conectar. '}
          {result.message}
        </div>
      );
    }
    if (provider.connection_status === 'ok') {
      return <div className="provider-test-result is-ok">Conectado</div>;
    }
    if (provider.connection_status === 'error') {
      return <div className="provider-test-result is-error">Última prueba falló</div>;
    }
    return null;
  };

  return (
    <div className="provider-manager">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h6 className="fw-semibold mb-1">Proveedores configurados</h6>
          <p className="text-muted-tf small mb-0">
            Añade varias claves y activa la que quieras usar. Si un proveedor
            agota su cuota o límite, cambia a otro sin volver a escribir la clave.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setSetupOpen(true)}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          Agregar proveedor
        </Button>
      </div>

      {message && (
        <div className="alert alert-success text-white border-secondary py-2 small" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="alert alert-danger text-white border-secondary py-2 small" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted-tf small py-3">Cargando proveedores...</div>
      ) : providers.length === 0 ? (
        <div className="provider-empty">
          <p className="mb-2">Todavía no hay ningún proveedor configurado.</p>
          <Button variant="primary" size="sm" onClick={() => setSetupOpen(true)}>
            Configurar mi primer proveedor
          </Button>
        </div>
      ) : (
        <div className="provider-list">
          {providers.map((provider) => {
            const info = PROVIDER_INFO[provider.provider_name] || {
              name: provider.provider_name,
            };
            const busy = busyProvider === provider.provider_name;

            return (
              <div
                key={provider.provider_name}
                className={`provider-card ${provider.is_active ? 'is-active' : ''}`}
              >
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="min-w-0">
                    <div className="fw-semibold text-white">{info.name}</div>
                    <div className="text-muted-tf smaller">
                      {provider.model || 'Modelo predeterminado del proveedor'}
                    </div>
                  </div>
                  <span
                    className={`badge ${provider.is_active ? 'bg-primary' : 'bg-secondary'} text-white`}
                  >
                    {provider.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {renderStatus(provider)}

                <div className="d-flex flex-wrap gap-2 mt-3">
                  {!provider.is_active && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleActivate(provider)}
                      loading={busy}
                    >
                      Activar
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTest(provider)}
                    disabled={busy}
                  >
                    Probar conexión
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(provider)}
                    disabled={busy}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProviderSetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default ProviderConfig;
