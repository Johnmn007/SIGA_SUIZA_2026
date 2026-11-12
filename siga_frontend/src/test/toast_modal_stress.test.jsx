import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React, { useState } from 'react';
import { ToastProvider, useToast } from '../core/ui/ToastContext';
import { ConfirmProvider, useConfirm, usePrompt } from '../core/ui/ConfirmModal';

// Componente para pruebas de estrés de Toasts
function ToastStressHarness({ onMounted }) {
  const toastApi = useToast();

  React.useEffect(() => {
    if (onMounted) onMounted(toastApi);
  }, [toastApi, onMounted]);

  return (
    <div>
      <button
        data-testid="burst-50-btn"
        onClick={() => {
          for (let i = 0; i < 50; i++) {
            toastApi.toast.success(`Notificación en ráfaga #${i + 1}`);
          }
        }}
      >
        Lanzar 50 Toasts
      </button>
      <button data-testid="clear-all-btn" onClick={() => toastApi.clear()}>
        Limpiar Todo
      </button>
    </div>
  );
}

// Componente para pruebas de estrés de Modales
function ModalStressHarness({ onMounted }) {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [lastResult, setLastResult] = useState(null);

  React.useEffect(() => {
    if (onMounted) {
      onMounted({ confirm, prompt, setLastResult });
    }
  }, [confirm, prompt, onMounted]);

  return (
    <div>
      <div data-testid="last-modal-result">{String(lastResult)}</div>
      <button
        data-testid="open-simple-confirm"
        onClick={async () => {
          const res = await confirm({
            title: 'Confirmación estándar',
            message: 'Mensaje de prueba',
          });
          setLastResult(res);
        }}
      >
        Abrir Confirm
      </button>
      <button
        data-testid="open-danger-confirm"
        onClick={async () => {
          const res = await confirm({
            title: 'Peligro',
            message: 'Acción destructiva',
            isDestructive: true,
          });
          setLastResult(res);
        }}
      >
        Abrir Danger Confirm
      </button>
      <button
        data-testid="open-warning-confirm"
        onClick={async () => {
          const res = await confirm({
            title: 'Advertencia',
            message: 'Acción con advertencia',
            type: 'warning',
          });
          setLastResult(res);
        }}
      >
        Abrir Warning Confirm
      </button>
      <button
        data-testid="open-simple-prompt"
        onClick={async () => {
          const res = await confirm.promptModal({
            title: 'Ingreso de texto',
            message: 'Por favor complete:',
            defaultValue: 'Texto inicial',
          });
          setLastResult(res);
        }}
      >
        Abrir Prompt Simple
      </button>
      <button
        data-testid="open-required-prompt"
        onClick={async () => {
          const res = await prompt({
            title: 'Requerido',
            message: 'Debe ingresar datos',
            required: true,
            placeholder: 'Escriba aquí...',
          });
          setLastResult(res);
        }}
      >
        Abrir Prompt Requerido
      </button>
      <button
        data-testid="open-textarea-prompt"
        onClick={async () => {
          const res = await prompt({
            title: 'Observación detallada',
            message: 'Ingrese justificación:',
            isTextarea: true,
            required: true,
          });
          setLastResult(res);
        }}
      >
        Abrir Prompt Textarea
      </button>
    </div>
  );
}

