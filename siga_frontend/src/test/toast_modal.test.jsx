import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from '../core/ui/ToastContext';
import { ConfirmProvider, useConfirm, usePrompt } from '../core/ui/ConfirmModal';

// Componente auxiliar para probar Toasts
function ToastConsumerTest({ onMounted }) {
  const toast = useToast();

  React.useEffect(() => {
    if (onMounted) onMounted(toast);
  }, [toast, onMounted]);

  return (
    <div data-testid="toast-test-harness">
      <button onClick={() => toast.success('Operación completada exitosamente')}>
        Lanzar Éxito
      </button>
      <button onClick={() => toast.error('Error crítico del servidor')}>
        Lanzar Error
      </button>
      <button onClick={() => toast.warning('Advertencia: fecha límite cercana')}>
        Lanzar Advertencia
      </button>
      <button onClick={() => toast.info('Información: sistema en mantenimiento')}>
        Lanzar Info
      </button>
      <button onClick={() => toast.showSuccess('Éxito por alias')}>
        Lanzar Alias Éxito
      </button>
      <button onClick={() => toast.showError('Error por alias')}>
        Lanzar Alias Error
      </button>
      <button onClick={() => toast.showWarning('Advertencia por alias')}>
        Lanzar Alias Advertencia
      </button>
      <button onClick={() => toast.showInfo('Info por alias')}>
        Lanzar Alias Info
      </button>
      <button onClick={() => toast.success('Auto cierre veloz', 100)}>
        Lanzar Auto Cierre
      </button>
      <button onClick={() => toast.clear()}>
        Limpiar Todo
      </button>
    </div>
  );
}

// Componente auxiliar para probar Modales de Confirmación y Prompt
function ConfirmConsumerTest({ onResult }) {
  const confirm = useConfirm();
  const prompt = usePrompt();

  return (
    <div data-testid="confirm-test-harness">
      <button
        onClick={async () => {
          const res = await confirm({
            title: '¿Confirmar cierre formal de acta?',
            message: 'Una vez cerrada, la edición quedará bloqueada.',
            confirmText: 'Sí, cerrar acta',
            cancelText: 'Cancelar',
            isDestructive: true,
          });
          onResult(res);
        }}
      >
        Lanzar Confirmación Destructiva
      </button>

      <button
        onClick={async () => {
          const res = await confirm({
            title: '¿Guardar asignación?',
            message: 'Se actualizará la carga lectiva.',
            confirmText: 'Aceptar',
            cancelText: 'Volver',
            type: 'default',
          });
          onResult(res);
        }}
      >
        Lanzar Confirmación Estándar
      </button>

      <button
        onClick={async () => {
          const res = await confirm.promptModal({
            title: 'Observación de Sílabo',
            message: 'Indique el motivo técnico de la observación:',
            placeholder: 'Ej. No coincide con el plan de estudios...',
            defaultValue: 'Observación por defecto',
            confirmText: 'Enviar Observación',
            cancelText: 'Descartar',
            required: true,
          });
          onResult(res);
        }}
      >
        Lanzar Prompt Simple
      </button>

      <button
        onClick={async () => {
          const res = await prompt({
            title: 'Motivo de reapertura excepcional',
            message: 'Justificación detallada requerida:',
            isTextarea: true,
            defaultValue: '',
            required: true,
          });
          onResult(res);
        }}
      >
        Lanzar Prompt Textarea
      </button>
    </div>
  );
}

