import { useState, useEffect } from 'react';
import api from '../../services/api';

const PROVIDER_INFO = {
  openrouter: { name: 'OpenRouter', description: 'Acceso a múltiples modelos a través de OpenRouter' },
  anthropic: { name: 'Anthropic Claude', description: 'Modelos Claude de Anthropic' },
  gemini: { name: 'Google Gemini', description: 'Modelos Gemini de Google' },
  openai: { name: 'OpenAI', description: 'Modelos GPT de OpenAI' },
};

const ProviderConfig = ({ onConfigChange }) => {
  const [providers, setProviders] = useState([]);
  const [configured, setConfigured] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  [form, setForm] = useState({
    provider_name: '',
    api_key: '',
    model: '',
    is_active: false,
  });
  [testResult, setTestResult] = useState(null);
  [testing, setTesting] = useState(false);
  [saving, setSaving] = useState(false);
  [showKey, setShowKey] = useState(false);
  [models, setModels] = useState([]);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const [providersRes, availableRes, configuredRes] = await Promise.all([
        api.get('/ai/providers/'),
        api.get('/ai/providers/available'),
        api.get('/ai/providers/configured'),
      ]);
      setProviders(providersRes.data);
      setAvailableProviders(availableRes.data);
      setConfigured(configuredRes.data);
    } catch (err) {
      console.error('Error cargando proveedores:', err.message);
    }
  };

  const handleProviderChange = (e) => {
    const provider = e.target.value;
    setForm({ ...form, provider_name: provider });
    if (provider && models.length === 0) {
      fetchModels(provider);
    }
  };

  const fetchModels = async (provider) => {
    try {
      const response = await api.get(`/ai/providers/${provider}/models`);
      setModels(response.data);
    } catch (err) {
      // Los modelos pueden no estar disponibles sin clave, ignorar silenciosamente
      setModels([]);
    }
  };

  const handleTestConnection = async (e) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const response = await api.post('/ai/providers/test', {
        provider_name: form.provider_name,
        api_key: form.api_key,
        model: form.model || undefined,
      });
      setTestResult(response.data);
      if (response.data.success) {
        // Obtener modelos si la prueba fue exitosa
        try {
          const modelsRes = await api.get(`/ai/providers/${form.provider_name}/models`);
          setModels(modelsRes.data);
        } catch (err) {
          // Ignorar
        }
      }
    } catch (err) {
      setTestResult({
        success: false,
        provider_name: form.provider_name,
        status: 'error',
        message: err.response?.data?.detail || err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.post('/ai/providers/setup', {
        provider_name: form.provider_name,
        api_key: form.api_key,
        model: form.model || undefined,
        is_active: form.is_active,
      });
      onConfigChange(response.data);
      await loadProviders();
      setForm({
        provider_name: '',
        api_key: '',
        model: '',
        is_active: false,
      });
      setModels([]);
    } catch (err) {
      console.error('Error guardando proveedor:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async (providerName) => {
    if (!window.confirm(`¿Eliminar la configuración de ${providerName}?`)) return;
    try {
      await api.delete(`/ai/providers/${providerName}`);
      await loadProviders();
    } catch (err) {
      console.error('Error eliminando proveedor:', err.message);
    }
  };

  const maskKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <div className="card border-secondary shadow-sm">
      <div className="card-header bg-transparent border-secondary">
        <h6 className="fw-semibold mb-0">Configuración de Proveedores IA</h6>
      </div>
      <div className="card-body p-3">
        {/* Formulario para agregar/editar proveedor */}
        <div className="mb-4">
          <h6 className="fw-medium text-white mb-3">Agregar proveedor</h6>
          <form onSubmit={handleSave}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label text-muted-tf small">Proveedor <span className="text-danger">*</span></label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.provider_name}
                  onChange={handleProviderChange}
                >
                  <option value="">Seleccionar proveedor</option>
                  {availableProviders.map((p) => {
                    const info = PROVIDER_INFO[p] || { name: p, description: '' };
                    return (
                      <option key={p} value={p}>
                        {info.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label text-muted-tf small">API key <span className="text-danger">*</span></label>
                <div className="input-group">
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="form-control bg-surface border-secondary text-white"
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                    placeholder="sk-or-..."
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label text-muted-tf small">Modelo</label>
                <select
                  className="form-select bg-surface border-secondary text-white"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                >
                  <option value="">Seleccionar modelo</option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <label className="form-check-label text-muted-tf small">
                    Establecer como proveedor activo
                  </label>
                </div>
              </div>
              <div className="col-12 d-flex gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleTestConnection}
                  disabled={testing || !form.provider_name || !form.api_key}
                >
                  {testing ? 'Probando...' : 'Probar conexión'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={saving || !form.provider_name || !form.api_key}
                >
                  {saving ? 'Guardando...' : 'Guardar proveedor'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Resultado de prueba */}
        {testResult && (
          <div className={`alert mb-3 ${testResult.success ? 'alert-success text-white border-success' : 'alert-danger text-white border-danger'}`}>
            <strong>{testResult.success ? '✓ Éxito' : '✗ Error'}:</strong> {testResult.message}
          </div>
        )}

        {/* Proveedores configurados */}
        <div className="mt-4">
          <h6 className="fw-medium text-white mb-3">Proveedores configurados</h6>
          {providers.length === 0 ? (
            <div className="text-muted-tf small text-center py-3">
              No hay proveedores configurados
            </div>
          ) : (
            providers.map((p) => {
              const info = PROVIDER_INFO[p.provider_name] || { name: p.provider_name, description: '' };
              const isConfigured = configured.includes(p.provider_name);
              return (
                <div
                  key={p.provider_name}
                  className="card border-secondary bg-surface mb-2"
                >
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-medium text-white">{info.name}</div>
                        <div className="text-muted-tf small">{info.description}</div>
                      </div>
                      <div className="text-end">
                        <span className={`badge ${p.is_active ? 'bg-primary' : 'bg-secondary'} text-white`}>
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className={`badge ${p.connection_status === 'ok' ? 'bg-success' : p.connection_status === 'error' ? 'bg-danger' : 'bg-secondary'} text-white ms-2`}>
                          {p.connection_status === 'ok' ? 'Conectado' : p.connection_status === 'error' ? 'Error' : 'No probado'}
                        </span>
                      </div>
                    </div>
                    {isConfigured && (
                      <div className="mb-2">
                        <label className="form-label text-muted-tf small">Modelo</label>
                        <input
                          type="text"
                          className="form-control bg-surface border-secondary text-white"
                          value={p.model || ''}
                          readOnly
                        />
                      </div>
                    )}
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => {
                          setForm({
                            provider_name: p.provider_name,
                            api_key: '',
                            model: p.model || '',
                            is_active: p.is_active,
                          });
                          fetchModels(p.provider_name);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDeleteProvider(p.provider_name)}
                      >
                        Eliminar
                      </button>
                      {!p.is_active && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setForm({
                              provider_name: p.provider_name,
                              api_key: '',
                              model: p.model || '',
                              is_active: true,
                            });
                            handleSave(new Event('submit'));
                          }}
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderConfig;
