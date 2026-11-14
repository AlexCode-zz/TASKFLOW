import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import AssistantAvatar from '../AssistantAvatar';
import { expressionSrc } from '../expressions';

const css = readFileSync('src/index.css', 'utf8');

/** Devuelve la capa visible (la última imagen apilada) del avatar. */
const topImg = (container) => {
  const imgs = container.querySelectorAll('img.mel-avatar-img');
  return imgs[imgs.length - 1];
};

describe('AssistantAvatar', () => {
  it('muestra la imagen de la expresión indicada', () => {
    const { container } = render(<AssistantAvatar expression="trabajando" state="idle" />);
    expect(topImg(container)).toHaveAttribute('src', expressionSrc('trabajando'));
  });

  it('usa la expresión normal por defecto', () => {
    const { container } = render(<AssistantAvatar />);
    expect(topImg(container)).toHaveAttribute('src', expressionSrc('normal'));
  });

  it('expone el nombre del personaje y la expresión de forma accesible', () => {
    const { container } = render(<AssistantAvatar expression="enojada" state="explaining" />);
    expect(container.querySelector('.mel-avatar')).toHaveAttribute(
      'aria-label',
      'Mel — enojada'
    );
  });

  it('mantiene a Mel quieta en todos los estados', () => {
    const { container, rerender } = render(
      <AssistantAvatar expression="trabajando" state="working" />
    );
    const motion = container.querySelector('.mel-avatar-motion');
    const inner = container.querySelector('.mel-avatar-inner');
    expect(motion.className).not.toMatch(/mel-anim-/);
    expect(inner.className).not.toMatch(/mel-anim-/);

    rerender(<AssistantAvatar expression="dormida" state="sleeping" />);

    expect(container.querySelector('.mel-avatar')).toHaveAttribute(
      'data-state',
      'sleeping'
    );
    expect(container.querySelector('.mel-avatar-motion').className).not.toMatch(
      /mel-anim-/
    );
    expect(container.querySelector('.mel-avatar-inner').className).not.toMatch(
      /mel-anim-/
    );
  });

  it('no define animaciones de movimiento para Mel en el CSS', () => {
    [
      'mel-anim-',
      'mel-breathe',
      'mel-blink',
      'mel-working',
      'mel-greet',
      'mel-sleep',
      'mel-success',
      'mel-avatar-glow',
      'mel-cover-float',
      'mel-portrait-pulse',
    ].forEach((name) => {
      expect(css).not.toContain(name);
    });
  });

  it('cambia la imagen al cambiar la expresión con fundido cruzado', async () => {
    const { container, rerender } = render(<AssistantAvatar expression="normal" state="idle" />);
    rerender(<AssistantAvatar expression="feliz" state="success" />);

    // Durante el fundido conviven la capa antigua y la nueva
    await waitFor(() => {
      expect(topImg(container)).toHaveAttribute('src', expressionSrc('feliz'));
    });
  });

  it('respeta el tamaño indicado', () => {
    const { container } = render(<AssistantAvatar size={140} />);
    const box = container.querySelector('.mel-avatar');
    expect(box.style.width).toBe('140px');
    expect(box.style.height).toBe('140px');
  });
});