describe('Infraestructura de Notificaciones Flotantes (ToastContext)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Debe lanzar error explícito si useToast se consume fuera de ToastProvider', () => {
    // Silenciamos el log de error de React durante esta prueba intencional
    const originalError = console.error;
    console.error = vi.fn();

    function Orphan() {
      useToast();
      return <div>Orphan</div>;
    }

    expect(() => render(<Orphan />)).toThrow(
      'useToast debe ser utilizado dentro de un ToastProvider'
    );

    console.error = originalError;
  });

  it('2. Debe renderizar un toast de éxito con mensaje, icono y estilo institucional', () => {
    render(
      <ToastProvider>
        <ToastConsumerTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Éxito'));

    const toastItem = screen.getByTestId('toast-item');
    expect(toastItem).toBeInTheDocument();
    expect(toastItem).toHaveTextContent('Operación completada exitosamente');

    const successIcon = screen.getByTestId('toast-success');
    expect(successIcon).toBeInTheDocument();
    expect(toastItem.className).toContain('bg-emerald-50');
  });

  it('3. Debe renderizar un toast de error con mensaje e icono correspondiente', () => {
    render(
      <ToastProvider>
        <ToastConsumerTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Error'));

    const toastItem = screen.getByTestId('toast-item');
    expect(toastItem).toBeInTheDocument();
    expect(toastItem).toHaveTextContent('Error crítico del servidor');

    const errorIcon = screen.getByTestId('toast-error');
    expect(errorIcon).toBeInTheDocument();
    expect(toastItem.className).toContain('bg-rose-50');
  });

  it('4. Debe renderizar un toast de advertencia e información', () => {
    render(
      <ToastProvider>
        <ToastConsumerTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Advertencia'));
    expect(screen.getByTestId('toast-warning')).toBeInTheDocument();
    expect(screen.getByText('Advertencia: fecha límite cercana')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Lanzar Info'));
    expect(screen.getByTestId('toast-info')).toBeInTheDocument();
    expect(screen.getByText('Información: sistema en mantenimiento')).toBeInTheDocument();
  });

  it('5. Debe soportar funciones alias (showSuccess, showError, showWarning, showInfo)', () => {
    render(
      <ToastProvider>
        <ToastConsumerTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Alias Éxito'));
    expect(screen.getByText('Éxito por alias')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Lanzar Alias Error'));
    expect(screen.getByText('Error por alias')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Lanzar Alias Advertencia'));
    expect(screen.getByText('Advertencia por alias')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Lanzar Alias Info'));
    expect(screen.getByText('Info por alias')).toBeInTheDocument();
  });

  it('6. Debe cerrar el toast inmediatamente al hacer clic en el botón X', () => {
    render(
      <ToastProvider>
        <ToastConsumerTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Éxito'));
    expect(screen.getByText('Operación completada exitosamente')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('toast-close');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Operación completada exitosamente')).not.toBeInTheDocument();
  });

  it('7. Debe autodescartar el toast luego de cumplirse el tiempo de duración', async () => {
    render(
      <ToastProvider>
        <ToastConsumerTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Auto Cierre'));
    expect(screen.getByText('Auto cierre veloz')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText('Auto cierre veloz')).not.toBeInTheDocument();
      },
      { timeout: 800 }
    );
  });

  it('8. Permite limpiar todos los toasts activos mediante clear()', () => {
    render(
      <ToastProvider>
        <ToastConsumerTest />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Éxito'));
    fireEvent.click(screen.getByText('Lanzar Error'));

    const items = screen.getAllByTestId('toast-item');
    expect(items.length).toBe(2);

    fireEvent.click(screen.getByText('Limpiar Todo'));
    expect(screen.queryAllByTestId('toast-item').length).toBe(0);
  });
});

describe('Infraestructura de Modales Interactivos (ConfirmModal & useConfirm)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Debe lanzar error explícito si useConfirm se consume fuera de ConfirmProvider', () => {
    const originalError = console.error;
    console.error = vi.fn();

    function Orphan() {
      useConfirm();
      return <div>Orphan</div>;
    }

    expect(() => render(<Orphan />)).toThrow(
      'useConfirm debe ser utilizado dentro de un ConfirmProvider'
    );

    console.error = originalError;
  });

  it('2. Debe renderizar modal de confirmación destructiva y resolver true al confirmar', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <ConfirmConsumerTest onResult={onResult} />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Confirmación Destructiva'));

    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('¿Confirmar cierre formal de acta?')).toBeInTheDocument();
    expect(screen.getByText('Una vez cerrada, la edición quedará bloqueada.')).toBeInTheDocument();

    const okBtn = screen.getByTestId('confirm-modal-ok');
    expect(okBtn).toHaveTextContent('Sí, cerrar acta');
    expect(okBtn.className).toContain('bg-rose-600');

    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledTimes(1);
      expect(onResult).toHaveBeenCalledWith(true);
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });
  });

  it('3. Debe resolver false al presionar el botón Cancelar', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <ConfirmConsumerTest onResult={onResult} />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Confirmación Estándar'));

    const cancelBtn = screen.getByTestId('confirm-modal-cancel');
    expect(cancelBtn).toHaveTextContent('Volver');

    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(false);
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });
  });

  it('4. Debe resolver false al cerrar con el botón X del modal', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <ConfirmConsumerTest onResult={onResult} />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Confirmación Estándar'));

    const closeBtn = screen.getByTestId('confirm-modal-close');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(false);
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });
  });

  it('5. Debe resolver false al presionar la tecla Escape', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <ConfirmConsumerTest onResult={onResult} />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Confirmación Estándar'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(false);
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });
  });

  it('6. PromptModal: debe renderizar campo input y resolver el texto modificado', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <ConfirmConsumerTest onResult={onResult} />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Prompt Simple'));

    const input = screen.getByTestId('prompt-input');
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Observación por defecto');

    fireEvent.change(input, { target: { value: 'Nueva observación corregida' } });
    expect(input.value).toBe('Nueva observación corregida');

    const okBtn = screen.getByTestId('confirm-modal-ok');
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith('Nueva observación corregida');
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });
  });

  it('7. PromptModal: debe resolver null cuando el usuario cancela o descarta', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <ConfirmConsumerTest onResult={onResult} />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Prompt Simple'));

    const cancelBtn = screen.getByTestId('confirm-modal-cancel');
    expect(cancelBtn).toHaveTextContent('Descartar');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(null);
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });
  });

  it('8. PromptModal Textarea: respeta isTextarea y bloquea confirmación si required=true y está vacío', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <ConfirmConsumerTest onResult={onResult} />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Lanzar Prompt Textarea'));

    const textarea = screen.getByTestId('prompt-input');
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
    expect(textarea.value).toBe('');

    const okBtn = screen.getByTestId('confirm-modal-ok');
    expect(okBtn).toBeDisabled();

    // Escribir solo espacios no debe habilitar el botón
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(okBtn).toBeDisabled();

    // Escribir texto válido habilita el botón
    fireEvent.change(textarea, { target: { value: 'Justificación médica institucional debidamente comprobada' } });
    expect(okBtn).not.toBeDisabled();

    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(
        'Justificación médica institucional debidamente comprobada'
      );
    });
  });
});

