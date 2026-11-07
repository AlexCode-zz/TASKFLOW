const MessageList = ({ messages }) => {
  return (
    <div className="p-3 overflow-y-auto flex-grow-1" style={{ maxHeight: '500px' }}>
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
            <div
              className={`p-3 rounded-3 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface text-white border border-secondary'}`}
              style={{ maxWidth: '85%', wordBreak: 'break-word' }}
            >
              <div className="d-flex justify-content-between align-items-start mb-1">
                <span className={`fw-semibold ${msg.role === 'user' ? 'text-white' : 'text-primary'} small`}>
                  {msg.role === 'user' ? 'Tú' : 'Asistente'}
                </span>
                <span className="text-muted-tf smaller">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div className="small">{msg.content}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MessageList;
