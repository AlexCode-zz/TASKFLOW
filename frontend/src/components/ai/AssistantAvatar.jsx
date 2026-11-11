import { useEffect, useRef, useState } from 'react';
import { expressionSrc, isValidExpression, AVATAR_NAME } from './expressions';

/**
 * Animación de movimiento que aplica cada estado de la máquina del
 * asistente. Solo mueve la imagen (CSS), nunca redibuja la cara.
 */
const STATE_ANIMATION = {
  idle: 'mel-anim-breathe',
  greeting: 'mel-anim-greet',
  thinking: 'mel-anim-breathe',
  working: 'mel-anim-working',
  explaining: 'mel-anim-breathe',
  success: 'mel-anim-success',
  conflict: 'mel-anim-breathe',
  error: 'mel-anim-breathe',
  sleeping: 'mel-anim-sleep',
  quota_exhausted: 'mel-anim-breathe',
};

/** Duración del fundido cruzado entre dos expresiones (ms). */
const CROSSFADE_MS = 380;

/**
 * Avatar de Mel con expresiones intercambiables y animaciones suaves.
 *
 * La expresión se cambia reemplazando el PNG (fundido cruzado entre la
 * imagen saliente y la entrante). El estado controla la animación de
 * movimiento: respiración, parpadeo, rebote de saludo, bob vertical al
 * trabajar, balanceo al dormir y pop discreto al completar acciones.
 *
 * @param {object} props
 * @param {string} props.expression expresión actual (clave de EXPRESSIONS)
 * @param {string} props.state estado de la máquina (idle, working, ...)
 * @param {number} props.size tamaño del contenedor en px
 * @param {string} props.className clases extra
 * @param {string} props.alt nombre accesible del personaje
 */
const AssistantAvatar = ({
  expression = 'normal',
  state = 'idle',
  size = 96,
  className = '',
  alt = AVATAR_NAME,
}) => {
  const [layers, setLayers] = useState(() => [{ expression, key: 0 }]);
  const counter = useRef(0);
  const lastExpression = useRef(expression);

  // Fundido cruzado: al cambiar la expresión se apila la nueva imagen
  // encima de la anterior y se retira la vieja al terminar la transición.
  useEffect(() => {
    if (!isValidExpression(expression)) return undefined;
    if (expression === lastExpression.current) return undefined;
    lastExpression.current = expression;

    counter.current += 1;
    const layer = { expression, key: counter.current };
    setLayers((prev) => [...prev, layer]);
    const timer = setTimeout(() => setLayers([layer]), CROSSFADE_MS);
    return () => clearTimeout(timer);
  }, [expression]);

  const movementClass = STATE_ANIMATION[state] || STATE_ANIMATION.idle;
  const blinkClass = state === 'sleeping' ? '' : ' mel-anim-blink';

  return (
    <div
      className={`mel-avatar ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${alt} — ${expression}`}
    >
      <div className={`mel-avatar-motion ${movementClass}`}>
        <div className={`mel-avatar-inner${blinkClass}`}>
          {layers.map((layer, index) => (
            <img
              key={layer.key}
              src={expressionSrc(layer.expression)}
              alt=""
              className={
                index === layers.length - 1
                  ? 'mel-avatar-img mel-avatar-img-top'
                  : 'mel-avatar-img'
              }
              draggable={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssistantAvatar;
