import { useEffect, useRef, useState } from 'react';
import { expressionSrc, isValidExpression, AVATAR_NAME } from './expressions';

/** Duración del fundido cruzado entre dos expresiones (ms). */
const CROSSFADE_MS = 380;

/**
 * Avatar de Mel con expresiones intercambiables.
 *
 * Mel permanece quieta: el estado de la máquina solo se expone como
 * ``data-state`` y la expresión se cambia reemplazando el PNG con un
 * fundido cruzado de opacidad. No hay respiración, parpadeo, rebote ni
 * balanceo.
 *
 * @param {object} props
 * @param {string} props.expression expresión actual (clave de EXPRESSIONS)
 * @param {string} props.state estado de la máquina (idle, working, ...)
 * @param {number} props.size tamaño del contenedor en px (variante avatar)
 * @param {'avatar'|'stage'} props.variant `stage` muestra a Mel a lo grande,
 *   sin marco ni fondo, con el tamaño gobernado por CSS
 * @param {string} props.className clases extra
 * @param {string} props.alt nombre accesible del personaje
 */
const AssistantAvatar = ({
  expression = 'normal',
  state = 'idle',
  size = 96,
  variant = 'avatar',
  className = '',
  alt = AVATAR_NAME,
}) => {
  const [layers, setLayers] = useState(() => [{ expression, key: 0 }]);
  const counter = useRef(0);
  const lastExpression = useRef(expression);
  const isStage = variant === 'stage';

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

  return (
    <div
      className={`mel-avatar ${isStage ? 'mel-avatar-stage' : ''} ${className}`.trim()}
      style={isStage ? undefined : { width: size, height: size }}
      role="img"
      aria-label={`${alt} — ${expression}`}
      data-state={state}
    >
      <div className="mel-avatar-motion">
        <div className="mel-avatar-inner">
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
