import { useState, useEffect } from 'react';
import api from '../services/api';
import ConversationList from '../components/ai/ConversationList';
import MessageList from '../components/ai/MessageList';
import MessageInput from '../components/ai/MessageInput';
import ProviderConfig from '../components/ai/ProviderConfig';

const Assistant = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  [sending, setSending] = useState(false);
  [error, setError] = useState('');
  [providerConfig, setProviderConfig] = useState(null);
  [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'config'

  useEffect(() => {
    loadConversations();
    checkProvider();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await api.get('/ai/conversations/');
      setConversations(response.data);
      if (response.data.length > 0 && !currentConversation) {
        selectConversation(response.data[0]);
      }
    } catch (err) {
      console.error('Error cargando conversaciones:', err.message);
    }
  };

  const checkProvider = async () => {
    try {
      const response = await api.get('/ai/providers/');
      const configured = response.data.filter((p) => p.is_configured);
      if (configured.length > 0) {
        const active = configured.find((p) => p.is_active) || configured[0];
        setProviderConfig(active);
      }
    } catch (err) {
      console.error('Error verificando proveedor:', err.message);
    }
  };

  const selectConversation = async (conv) => {
    setCurrentConversation(conv);
    setMessages([]);
    try {
      const response = await api.get(`/ai/conversations/${conv.id}/messages/`);
      setMessages(response.data);
    } catch (err) {
      console.error('Error cargando mensajes:', err.message);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await api.post('/ai/conversations/', {
        title: 'Nueva conversación',
        provider_name: providerConfig?.provider_name || null,
        model: providerConfig?.model || null,
      });
      const newConv = {
        id: response.data.id,
        title: response.data.title,
        provider_name: response.data.provider_name,
        model: response.data.model,
      };
      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
      setMessages([]);
    } catch (err) {
      console.error('Error creando conversación:', err.message);
    }
  };

  const handleSend = async (text) => {
    if (!currentConversation) {
      await createNewConversation();
    }

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setError('');

    try {
      const response = await api.post('/ai/chat/', {
        message: text,
        conversation_id: currentConversation?.id || null,
        provider_name: providerConfig?.provider_name || undefined,
        model: providerConfig?.model || undefined,
        use_academic_context: true,
      });

      const assistantMsg = {
        id: response.data.message_id,
        role: 'assistant',
        content: response.data.message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Actualizar la conversación si era nueva
      if (!currentConversation) {
        setCurrentConversation({
          id: response.data.conversation_id,
          title: 'Nueva conversación',
          provider_name: response.data.provider_name,
          model: response.data.model,
        });
        setConversations([
          {
            id: response.data.conversation_id,
            title: 'Nueva conversación',
            provider_name: response.data.provider_name,
            model: response.data.model,
          },
          ...conversations.filter((c) => c.id !== response.data.conversation_id),
        ]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleConfigChange = (config) => {
    setProviderConfig(config);
  };

  return (
    <div className="fade-in">
      <header className="mb-4">
        <h1 className="fw-bold mb-1">Asistente IA</h1>
        <p className="text-muted-tf mb-0">
          Organización académica, planificación y técnicas de estudio.
        </p>
      </header>

      {error && (
        <div className="alert alert-danger text-white border-secondary mb-3" role="alert">
          {error}
        </div>
      )}

      {!providerConfig && (
        <div className="alert alert-warning text-white border-secondary mb-3" role="alert">
          <strong>Configura un proveedor de IA</strong> en la pestaña de configuración para comenzar a chatear.
        </div>
      )}

      <div className="row">
        {/* Panel lateral: conversaciones y configuración */}
        <div className="col-12 col-lg-3">
          <div className="d-flex flex-column h-100">
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
              onNew={createNewConversation}
            />
            <div className="mt-4">
              <ProviderConfig onConfigChange={handleConfigChange} />
            </div>
          </div>
        </div>

        {/* Área principal de chat */}
        <div className="col-12 col-lg-9">
          <div className="d-flex flex-column h-100 border-start border-secondary">
            <div className="p-3 border-bottom border-secondary">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-semibold mb-0">
                    {currentConversation ? currentConversation.title : 'Selecciona una conversación'}
                  </h5>
                  <p className="text-muted-tf small mb-0">
                    {providerConfig ? `${providerConfig.provider_name} · ${providerConfig.model || 'modelo predeterminado'}` : 'Sin proveedor configurado'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={createNewConversation}
                  disabled={!providerConfig}
                >
                  Nueva conversación
                </button>
              </div>
            </div>

            <div className="flex-grow-1 overflow-hidden d-flex flex-column">
              <MessageList messages={messages} />
            </div>

            <MessageInput
              onSend={handleSend}
              disabled={sending || !providerConfig || !currentConversation}
              placeholder={providerConfig ? 'Escribe tu pregunta académica...' : 'Configura un proveedor para comenzar'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
