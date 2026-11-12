import { describe, it, expect } from 'vitest';
import { formatProse } from '../prose';

describe('formatProse', () => {
  it('elimina los asteriscos de negrita y cursiva', () => {
    expect(formatProse('**Actualicé** la tarea. *Listo*.'))
      .toBe('Actualicé la tarea. Listo.');
  });

  it('quita los marcadores de lista pero conserva el texto', () => {
    expect(formatProse('* Revisar el parcial\n- Enviar tarea\n+ Estudiar')).toBe(
      'Revisar el parcial\nEnviar tarea\nEstudiar',
    );
  });

  it('normaliza espacios y no cambia el contenido real', () => {
    expect(formatProse('  Hola   mundo  ')).toBe('Hola mundo');
  });

  it('devuelve cadena vacía para contenido nulo', () => {
    expect(formatProse(null)).toBe('');
  });
});
