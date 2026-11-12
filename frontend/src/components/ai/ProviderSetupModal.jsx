import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/** Información visible de cada proveedor soportado. */
export const PROVIDER_INFO = {
  openrouter: {
    name: 'OpenRouter',
    hint: 'Una sola clave para acceder a modelos de varios proveedores.',
  },
  openai: {
    name: 'OpenAI',
    hint: 'Modelos GPT de OpenAI.',
  },
  gemini: {
    name: 'Google Gemini',
    hint: 'Modelos Gemini de Google.',
  },
  anthropic: {
    name: 'Anthropic Claude',
    hint: 'Modelos Claude de Anthropic.',
  },
};

const emptyForm = {
  provider_name: '',
  api_key: '',
  is_active: true,
};

/**
 * Modal para agregar un proveedor de IA.
 *
 * Se usa tanto en la configuración inicial de Mel (cuando todavía no
 * hay ningún proveedor) como en la página de proveedores para añadir
 * más claves. Solo pide proveedor y API key: el modelo lo resuelve el
 * proveedor con su valor predeterminado.
 */
const ProviderSetupModal = ({ open, onClose, onSaved }) => {
  const [available, setAvailable] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setForm(emptyForm);
    setShowKey(false);
    setTestResult(null);
    setError('');
    setTesting(false);
    setSaving(false);

    let cancelled = false;
    api
      .get('/ai/providers/available')
      .then((response) => {
        if (!cancelled) setAvailable(response.data || []);
      })
      .catch(() => {
        if (!cancelled) setAvailable([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleProviderChange = (event) => {
    update({ provider_name: event.target.value });
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!form.provider_name || !form.api_key.trim()) return;
    setTesting(true);
    setTestResult(null);
    setError('');
    try {
      const response = await api.post('/ai/providers/test', {
        provider_name: form.provider_name,
        api_key: form.api_key.trim(),
      });
      setTestResult(response.data);
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.detail || 'No se pudo probar la conexión.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.provider_name || !form.api_key.trim()) return;

    setSaving(true);
    setError('');
    try {
      const response = await api.post('/ai/providers/setup', {
        provider_name: form.provider_name,
        api_key: form.api_key.trim(),
        is_active: form.is_active,
      });
      if (onSaved) onSaved(response.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.detail || 'No se pudo guardar el proveedor de IA.',
      );
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = Boolean(form.provider_name && form.api_key.trim());

  return (
    <Modal open={open} title="Agregar proveedor de IA" onClose={onClose} className="modal-md">
      <form onSubmit={handleSave}>
        <p className="text-muted-tf small">
          Elige el proveedor y pega tu API key. La clave se guarda de forma
          local, nunca en la base de datos ni en el repositorio.
        </p>

        <div className="mb-3">
          <label className="form-label text-muted-tf small" htmlFor="provider-name">
            Proveedor
          </label>
          <select
            id="provider-name"
            className="form-select bg-surface border-secondary text-white"
            value={form.provider_name}
            onChange={handleProviderChange}
          >
            <option value="">Seleccionar proveedor</option>
            {available.map((provider) => (
              <option key={provider} value={provider}>
                {PROVIDER_INFO[provider]?.name || provider}
              </option>
            ))}
          </select>
          {form.provider_name && PROVIDER_INFO[form.provider_name]?.hint && (
            <div className="text-muted-tf smaller mt-1">
              {PROVIDER_INFO[form.provider_name].hint}
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label text-muted-tf small" htmlFor="provider-key">
            API key
          </label>
          <div className="input-group">
            <input
              id="provider-key"
              type={showKey ? 'text' : 'password'}
              className="form-control bg-surface border-secondary text-white"
              placeholder="sk-..."
              value={form.api_key}
              onChange={(event) => update({ api_key: event.target.value })}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? 'Ocultar API key' : 'Mostrar API key'}
            >
              <i className={`bi ${showKey ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="form-check mb-3">
          <input
            id="provider-active"
            type="checkbox"
            className="form-check-input"
            checked={form.is_active}
            onChange={(event) => update({ is_active: event.target.checked })}
          />
          <label className="form-check-label text-muted-tf small" htmlFor="provider-active">
            Usar este proveedor ahora
          </label>
        </div>

        {testResult && (
          <div
            className={`alert ${testResult.success ? 'alert-success' : 'alert-danger'} text-white border-secondary py-2 small`}
            role="status"
          >
            {testResult.success ? 'Conexión correcta. ' : 'No se pudo conectar. '}
            {testResult.message}
          </div>
        )}

        {error && (
          <div className="alert alert-danger text-white border-secondary py-2 small" role="alert">
            {error}
          </div>
        )}

        <div className="d-flex flex-wrap gap-2 mt-4">
          <Button type="submit" variant="primary" loading={saving} disabled={!canSubmit}>
            Guardar proveedor
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={testing || !canSubmit}
          >
            {testing ? 'Probando...' : 'Probar conexión'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProviderSetupModal;
