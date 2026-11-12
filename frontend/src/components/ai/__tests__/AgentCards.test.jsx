import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  ConfirmationCard,
  ToolResultsCard,
  AgentErrorBanner,
} from '../AgentCards';

const CONFIRMATION = {
  action_id: 'act-1',
  tool: 'update_subject',
  description: 'Actualizar la materia Cálculo',
  parameters: {
    subject: 'Cálculo',
    teacher: 'Ana Gómez',
    grade: 82,
    confirmed: true,
    allow_conflict: false,
  },
};

describe('ConfirmationCard', () => {
  it('no renderiza nada sin confirmación', () => {
    const { container } = render(<ConfirmationCard confirmation={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra la descripción y los parámetros con etiquetas legibles', () => {
    render(<ConfirmationCard confirmation={CONFIRMATION} />);

    expect(screen.getByText('Necesito tu confirmación')).toBeInTheDocument();
    expect(screen.getByText('Actualizar la materia Cálculo')).toBeInTheDocument();
    expect(screen.getByText('Materia')).toBeInTheDocument();
    expect(screen.getByText('Cálculo')).toBeInTheDocument();
    expect(screen.getByText('Docente')).toBeInTheDocument();
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
    expect(screen.getByText('Nota')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('oculta los parámetros internos de seguridad', () => {
    render(<ConfirmationCard confirmation={CONFIRMATION} />);
    expect(screen.queryByText('confirmed')).not.toBeInTheDocument();
    expect(screen.queryByText('allow_conflict')).not.toBeInTheDocument();
    expect(screen.queryByText('true')).not.toBeInTheDocument();
  });

  it('llama a onAccept y onCancel con los botones', () => {
    const onAccept = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmationCard
        confirmation={CONFIRMATION}
        onAccept={onAccept}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(onAccept).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('deshabilita los botones y avisa mientras ejecuta', () => {
    render(<ConfirmationCard confirmation={CONFIRMATION} busy />);
    const executing = screen.getByRole('button', { name: 'Ejecutando...' });
    expect(executing).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument();
  });

  it('queda resuelta al aceptar o cancelar (consumo único)', () => {
    const { rerender } = render(
      <ConfirmationCard confirmation={CONFIRMATION} resolved="accepted" />,
    );
    expect(screen.getByText('Acción confirmada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument();

    rerender(<ConfirmationCard confirmation={CONFIRMATION} resolved="cancelled" />);
    expect(screen.getByText('Acción cancelada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });

  it('formatea valores vacíos y booleanos', () => {
    render(
      <ConfirmationCard
        confirmation={{
          description: 'Ajustar',
          parameters: { subject: '', grade: true },
        }}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('sí')).toBeInTheDocument();
  });
});

describe('ToolResultsCard', () => {
  it('no renderiza nada sin herramientas', () => {
    const { container } = render(<ToolResultsCard tools={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra una sola acción en singular', () => {
    render(
      <ToolResultsCard
        tools={[{ tool: 'create_task', success: true, summary: 'Tarea creada' }]}
      />,
    );
    expect(screen.getByText('Acción ejecutada')).toBeInTheDocument();
    expect(screen.getByText('create_task')).toBeInTheDocument();
    expect(screen.getByText('Tarea creada')).toBeInTheDocument();
  });

  it('muestra varias acciones en plural y distingue éxitos de fallos', () => {
    const { container } = render(
      <ToolResultsCard
        tools={[
          { tool: 'list_tasks', success: true, summary: '2 elemento(s)' },
          { tool: 'update_task', success: false, summary: 'Tarea no encontrada' },
        ]}
      />,
    );

    expect(screen.getByText('2 acciones ejecutadas')).toBeInTheDocument();
    const statuses = container.querySelectorAll('.mel-tool-status');
    expect(statuses[0]).toHaveClass('is-ok');
    expect(statuses[1]).toHaveClass('is-error');
  });
});

describe('AgentErrorBanner', () => {
  it('no renderiza nada sin error', () => {
    const { container } = render(<AgentErrorBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('diferencia la cuota agotada y recuerda que la app funciona sin IA', () => {
    render(
      <AgentErrorBanner
        errorCode="quota_exhausted"
        message="La cuota del proveedor se agotó."
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Cuota de IA agotada')).toBeInTheDocument();
    expect(screen.getByText('La cuota del proveedor se agotó.')).toBeInTheDocument();
    expect(screen.getByText(/TaskFlow funciona\s+sin la IA/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('is-quota');
  });

  it('diferencia el límite de solicitudes de la cuota agotada', () => {
    render(
      <AgentErrorBanner
        errorCode="rate_limit"
        message="Espera unos segundos e inténtalo de nuevo."
      />,
    );

    expect(screen.getByText('Límite de solicitudes')).toBeInTheDocument();
    expect(screen.queryByText('Cuota de IA agotada')).not.toBeInTheDocument();
    expect(screen.queryByText(/TaskFlow funciona/)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveClass('is-quota');
  });

  it('usa un título genérico para códigos desconocidos', () => {
    render(<AgentErrorBanner errorCode="algo_raro" message="Falla" />);
    expect(screen.getByText('Error inesperado de la IA')).toBeInTheDocument();
  });

  it('explica el modelo no disponible y ofrece cambiar de proveedor', () => {
    render(
      <MemoryRouter>
        <AgentErrorBanner
          errorCode="invalid_model"
          message="El modelo configurado no existe."
          manageHref="/proveedores-ia"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Modelo no disponible')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cambiar de proveedor' })).toHaveAttribute(
      'href',
      '/proveedores-ia',
    );
  });

  it('ofrece cambiar de proveedor cuando la API key no es válida', () => {
    render(
      <MemoryRouter>
        <AgentErrorBanner
          errorCode="invalid_api_key"
          message="La API key no es válida."
          manageHref="/proveedores-ia"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Cambiar de proveedor' })).toBeInTheDocument();
  });
});
