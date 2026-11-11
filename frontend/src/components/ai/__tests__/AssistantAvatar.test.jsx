import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import AssistantAvatar from '../AssistantAvatar';
import { expressionSrc } from '../expressions';

/** Devuelve la capa visible (la última imagen apilada) del avatar. */
const topImg = (container) => {
  const imgs = container.querySelectorAll('img.mel-avatar-img');
  return imgs[imgs.length - 1];
};

describe('AssistantAvatar', () => {
  it('muestra la imagen de la expresión indicada', () => {
    const { container } = render(<AssistantAvatar expression="pensativa" state="idle" />);
    expect(topImg(container)).toHaveAttribute('src', expressionSrc('pensativa'));
  });

  it('usa la expresión normal por defecto', () => {
    const { container } = render(<AssistantAvatar />);
    expect(topImg(container)).toHaveAttribute('src', expressionSrc('normal'));
  });

  it('expone el nombre del personaje y la expresión de forma accesible', () => {
    const { container } = render(<AssistantAvatar expression="seria" state="explaining" />);
    expect(container.querySelector('.mel-avatar')).toHaveAttribute(
      'aria-label',
      'Mel — seria'
    );
  });

  it('aplica la animación de trabajo cuando el estado es working', () => {
    const { container } = render(<AssistantAvatar expression="trabajando" state="working" />);
    const motion = container.querySelector('.mel-avatar-motion');
    expect(motion).toHaveClass('mel-anim-working');
    expect(motion).not.toHaveClass('mel-anim-breathe');
  });

  it('aplica respiración en reposo y parpadeo fuera del sueño', () => {
    const { container } = render(<AssistantAvatar expression="normal" state="idle" />);
    const motion = container.querySelector('.mel-avatar-motion');
    const inner = container.querySelector('.mel-avatar-inner');
    expect(motion).toHaveClass('mel-anim-breathe');
    expect(inner).toHaveClass('mel-anim-blink');
  });

  it('desactiva el parpadeo mientras duerme y aplica el balanceo', () => {
    const { container } = render(<AssistantAvatar expression="durmiendo" state="sleeping" />);
    const motion = container.querySelector('.mel-avatar-motion');
    const inner = container.querySelector('.mel-avatar-inner');
    expect(motion).toHaveClass('mel-anim-sleep');
    expect(inner).not.toHaveClass('mel-anim-blink');
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
