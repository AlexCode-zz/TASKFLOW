import { ConfirmationCard, ToolResultsCard, AgentErrorBanner } from './AgentCards';
import { formatProse } from '../../utils/prose';
import AssistantAvatar from './AssistantAvatar';

/**
 * Historial de mensajes del asistente. Además del texto, cada turno
 * puede incluir tarjetas de resultados de herramientas, una tarjeta de
 * confirmación de acción y avisos de error diferenciados.
 */
const MessageList = ({
  messages,
  onConfirm,
  onCancel,
  confirmingId = null,
  manageProvidersHref = null,
  avatarExpression = 'normal',
  avatarState = 'idle',
}) => {
  return (
    <div className="mel-message-list p-3 overflow-y-auto flex-grow-1">
      {messages.length === 0 ? (
        <div className="text-center text-muted-tf small py-4">
          No hay mensajes aún. Escribe tu primera consulta.
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
          >
            {msg.role !== 'user' && (
              <div className="mel-message-avatar">
                <AssistantAvatar expression={avatarExpression} state={avatarState} size={36} />
              </div>
            )}
            <div className="mel-message-column" style={{ maxWidth: '85%' }}>
              <div
                className={`p-3 rounded-4 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface text-white border border-secondary'}`}
                style={{ wordBreak: 'break-word' }}
              >
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <span className={`fw-semibold ${msg.role === 'user' ? 'text-white' : 'text-primary'} small`}>
                    {msg.role === 'user' ? 'Tú' : 'Mel'}
                  </span>
                  <span className="text-muted-tf smaller ms-3">
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>
                <div className="small" style={{ wordBreak: 'break-word' }}>
                  {msg.role === 'assistant' ? formatProse(msg.content) : msg.content}
                </div>
              </div>

              {msg.role !== 'user' && (
                <div className="mel-message-meta">
                  {msg.errorCode && (
                    <AgentErrorBanner
                      errorCode={msg.errorCode}
                      message={msg.errorMessage || msg.content}
                      manageHref={manageProvidersHref}
                    />
                  )}
                  {msg.tools && msg.tools.length > 0 && <ToolResultsCard tools={msg.tools} />}
                  {msg.confirmation && (
                    <ConfirmationCard
                      confirmation={msg.confirmation}
                      busy={confirmingId === msg.confirmation.action_id}
                      resolved={msg.confirmationResolved || null}
                      onAccept={() => onConfirm && onConfirm(msg)}
                      onCancel={() => onCancel && onCancel(msg)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MessageList;
