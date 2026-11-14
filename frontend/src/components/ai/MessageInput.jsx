import { useState } from 'react';

/**
 * Compositor del escritorio de Mel: pastilla de cristal con el campo de
 * escritura y un botón de envío redondo. Mantiene Enter para enviar y
 * Shift+Enter para saltos de línea.
 */
const MessageInput = ({ onSend, disabled, placeholder, onActivity }) => {
  const [input, setInput] = useState('');

  const handleChange = (event) => {
    setInput(event.target.value);
    if (onActivity) onActivity();
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="mel-composer">
      <form onSubmit={handleSend} className="mel-composer-form">
        <i className="bi bi-chat-dots mel-composer-icon" aria-hidden="true" />
        <input
          type="text"
          className="mel-composer-input"
          placeholder={placeholder || 'Escribe tu mensaje...'}
          aria-label="Mensaje para Mel"
          value={input}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
          disabled={disabled}
        />
        <button
          type="submit"
          className="mel-send-btn"
          aria-label="Enviar"
          disabled={disabled || !input.trim()}
        >
          <i className="bi bi-arrow-up" aria-hidden="true" />
        </button>
      </form>
      <p className="mel-composer-hint">
        Enter para enviar · Shift+Enter para nueva línea
      </p>
    </div>
  );
};

export default MessageInput;
