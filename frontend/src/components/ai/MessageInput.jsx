import { useState } from 'react';

const MessageInput = ({ onSend, disabled, placeholder }) => {
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="card-footer bg-transparent border-secondary pt-2 pb-2">
      <form onSubmit={handleSend} className="input-group">
        <input
          type="text"
          className="form-control bg-surface border-secondary text-white"
          placeholder={placeholder || 'Escribe tu mensaje...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
          disabled={disabled}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled || !input.trim()}
        >
          Enviar
        </button>
      </form>
      <p className="text-muted-tf small mt-2 mb-0">
        Presiona Enter para enviar. Shift+Enter para nueva línea.
      </p>
    </div>
  );
};

export default MessageInput;
