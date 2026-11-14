import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXPRESSIONS,
  EXPRESSION_KEYS,
  expressionSrc,
  isValidExpression,
  AVATAR_BASE_PATH,
  PORTRAIT_EXPRESSION,
} from '../expressions';

const here = path.dirname(fileURLToPath(import.meta.url));
// src/components/ai/__tests__ -> frontend/public/assets/mel
const publicMelDir = path.resolve(here, '../../../../public/assets/mel');

describe('catálogo de expresiones de Mel', () => {
  it('define las 7 expresiones oficiales del personaje', () => {
    expect(EXPRESSION_KEYS).toHaveLength(7);
  });

  it('incluye cada expresión requerida', () => {
    const required = [
      'normal',
      'feliz',
      'guino',
      'enojada',
      'trabajando',
      'dormida',
      'llorando',
    ];
    required.forEach((name) => {
      expect(EXPRESSIONS).toHaveProperty(name);
    });
  });

  it('mantiene la ilustración de portada como recurso independiente', () => {
    expect(PORTRAIT_EXPRESSION).toBe('05_principal.png');
  });

  it('apunta a un PNG real existente por cada expresión', () => {
    EXPRESSION_KEYS.forEach((name) => {
      const src = expressionSrc(name);
      expect(src.startsWith(AVATAR_BASE_PATH)).toBe(true);
      const file = path.join(publicMelDir, path.basename(src));
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  it('no repite archivos entre expresiones', () => {
    const files = Object.values(EXPRESSIONS);
    expect(new Set(files).size).toBe(files.length);
  });

  it('expressionSrc lanza un error con una expresión desconocida', () => {
    expect(() => expressionSrc('desconocida')).toThrow();
  });

  it('isValidExpression distingue válidas de inválidas', () => {
    expect(isValidExpression('normal')).toBe(true);
    expect(isValidExpression('llorando')).toBe(true);
    expect(isValidExpression('no_existe')).toBe(false);
    expect(isValidExpression('')).toBe(false);
  });
});