describe('Integración combinada (ToastProvider + ConfirmProvider)', () => {
  function CombinedConsumer() {
    const confirm = useConfirm();
    const toast = useToast();

    const handleAction = async () => {
      const ok = await confirm({
        title: '¿Confirmar acción crítica?',
        message: '¿Está seguro de proceder?',
      });
      if (ok) {
        toast.success('Acción ejecutada con éxito');
      } else {
        toast.info('Acción cancelada por el usuario');
      }
    };

    return (
      <div>
        <button onClick={handleAction}>Ejecutar Flujo</button>
      </div>
    );
  }

  it('1. Debe confirmar acción en modal y mostrar toast de éxito', async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <CombinedConsumer />
        </ConfirmProvider>
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Ejecutar Flujo'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-modal-ok'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByText('Acción ejecutada con éxito')).toBeInTheDocument();
      expect(screen.getByTestId('toast-success')).toBeInTheDocument();
    });
  });

  it('2. Debe cancelar acción en modal y mostrar toast informativo', async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <CombinedConsumer />
        </ConfirmProvider>
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Ejecutar Flujo'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-modal-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByText('Acción cancelada por el usuario')).toBeInTheDocument();
      expect(screen.getByTestId('toast-info')).toBeInTheDocument();
    });
  });
});