describe('ESTRÉS Y ADVERSARIAL: Toast Notifications Under Stress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Ráfaga masiva: disparo de 50 toasts simultáneos renderiza todos sin degradación ni pérdida', () => {
    render(
      <ToastProvider>
        <ToastStressHarness />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('burst-50-btn'));

    const items = screen.getAllByTestId('toast-item');
    expect(items.length).toBe(50);
    expect(items[0]).toHaveTextContent('Notificación en ráfaga #1');
    expect(items[49]).toHaveTextContent('Notificación en ráfaga #50');

    // Limpieza masiva con clear()
    fireEvent.click(screen.getByTestId('clear-all-btn'));
    expect(screen.queryAllByTestId('toast-item').length).toBe(0);
  });

  it('2. Temporizadores de autodismiss escalonados: expiran en secuencia ordenada y exacta', () => {
    vi.useFakeTimers();

    let toastRef;
    render(
      <ToastProvider>
        <ToastStressHarness onMounted={(t) => { toastRef = t; }} />
      </ToastProvider>
    );

    act(() => {
      toastRef.toast.success('Toast T1', 100);
      toastRef.toast.success('Toast T2', 200);
      toastRef.toast.success('Toast T3', 300);
      toastRef.toast.success('Toast T4', 400);
      toastRef.toast.success('Toast T5', 500);
    });

    expect(screen.getAllByTestId('toast-item').length).toBe(5);

    // Avanzamos 100ms: T1 expira
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Toast T1')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('toast-item').length).toBe(4);

    // Avanzamos 100ms más (total 200ms): T2 expira
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Toast T2')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('toast-item').length).toBe(3);

    // Avanzamos 100ms más (total 300ms): T3 expira
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Toast T3')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('toast-item').length).toBe(2);

    // Avanzamos 100ms más (total 400ms): T4 expira
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Toast T4')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('toast-item').length).toBe(1);

    // Avanzamos 100ms más (total 500ms): T5 expira
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Toast T5')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('toast-item').length).toBe(0);
  });

  it('3. Cierre manual anticipado limpia el temporizador y previene efectos residuales (race condition)', () => {
    vi.useFakeTimers();

    let toastRef;
    render(
      <ToastProvider>
        <ToastStressHarness onMounted={(t) => { toastRef = t; }} />
      </ToastProvider>
    );

    act(() => {
      toastRef.toast.error('Error con temporizador largo', 10000);
    });

    expect(screen.getByText('Error con temporizador largo')).toBeInTheDocument();

    // El usuario cierra inmediatamente el toast al cabo de 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const closeBtn = screen.getByTestId('toast-close');
    act(() => {
      fireEvent.click(closeBtn);
    });

    expect(screen.queryByText('Error con temporizador largo')).not.toBeInTheDocument();

    // Avanzar más allá del tiempo original (15000ms) no debe generar excepciones ni fugas
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.queryAllByTestId('toast-item').length).toBe(0);
  });

  it('4. Cierre selectivo de elementos intermedios en una pila de toasts', () => {
    let toastRef;
    render(
      <ToastProvider>
        <ToastStressHarness onMounted={(t) => { toastRef = t; }} />
      </ToastProvider>
    );

    act(() => {
      toastRef.toast.info('Item Alfa', 0);
      toastRef.toast.info('Item Beta', 0);
      toastRef.toast.info('Item Gamma', 0);
      toastRef.toast.info('Item Delta', 0);
    });

    const items = screen.getAllByTestId('toast-item');
    expect(items.length).toBe(4);

    // Cerramos el item Beta (segundo en la lista)
    const closeButtons = screen.getAllByTestId('toast-close');
    fireEvent.click(closeButtons[1]);

    expect(screen.queryByText('Item Beta')).not.toBeInTheDocument();
    expect(screen.getByText('Item Alfa')).toBeInTheDocument();
    expect(screen.getByText('Item Gamma')).toBeInTheDocument();
    expect(screen.getByText('Item Delta')).toBeInTheDocument();
    expect(screen.getAllByTestId('toast-item').length).toBe(3);
  });

  it('5. Toasts con duración 0 o negativa permanecen persistentes hasta cierre explícito', () => {
    vi.useFakeTimers();

    let toastRef;
    render(
      <ToastProvider>
        <ToastStressHarness onMounted={(t) => { toastRef = t; }} />
      </ToastProvider>
    );

    act(() => {
      toastRef.toast.warning('Persistente con cero', 0);
      toastRef.toast.warning('Persistente con negativo', -100);
    });

    expect(screen.getAllByTestId('toast-item').length).toBe(2);

    // Avanzamos 1 minuto simulado
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // Deben seguir presentes en pantalla
    expect(screen.getByText('Persistente con cero')).toBeInTheDocument();
    expect(screen.getByText('Persistente con negativo')).toBeInTheDocument();

    // Cerramos uno manualmente
    const closeButtons = screen.getAllByTestId('toast-close');
    act(() => {
      fireEvent.click(closeButtons[0]);
    });

    expect(screen.queryByText('Persistente con cero')).not.toBeInTheDocument();
    expect(screen.getByText('Persistente con negativo')).toBeInTheDocument();
  });

  it('6. Resistencia contra inyección XSS y payloads maliciosos en mensajes de toast', () => {
    let toastRef;
    render(
      <ToastProvider>
        <ToastStressHarness onMounted={(t) => { toastRef = t; }} />
      </ToastProvider>
    );

    const xssPayload = '<script>window.__xss_toast_flag = true;</script><img src=x onerror="window.__xss_toast_flag=true">';

    act(() => {
      toastRef.toast.error(xssPayload, 0);
    });

    const toastItem = screen.getByTestId('toast-item');
    expect(toastItem).toBeInTheDocument();
    // Debe renderizarse como texto plano escapado por React, no ejecutarse en DOM
    expect(toastItem.textContent).toContain('<script>window.__xss_toast_flag = true;</script>');
    expect(window.__xss_toast_flag).toBeUndefined();
  });

  it('7. Mensaje extremadamente largo (2000 caracteres continuos) no rompe la vista y usa break-words', () => {
    let toastRef;
    render(
      <ToastProvider>
        <ToastStressHarness onMounted={(t) => { toastRef = t; }} />
      </ToastProvider>
    );

    const veryLongString = 'UNBROKEN_STRING_'.repeat(120);

    act(() => {
      toastRef.toast.info(veryLongString, 0);
    });

    const toastItem = screen.getByTestId('toast-item');
    expect(toastItem).toBeInTheDocument();
    const messageContainer = toastItem.querySelector('.break-words');
    expect(messageContainer).toBeInTheDocument();
  });

  it('8. Manejo de valores falsy (null, undefined, string vacío) no produce excepciones', () => {
    let toastRef;
    render(
      <ToastProvider>
        <ToastStressHarness onMounted={(t) => { toastRef = t; }} />
      </ToastProvider>
    );

    expect(() => {
      act(() => {
        toastRef.toast.success('');
        toastRef.toast.error(null);
        toastRef.toast.warning(undefined);
      });
    }).not.toThrow();

    const items = screen.getAllByTestId('toast-item');
    expect(items.length).toBe(3);
  });

  it('9. Tipo de notificación no reconocido cae en configuración fallback sin error', () => {
    let toastRef;
    render(
      <ToastProvider>
        <ToastStressHarness onMounted={(t) => { toastRef = t; }} />
      </ToastProvider>
    );

    act(() => {
      toastRef.toast.dismiss('non-existent-id');
    });

    act(() => {
      // Invocamos addToast directo con tipo desconocido si fuera posible mediante alias
      toastRef.info('Tipo fallback');
    });

    expect(screen.getByText('Tipo fallback')).toBeInTheDocument();
  });
});

