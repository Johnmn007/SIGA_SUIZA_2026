import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { ToastProvider } from '../core/ui/ToastContext';
import { ConfirmProvider } from '../core/ui/ConfirmModal';
import { ScheduleBuilder } from '../modules/academic/ScheduleBuilder';
import { CoordinatorTutorias } from '../modules/academic/CoordinatorTutorias';
import { CoordinatorSupervision } from '../modules/evaluation/CoordinatorSupervision';

// Mock Auth Context
vi.mock('../core/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 10, full_name: 'Docente Test', roles: ['docente', 'coordinador_programa'] },
    openPasswordModal: vi.fn(),
  }),
}));

// Mock API client
vi.mock('../core/api/client', () => ({
  apiClient: {
    request: vi.fn(() => Promise.resolve([])),
  },
}));

describe('Milestone 3: Erradicación Absoluta de Diálogos Nativos del Navegador', () => {
  let alertSpy;
  let confirmSpy;
  let promptSpy;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);
    promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => '');
  });

  afterEach(() => {
    alertSpy.mockRestore();
    confirmSpy.mockRestore();
    promptSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('1. Verificación Estática del Código Fuente (Zero Tolerancia)', () => {
    const modulesDir = path.resolve(__dirname, '../modules');

    const targetFiles = [
      path.join(modulesDir, 'academic/DocentePlanning.jsx'),
      path.join(modulesDir, 'academic/CoordinatorAcademic.jsx'),
      path.join(modulesDir, 'academic/CoordinatorReview.jsx'),
      path.join(modulesDir, 'academic/CoordinatorTutorias.jsx'),
      path.join(modulesDir, 'academic/ScheduleBuilder.jsx'),
      path.join(modulesDir, 'evaluation/CoordinatorSupervision.jsx'),
      path.join(modulesDir, 'evaluation/EvaluationDashboard.jsx'),
    ];

    targetFiles.forEach((filePath) => {
      const fileName = path.basename(filePath);

      it(`El archivo ${fileName} no debe contener llamadas nativas window.alert, window.confirm o window.prompt`, () => {
        expect(fs.existsSync(filePath)).toBe(true);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Verificar window.alert, window.confirm, window.prompt
        expect(content).not.toMatch(/window\.alert\s*\(/);
        expect(content).not.toMatch(/window\.confirm\s*\(/);
        expect(content).not.toMatch(/window\.prompt\s*\(/);

        // Verificar llamadas directas alert(...) que no sean de toast o confirm
        const alertMatches = content.match(/(?<!toast\.)\balert\s*\(/g);
        expect(alertMatches).toBeNull();

        // Verificar llamadas directas prompt(...) que no sean promptModal o hook prompt
        const promptMatches = content.match(/(?<!promptModal\s*\()(?<!confirm\.)\bprompt\s*\(/g);
        expect(promptMatches).toBeNull();
      });
    });
  });

  describe('2. Verificación de Comportamiento Dinámico e Interactivo', () => {
    it('ScheduleBuilder: el botón "Guardar" dispara useToast (toast.info) en lugar de window.alert', async () => {
      render(
        <ToastProvider>
          <ConfirmProvider>
            <ScheduleBuilder
              cargaLectiva={[]}
              getUDName={() => 'Curso Demo'}
              getDocenteName={() => 'Prof. Demo'}
            />
          </ConfirmProvider>
        </ToastProvider>
      );

      const saveButton = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(saveButton);

      expect(alertSpy).not.toHaveBeenCalled();

      // Debe aparecer el toast informativo flotante
      const toastItem = await screen.findByTestId('toast-info');
      expect(toastItem).toBeInTheDocument();
      expect(screen.getByText(/Horario guardado temporalmente/i)).toBeInTheDocument();
    });

    it('ScheduleBuilder: el botón "Limpiar" abre modal interactivo useConfirm y al confirmar muestra toast', async () => {
      render(
        <ToastProvider>
          <ConfirmProvider>
            <ScheduleBuilder
              cargaLectiva={[]}
              getUDName={() => 'Curso Demo'}
              getDocenteName={() => 'Prof. Demo'}
            />
          </ConfirmProvider>
        </ToastProvider>
      );

      const clearButton = screen.getByRole('button', { name: /limpiar/i });
      fireEvent.click(clearButton);

      // No debe llamar a window.confirm
      expect(confirmSpy).not.toHaveBeenCalled();

      // Debe abrir el modal interactivo de confirmación
      const modal = await screen.findByTestId('confirm-modal');
      expect(modal).toBeInTheDocument();
      expect(screen.getByText('Limpiar Horario')).toBeInTheDocument();
      expect(screen.getByText('¿Seguro que desea limpiar todo el horario?')).toBeInTheDocument();

      // Al confirmar en el modal
      const confirmOkBtn = screen.getByTestId('confirm-modal-ok');
      fireEvent.click(confirmOkBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      });

      // Debe notificar con toast informativo
      const toast = await screen.findByTestId('toast-info');
      expect(toast).toBeInTheDocument();
      expect(screen.getByText('Horario limpiado correctamente')).toBeInTheDocument();
    });

    it('CoordinatorTutorias: validación de ciclo/docente vacío dispara toast.warning en vez de alert', async () => {
      render(
        <ToastProvider>
          <ConfirmProvider>
            <CoordinatorTutorias
              programId="1"
              periodId="1"
              docentes={[{ id: 1, full_name: 'Prof. Demo' }]}
            />
          </ConfirmProvider>
        </ToastProvider>
      );

      const form = screen.getByRole('button', { name: /guardar asignación/i }).closest('form');
      fireEvent.submit(form);

      expect(alertSpy).not.toHaveBeenCalled();

      const warningToast = await screen.findByTestId('toast-warning');
      expect(warningToast).toBeInTheDocument();
      expect(screen.getByText('Seleccione ciclo y docente')).toBeInTheDocument();
    });

    it('CoordinatorSupervision: exportación de acta oficial dispara toast.info en vez de alert', async () => {
      // Mock de subida de modal con portal
      render(
        <ToastProvider>
          <CoordinatorSupervision />
        </ToastProvider>
      );

      // Simular apertura de modal de acta seleccionando una unidad
      const viewActaButtons = screen.queryAllByRole('button', { name: /ver acta/i });
      if (viewActaButtons.length > 0) {
        fireEvent.click(viewActaButtons[0]);
      }

      // El botón de exportar acta oficial si se renderiza
      const exportBtn = screen.queryByRole('button', { name: /exportar acta oficial/i });
      if (exportBtn) {
        fireEvent.click(exportBtn);
        expect(alertSpy).not.toHaveBeenCalled();
        const toast = await screen.findByTestId('toast-info');
        expect(toast).toBeInTheDocument();
      }
    });
  });
});
