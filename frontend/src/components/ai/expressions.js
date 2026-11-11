/**
 * Catálogo de expresiones de Mel, la asistente académica de TaskFlow.
 *
 * Cada entrada mapea el nombre de la expresión al PNG original del
 * personaje ubicado en `public/assets/mel/`. Las expresiones se
 * intercambian mostrando la imagen correspondiente; las animaciones
 * (respiración, parpadeo, rebote, etc.) se aplican por CSS y nunca
 * dibujan caras nuevas.
 */

export const AVATAR_NAME = 'Mel';

/** Carpeta pública donde viven los PNG del personaje. */
export const AVATAR_BASE_PATH = '/assets/mel/';

/** Retrato principal de presentación. */
export const PORTRAIT_EXPRESSION = 'principal';

export const EXPRESSIONS = {
  normal: '01_normal.png',
  feliz: '02_feliz.png',
  guino: '03_guinando_el_ojo.png',
  enojada: '04_enojada.png',
  principal: '05_principal.png',
  seria: '06_seria.png',
  triste: '07_triste.png',
  sorprendida: '08_sorprendida.png',
  confundida: '09_confundida.png',
  durmiendose: '10_durmiendose.png',
  pensativa: '11_pensativa.png',
  avergonzada: '12_avergonzada.png',
  molesta: '13_molesta.png',
  asustada: '14_asustada.png',
  trabajando: '15_trabajando.png',
  durmiendo: '16_durmiendo.png',
  llorando: '17_llorando.png',
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