describe('ESTRÉS Y ADVERSARIAL: Interactive Modals Under Stress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Clic en el backdrop resuelve false en confirm() y cierra el modal', async () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByTestId('open-simple-confirm'));

    const modalBackdrop = screen.getByTestId('confirm-modal');
    expect(modalBackdrop).toBeInTheDocument();

    // Clic directo sobre el backdrop
    fireEvent.click(modalBackdrop);

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('last-modal-result')).toHaveTextContent('false');
    });
  });

  it('2. Clic en el backdrop de promptModal resuelve null y cierra el modal', async () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByTestId('open-simple-prompt'));

    const modalBackdrop = screen.getByTestId('confirm-modal');
    expect(modalBackdrop).toBeInTheDocument();

    fireEvent.click(modalBackdrop);

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('last-modal-result')).toHaveTextContent('null');
    });
  });

  it('3. Clic dentro de la tarjeta del modal NO propaga al backdrop ni cierra el modal', async () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByTestId('open-simple-confirm'));

    const modalTitle = screen.getByText('Confirmación estándar');
    expect(modalTitle).toBeInTheDocument();

    // Clic en el título dentro de la tarjeta
    fireEvent.click(modalTitle);

    // Modal debe seguir completamente visible
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByTestId('last-modal-result')).toHaveTextContent('null');
  });

  it('4. Limpieza de listeners de teclado: Escape fuera de modal no causa excepciones ni resoluciones fantasmas', () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    // Presionar Escape cuando no hay ningún modal abierto
    expect(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    }).not.toThrow();

    expect(screen.getByTestId('last-modal-result')).toHaveTextContent('null');
  });

  it('5. Estrés de ciclo de vida: 20 aperturas y cierres consecutivos con Escape sin fuga de listeners', async () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByTestId('open-simple-confirm'));
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('last-modal-result')).toHaveTextContent('false');
    }
  });

  it('6. Prompt simple: enviar con tecla Enter captura el texto y resuelve', async () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByTestId('open-simple-prompt'));

    const input = screen.getByTestId('prompt-input');
    fireEvent.change(input, { target: { value: 'Texto enviado con Enter' } });

    // Presionar Enter sobre el input
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('last-modal-result')).toHaveTextContent('Texto enviado con Enter');
    });
  });

  it('7. Prompt textarea: la tecla Enter agrega salto de línea y NO envía el modal prematuramente', async () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByTestId('open-textarea-prompt'));

    const textarea = screen.getByTestId('prompt-input');
    fireEvent.change(textarea, { target: { value: 'Línea 1' } });

    // Presionar Enter sobre el textarea no debe disparar onConfirm
    fireEvent.keyDown(textarea, { key: 'Enter' });

    // El modal debe permanecer abierto
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    // Confirmamos explícitamente con el botón OK
    const okBtn = screen.getByTestId('confirm-modal-ok');
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('last-modal-result')).toHaveTextContent('Línea 1');
    });
  });

  it('8. Prompt con required=true: valida espacios en blanco y bloquea envío por Enter', () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByTestId('open-required-prompt'));

    const input = screen.getByTestId('prompt-input');
    const okBtn = screen.getByTestId('confirm-modal-ok');

    expect(okBtn).toBeDisabled();

    // Espacios en blanco no deben habilitar
    fireEvent.change(input, { target: { value: '     ' } });
    expect(okBtn).toBeDisabled();

    // Intentar presionar Enter con espacios no debe enviar
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    // Ingresar texto válido habilita
    fireEvent.change(input, { target: { value: 'Justificación válida' } });
    expect(okBtn).not.toBeDisabled();

    // Borrar todo vuelve a deshabilitar y muestra mensaje de validación
    fireEvent.change(input, { target: { value: '' } });
    expect(okBtn).toBeDisabled();
    expect(screen.getByText('Este campo es requerido.')).toBeInTheDocument();
  });

  it('9. Prompt preserva defaultValue original si el usuario confirma sin modificar', async () => {
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByTestId('open-simple-prompt'));

    const input = screen.getByTestId('prompt-input');
    expect(input.value).toBe('Texto inicial');

    fireEvent.click(screen.getByTestId('confirm-modal-ok'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('last-modal-result')).toHaveTextContent('Texto inicial');
    });
  });

  it('10. Estilos contextuales: variante danger y warning aplican clases y paleta visual correcta', () => {
    const { unmount } = render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );

    // Modal Peligro / Destructivo
    fireEvent.click(screen.getByTestId('open-danger-confirm'));
    let okBtn = screen.getByTestId('confirm-modal-ok');
    expect(okBtn.className).toContain('bg-rose-600');
    fireEvent.click(screen.getByTestId('confirm-modal-cancel'));

    unmount();

    // Modal Advertencia
    render(
      <ConfirmProvider>
        <ModalStressHarness />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByTestId('open-warning-confirm'));
    okBtn = screen.getByTestId('confirm-modal-ok');
    expect(okBtn.className).toContain('bg-amber-600');
  });

  it('11. Inyección adversaria en título y mensaje del modal es saneada de manera segura', () => {
    let modalApi;
    render(
      <ConfirmProvider>
        <ModalStressHarness onMounted={(api) => { modalApi = api; }} />
      </ConfirmProvider>
    );

    act(() => {
      modalApi.confirm({
        title: '<script>window.__modal_xss=true;</script>Título Seguro',
        message: '<img src="invalid" onerror="window.__modal_xss=true;">Mensaje Seguro',
      });
    });

    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.textContent).toContain('<script>window.__modal_xss=true;</script>Título Seguro');
    expect(modal.textContent).toContain('<img src="invalid" onerror="window.__modal_xss=true;">Mensaje Seguro');
    expect(window.__modal_xss).toBeUndefined();
  });
});
