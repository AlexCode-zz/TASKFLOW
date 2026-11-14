/**
 * Catálogo de expresiones de Mel, la asistente académica de TaskFlow.
 *
 * Este catálogo usa exclusivamente las 7 expresiones oficiales del
 * personaje, cada una con su PNG original en `public/assets/mel/`.
 * La ilustración grande de portada (`05_principal.png`) se mantiene como
 * un recurso independiente. Las expresiones se intercambian mostrando
 * la imagen correspondiente con un fundido de opacidad; Mel permanece
 * quieta y el CSS nunca dibuja caras nuevas.
 */

export const AVATAR_NAME = 'Mel';

/** Carpeta pública donde viven los PNG del personaje. */
export const AVATAR_BASE_PATH = '/assets/mel/';

/** Ilustración grande de portada del personaje (recurso independiente). */
export const PORTRAIT_EXPRESSION = '05_principal.png';

/** Las 7 expresiones oficiales del personaje, con sus PNG originales. */
export const EXPRESSIONS = {
  normal: 'normal.png',
  feliz: 'feliz.png',
  guino: 'guino.png',
  enojada: 'enojada.png',
  trabajando: 'trabajando.png',
  dormida: 'dormida.png',
  llorando: 'llorando.png',
};

/** Nombres válidos de expresión. */
export const EXPRESSION_KEYS = Object.keys(EXPRESSIONS);

/**
 * Devuelve la URL pública de la imagen de una expresión.
 *
 * @param {string} expression nombre de la expresión (clave de EXPRESSIONS)
 * @returns {string} ruta pública del PNG
 * @throws {Error} si la expresión no existe en el catálogo
 */
export function expressionSrc(expression) {
  const file = EXPRESSIONS[expression];
  if (!file) {
    throw new Error(`Expresión desconocida: ${expression}`);
  }
  return `${AVATAR_BASE_PATH}${file}`;
}

/**
 * Comprueba que un nombre de expresión sea válido.
 *
 * @param {string} expression
 * @returns {boolean}
 */
export function isValidExpression(expression) {
  return Object.prototype.hasOwnProperty.call(EXPRESSIONS, expression);
}
