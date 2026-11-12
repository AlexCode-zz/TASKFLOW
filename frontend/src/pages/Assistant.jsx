import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ConversationList from '../components/ai/ConversationList';
import MessageList from '../components/ai/MessageList';
import MessageInput from '../components/ai/MessageInput';
import ProviderSetupModal, { PROVIDER_INFO } from '../components/ai/ProviderSetupModal';
import AssistantAvatar from '../components/ai/AssistantAvatar';
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

  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [providerConfig, setProviderConfig] = useState(null);
  const [providerChecked, setProviderChecked] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [error, setError] = useState('');
  const [convOpen, setConvOpen] = useState(false);

  useEffect(() => {
    greet();
    loadConversations();
    checkProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversations = async () => {
    try {
      const response = await api.get('/ai/conversations');
      setConversations(response.data);
      if (response.data.length > 0) {
        selectConversation(response.data[0]);
      }
    } catch (err) {
      console.error('Error cargando conversaciones:', err.message);
    }
  };

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

  const selectConversation = async (conv) => {
    notifyActivity();
    setCurrentConversation(conv);
    setMessages([]);
    try {
      const response = await api.get(`/ai/conversations/${conv.id}/messages`);
      setMessages(response.data);
    } catch (err) {
      console.error('Error cargando mensajes:', err.message);
    }
  };

  const startNewConversation = () => {
    notifyActivity();
    setCurrentConversation(null);
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
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await api.post('/ai/agent/chat', {
        message: text,
        conversation_id: currentConversation?.id || null,
        provider_name: providerConfig?.provider_name || undefined,
        use_academic_context: true,
      });

      const data = response.data;

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
      setMessages((prev) => [...prev, assistantMsg]);

      if (!currentConversation) {
        const newConv = {
          id: data.conversation_id,
          title: text.trim().slice(0, 60),
          provider_name: data.provider_name,
          model: data.model,
        };
        setCurrentConversation(newConv);
        setConversations((prev) => [
          newConv,
          ...prev.filter((c) => c.id !== newConv.id),
        ]);
      }
    } catch (err) {
      const detail =
        err.response?.data?.detail || err.message || 'Error al enviar el mensaje';
      setError(detail);
      sendAgentEvent(err.response?.status >= 500 ? 'backend_error' : 'provider_error');
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
        conversation_id: currentConversation?.id || null,
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
    <div className="fade-in">
      {/* Presentación de Mel: avatar protagonista + estado + proveedor */}
      <header className="mel-hero mb-4">
        <AssistantAvatar expression={expression} state={state} size={128} />
        <div className="mel-hero-info">
          <h1 className="mel-name">Mel</h1>
          <p className="mel-subtitle">
            Tu asistente académica. Organiza materias, tareas, notas y tu semana.
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
        <div className="ms-auto d-none d-md-block">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={startNewConversation}
            disabled={sending}
          >
            Nueva conversación
          </button>
        </div>
      </header>

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
        <div className="row g-4">
          {/* Área principal de conversación: ocupa todo el ancho salvo
              cuando el menú de conversaciones está abierto. */}
          <div className={convOpen ? 'col-12 col-lg-9' : 'col-12'}>
            <div className={`d-flex flex-column h-100 ${convOpen ? 'border-start border-secondary ps-lg-4' : ''}`}>
              <div className="d-flex justify-content-between align-items-center gap-2 py-2">
                <h5 className="fw-semibold mb-0 text-truncate">
                  {currentConversation ? currentConversation.title : 'Conversación nueva'}
                </h5>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={startNewConversation}
                    disabled={sending}
                  >
                    Nueva
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setConvOpen((open) => !open)}
                    aria-expanded={convOpen}
                  >
                    <i className={`bi ${convOpen ? 'bi-x-lg' : 'bi-list'} me-1`} aria-hidden="true" />
                    Conversaciones
                  </button>
                </div>
              </div>

              <div className="flex-grow-1 overflow-hidden d-flex flex-column">
                <MessageList
                  messages={messages}
                  confirmingId={confirmingId}
                  manageProvidersHref="/proveedores-ia"
                  onConfirm={(msg) => resolveConfirmation(msg, 'accept')}
                  onCancel={(msg) => resolveConfirmation(msg, 'cancel')}
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
            </div>
          </div>

          {convOpen && (
            <div className="col-12 col-lg-3">
              <ConversationList
                conversations={conversations}
                onSelect={selectConversation}
                onDelete={(id) => {
                  setConversations(conversations.filter((c) => c.id !== id));
                  if (currentConversation?.id === id) {
                    setCurrentConversation(null);
                    setMessages([]);
                  }
                }}
                onNew={startNewConversation}
              />
            </div>
          )}
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
