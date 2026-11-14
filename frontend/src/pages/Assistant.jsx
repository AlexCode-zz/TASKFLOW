import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import MelCalendar from '../components/ai/MelCalendar';
import MessageList from '../components/ai/MessageList';
import MessageInput from '../components/ai/MessageInput';
import ProviderSetupModal, { PROVIDER_INFO } from '../components/ai/ProviderSetupModal';
import useAssistantState from '../hooks/useAssistantState';
import { replayAgentEvents, summarizeToolResult } from '../utils/agentEvents';

const SUGGESTIONS = [
  '¿Qué tareas tengo pendientes?',
  'Dame mi informe académico',
  '¿Tengo conflictos de horario?',
  'Genera mi plan semanal',
  '¿Cómo van mis notas?',
];

/** Clase del chip de estado según el estado de la máquina. */
function statusChipClass(state) {
  if (state === 'thinking' || state === 'working') return 'mel-status-chip is-busy';
  if (state === 'sleeping') return 'mel-status-chip is-sleeping';
  if (state === 'error' || state === 'quota_exhausted' || state === 'conflict') {
    return 'mel-status-chip is-error';
  }
  return 'mel-status-chip';
}

const Assistant = () => {
  const {
    state,
    status,
    expression,
    notifyActivity,
    sendAgentEvent,
    greet,
  } = useAssistantState();

  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  // Contexto conversacional de la sesión actual: se reutiliza durante la
  // sesión para que Mel conserve el hilo, sin persistir historial.
  const sessionConversationIdRef = useRef(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [providerConfig, setProviderConfig] = useState(null);
  const [providerChecked, setProviderChecked] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    greet();
    checkProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La sección no guarda historial: los mensajes se descartan 5 minutos
  // después de la última interacción si no se escribe otra cosa.
  useEffect(() => {
    if (messages.length === 0) return undefined;
    const timer = setTimeout(() => {
      setMessages([]);
      // Al expirar la conversación temporal, la sesión queda lista
      // para una nueva interacción sin contexto previo.
      sessionConversationIdRef.current = null;
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [messages]);

  const checkProvider = async () => {
    try {
      const response = await api.get('/ai/providers');
      const configured = response.data.filter((p) => p.is_configured);
      if (configured.length > 0) {
        const active = configured.find((p) => p.is_active) || configured[0];
        setProviderConfig(active);
      }
    } catch (err) {
      console.error('Error verificando proveedor:', err.message);
    } finally {
      setProviderChecked(true);
    }
  };

  const startNewConversation = () => {
    notifyActivity();
    sessionConversationIdRef.current = null;
    setMessages([]);
    setError('');
  };

  const handleSend = async (text) => {
    if (!text.trim() || sending) return;

    notifyActivity();
    setSending(true);
    setError('');
    sendAgentEvent('query_received');

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    // Mensajes temporales: solo se muestra el último intercambio activo.
    setMessages([userMsg]);

    try {
      const response = await api.post('/ai/agent/chat', {
        message: text,
        // Contexto de la sesión actual: se reutiliza mientras dure la
        // sesión; no hay historial persistente entre sesiones.
        conversation_id: sessionConversationIdRef.current,
        provider_name: providerConfig?.provider_name || undefined,
        use_academic_context: true,
      });

      const data = response.data;
      sessionConversationIdRef.current = data.conversation_id;

      // Reproducir los eventos del backend con pausas para que las
      // animaciones de Mel se vean naturales.
      await replayAgentEvents(data.events, sendAgentEvent);

      const assistantMsg = {
        id: data.message_id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
        tools: (data.tools_executed || []).map(summarizeToolResult),
        confirmation: data.confirmation || null,
        confirmationResolved: null,
        errorCode: data.error_code || null,
      };
      setMessages([userMsg, assistantMsg]);
    } catch (err) {
      const detail =
        err.response?.data?.detail || err.message || 'Error al enviar el mensaje';
      setError(detail);
      sendAgentEvent(err.response?.status >= 500 ? 'backend_error' : 'provider_error');
      setMessages([userMsg]);
    } finally {
      setSending(false);
    }
  };

  const resolveConfirmation = async (msg, decision) => {
    const confirmation = msg.confirmation;
    if (!confirmation || confirmingId) return;

    notifyActivity();
    setConfirmingId(confirmation.action_id);
    setError('');

    try {
      const response = await api.post('/ai/agent/confirm', {
        action_id: confirmation.action_id,
        decision,
        conversation_id: sessionConversationIdRef.current,
      });
      const data = response.data;

      await replayAgentEvents(data.events, sendAgentEvent);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, confirmationResolved: decision === 'accept' ? 'accepted' : 'cancelled' }
            : m,
        ),
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          created_at: new Date().toISOString(),
          tools: [],
          confirmation: data.confirmation || null,
          confirmationResolved: null,
          errorCode: null,
        },
      ]);
    } catch (err) {
      const detail =
        err.response?.data?.detail || err.message || 'No se pudo procesar la acción';
      setError(detail);
      sendAgentEvent('backend_error');
      // La acción pudo haber expirado: la tarjeta queda resuelta.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, confirmationResolved: 'cancelled' } : m,
        ),
      );
    } finally {
      setConfirmingId(null);
    }
  };

  const handleProviderSaved = (config) => {
    setProviderConfig(config);
    setSetupOpen(false);
    setError('');
  };

  const providerLabel = providerConfig
    ? PROVIDER_INFO[providerConfig.provider_name]?.name || providerConfig.provider_name
    : 'Sin proveedor configurado';

  return (
    <div className="fade-in d-flex flex-column flex-grow-1">
      {error && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          {error}
        </div>
      )}

      {providerChecked && !providerConfig && (
        <section className="mel-setup-card mb-4">
          <div className="mel-setup-icon" aria-hidden="true">
            <i className="bi bi-key" />
          </div>
          <div className="mel-setup-body">
            <h2 className="mel-setup-title">Conecta a Mel con un proveedor de IA</h2>
            <p className="mel-setup-text">
              Elige un proveedor y pega tu API key. Después podrás guardar más
              claves y cambiar entre ellas cuando quieras.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSetupOpen(true)}
            >
              Configurar proveedor de IA
            </button>
            <p className="text-muted-tf smaller mb-0 mt-3">
              TaskFlow funciona sin IA: tus materias, tareas y horarios siguen
              disponibles.
            </p>
          </div>
        </section>
      )}

      {providerConfig && (
        <div className="row g-4 flex-grow-1">
          {/* Calendario académico: lado izquierdo en escritorio. */}
          <div className="col-12 col-lg-4 order-3 order-lg-1">
            <section
              className="mel-glass-panel mel-calendar-panel h-100"
              aria-label="Calendario académico"
            >
              <MelCalendar />
            </section>
          </div>

          {/* Mel: lado central, protagonista de la sección. */}
          <div className="col-12 col-lg-4 order-1 order-lg-2">
            <section className="mel-glass-panel mel-center-panel h-100" aria-label="Estado de Mel">
              <div className="mel-center-stage">
                <img
                  src="/assets/mel/05_principal.png"
                  alt="Ilustración de Mel"
                  className="mel-cover-img"
                />
                <div className="mel-center-info">
                  <h1 className="mel-name">MEL</h1>
                  <p className="mel-subtitle">
                    Organiza materias, tareas, notas y tu semana de estudio.
                  </p>
                  <div className="mel-chip-row">
                    <span className={statusChipClass(state)}>
                      <span className="mel-status-dot" aria-hidden="true" />
                      {status}
                    </span>
                    <span className="mel-provider-chip" title={providerLabel}>
                      {providerLabel}
                    </span>
                    {providerConfig && (
                      <Link to="/proveedores-ia" className="mel-provider-link">
                        Cambiar
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Conversación: lado derecho, con la respuesta de Mel y la barra
              de escritura al final. */}
          <div className="col-12 col-lg-4 order-2 order-lg-3">
            <section className="mel-glass-panel mel-chat-panel h-100" aria-label="Conversación con Mel">
              <div className="mel-chat-head d-flex justify-content-between align-items-center gap-2 pb-2">
                <h2 className="h6 fw-semibold text-white mb-0">Conversación nueva</h2>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={startNewConversation}
                  disabled={sending}
                >
                  Nueva
                </button>
              </div>

              <div className="mel-chat-body flex-grow-1 overflow-hidden d-flex flex-column">
                <MessageList
                  messages={messages}
                  confirmingId={confirmingId}
                  manageProvidersHref="/proveedores-ia"
                  onConfirm={(msg) => resolveConfirmation(msg, 'accept')}
                  onCancel={(msg) => resolveConfirmation(msg, 'cancel')}
                  avatarExpression={expression}
                  avatarState={state}
                />

                {sending && (
                  <div className="mel-typing px-3 pb-2">
                    Mel está pensando
                    <span className="mel-typing-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                )}

                {messages.length === 0 && (
                  <div className="px-3 pb-3">
                    <p className="text-muted-tf small mb-2">
                      Prueba con una de estas preguntas:
                    </p>
                    <div className="mel-suggestions">
                      {SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="mel-suggestion"
                          onClick={() => handleSend(suggestion)}
                          disabled={sending}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <MessageInput
                onSend={handleSend}
                onActivity={notifyActivity}
                disabled={sending}
                placeholder="Escribe tu consulta académica..."
              />
            </section>
          </div>
        </div>
      )}

      <ProviderSetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSaved={handleProviderSaved}
      />
    </div>
  );
};

export default Assistant;
