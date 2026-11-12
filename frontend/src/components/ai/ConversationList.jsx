import { useState, useEffect } from 'react';
import api from '../../services/api';

const ConversationList = ({ conversations, onSelect, onDelete, onNew }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadConversations = async () => {
      try {
        const response = await api.get('/ai/conversations');
        if (cancelled) return;
        if (response.data.length > 0) {
          onSelect(response.data[0]);
        }
      } catch (err) {
        console.error('Error cargando conversaciones:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadConversations();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (e, conversation) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta conversación?')) return;
    try {
      await api.delete(`/ai/conversations/${conversation.id}`);
      onDelete(conversation.id);
    } catch (err) {
      console.error('Error eliminando conversación:', err.message);
    }
  };

  if (loading) {
    return <div className="text-muted-tf small">Cargando...</div>;
  }

  const conversationItems = [...conversations]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0),
    )
    .map((conv) => (
      <div
        key={conv.id}
        className="list-group-item list-group-item-action bg-surface border-secondary d-flex justify-content-between align-items-start mb-2 rounded-3 cursor-pointer hover:bg-surface-hover"
        onClick={() => onSelect(conv)}
      >
        <div className="flex-grow-1 text-truncate">
          <div className="fw-medium text-white small text-truncate">{conv.title}</div>
        </div>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm p-1"
          onClick={(e) => handleDelete(e, conv)}
          aria-label={`Eliminar conversación ${conv.title}`}
        >
          ×
        </button>
      </div>
    ));

  return (
    <div className="border-start border-secondary p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-semibold text-white mb-0">Conversaciones</h6>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={onNew}
        >
          + Nueva
        </button>
      </div>
      <div className="list-group list-group-flush">
        {conversations.length === 0 ? (
          <div className="text-muted-tf small text-center py-3">
            No hay conversaciones
          </div>
        ) : conversationItems}
      </div>
    </div>
  );
};

export default ConversationList;
