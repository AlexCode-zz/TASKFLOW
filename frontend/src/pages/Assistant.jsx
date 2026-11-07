import { useState } from 'react';

const Assistant = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hola. Soy tu asistente académico de TaskFlow. Puedo ayudarte a organizar tus materias, planificar tu semana y responder dudas de estudio. ¿En qué te apoyo hoy?',
      time: '09:00',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), sender: 'user', text: input, time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const reply = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: 'Esta es una respuesta de ejemplo. La integración real con el asistente de IA se implementará en una fase posterior.',
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, reply]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="fade-in">
      <header className="mb-4">
        <h1 className="fw-bold mb-1">Asistente IA</h1>
        <p className="text-muted-tf mb-0">
          Organización académica, planificación y técnicas de estudio.
        </p>
      </header>

      <div className="card border-secondary shadow-sm h-100 d-flex flex-column">
        <div className="card-header bg-transparent border-secondary pb-2">
          <h5 className="fw-semibold mb-0">Conversación</h5>
        </div>
        <div className="chat-body p-3 overflow-auto flex-grow-1" style={{ maxHeight: '500px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
            >
              <div
                className={`p-3 rounded-3 ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-surface text-white border border-secondary'}`}
                style={{ maxWidth: '80%' }}
              >
                <div className="text-muted-tf small mb-1">
                  {msg.sender === 'user' ? 'Tú' : 'Asistente'} · {msg.time}
                </div>
                <div className="small">{msg.text}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="d-flex justify-content-start mb-3">
              <div className="p-3 rounded-3 bg-surface text-white border border-secondary" style={{ maxWidth: '80%' }}>
                <div className="d-flex align-items-center gap-2 small text-muted-tf">
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                  Escribiendo...
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="card-footer bg-transparent border-secondary pt-2 pb-2">
          <div className="input-group">
            <input
              type="text"
              className="form-control bg-surface border-secondary text-white"
              placeholder="Escribe tu mensaje..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              Enviar
            </button>
          </div>
          <p className="text-muted-tf small mt-2 mb-0">
            El asistente de IA se conectará en una fase posterior. Por ahora funciona con respuestas de ejemplo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
