import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MelCalendar from '../MelCalendar';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

describe('MelCalendar: calendario minimalista del asistente', () => {
  it('muestra el mes actual con los días de la semana', () => {
    render(<MelCalendar />);

    const now = new Date();
    expect(screen.getByText(`${MONTHS[now.getMonth()]} ${now.getFullYear()}`)).toBeInTheDocument();
    DAYS_SHORT.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('muestra los números del mes actual sin eventos', () => {
    render(<MelCalendar />);

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      expect(screen.getByText(String(day))).toBeInTheDocument();
    }
  });

  it('marca el día actual', () => {
    render(<MelCalendar />);

    const now = new Date();
    const dayEl = screen.getByText(String(now.getDate()));
    expect(dayEl).toHaveClass('is-today');
  });

  it('navega entre meses', () => {
    render(<MelCalendar />);

    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));

    expect(
      screen.getByText(`${MONTHS[next.getMonth() % 12]} ${next.getFullYear()}`),
    ).toBeInTheDocument();
  });

  it('navega al mes anterior', () => {
    render(<MelCalendar />);

    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));

    expect(
      screen.getByText(`${MONTHS[previous.getMonth() % 12]} ${previous.getFullYear()}`),
    ).toBeInTheDocument();
  });
});
