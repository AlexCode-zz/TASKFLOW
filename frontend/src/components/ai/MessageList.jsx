import { ConfirmationCard, ToolResultsCard, AgentErrorBanner } from './AgentCards';
import { formatProse } from '../../utils/prose';
import AssistantAvatar from './AssistantAvatar';

/**
 * Intercambio temporal del asistente. Muestra únicamente el último
 * intercambio (consulta + respuesta), sin acumular historial: la clave
 * del contenedor cambia con cada nuevo mensaje para que el intercambio
 * anterior desaparezca y la escena se vuelva a animar.
 *
 * Además del texto, cada turno puede incluir tarjetas de resultados de
 * herramientas, una tarjeta de confirmación de acción y avisos de error
 * diferenciados.
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
  const exchangeKey = messages[0]?.id || 'empty';

  return (
    <div
      className={`mel-message-list${messages.length === 0 ? ' is-empty' : ''}`}
      key={exchangeKey}
    >
      {messages.length === 0 ? (
        <div className="mel-chat-empty">
          <span className="mel-chat-empty-icon" aria-hidden="true">
            <i className="bi bi-chat-square-text" />
          </span>
          <p className="mel-chat-empty-title">Tu conversación con Mel</p>
          <p className="mel-chat-empty-text">
            Pregunta por tus tareas, notas o horarios. Mel conserva el hilo
            mientras dure esta sesión.
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`mel-exchange-row ${isUser ? 'is-user' : 'is-mel'}`}
            >
              {!isUser && (
                <div className="mel-message-avatar">
                  <AssistantAvatar
                    expression={avatarExpression}
                    state={avatarState}
                    size={36}
                  />
                </div>
              )}
              <div className="mel-message-column">
                <div className={`mel-bubble ${isUser ? 'mel-bubble-user' : 'mel-bubble-mel'}`}>
                  <div className="mel-bubble-head">
                    <span className="mel-bubble-name">{isUser ? 'Tú' : 'Mel'}</span>
                    <span className="mel-bubble-time">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                  <div className="mel-bubble-content">
                    {isUser ? msg.content : formatProse(msg.content)}
                  </div>
                </div>

                {!isUser && (
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
          );
        })
      )}
    </div>
  );
};

export default MessageList;
