/**
 * Normalización del texto que muestra Mel.
 *
 * El modelo a veces devuelve prosa con marcado markdown (negritas con
 * `**`, cursivas con `*` o `_`, listas con `-`/`*`/`+`). Para que la
 * conversación se lea como texto plano y limpio, se retiran esos
 * marcadores sin tocar el contenido real.
 */

/**
 * Formatea el contenido de un mensaje del asistente para renderizarlo
 * como prosa limpia (sin markdown ni bullets marcados).
 *
 * @param {string} text contenido crudo del mensaje
 * @returns {string} texto listo para mostrarse en la burbuja
 */
export const formatProse = (text) =>
  String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^\s*[-*+]\s+/, '').trim())
    .join('\n')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
