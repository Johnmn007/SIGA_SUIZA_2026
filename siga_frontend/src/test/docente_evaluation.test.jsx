import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { EvaluationDashboard } from '../modules/evaluation/EvaluationDashboard';
import { DocentePlanning } from '../modules/academic/DocentePlanning';
import { apiClient } from '../core/api/client';

// Mock del contexto de autenticación
vi.mock('../core/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 10, email: 'docente.test@siga.edu', full_name: 'Prof. Roberto Saboya', role: 'docente' },
    token: 'fake-jwt-token'
  })
}));

// Mock de apiClient
vi.mock('../core/api/client', () => ({
  apiClient: {
    request: vi.fn()
  }
}));

describe('Auditoría Frontend - Rol Docente (EvaluationDashboard & DocentePlanning)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Debe renderizar la lista de estudiantes con notas cuando la API responde exitosamente', async () => {
    apiClient.request.mockImplementation((endpoint) => {
      if (endpoint.includes('/programas-estudio/programas') && !endpoint.includes('/malla')) {
        return Promise.resolve([{ id: 1, nombre: 'Desarrollo de Sistemas de Información' }]);
      }
      if (endpoint.includes('/programas-estudio/periodos')) {
        return Promise.resolve([{ id: 1, codigo: '2026-I' }]);
      }
      if (endpoint.includes('/carga-lectiva')) {
        return Promise.resolve([{ id: 1, programa_id: 1, periodo_id: 1, unidad_didactica_id: 101 }]);
      }
      if (endpoint.includes('/malla')) {
        return Promise.resolve([
          { id: 1, nombre: 'Módulo 3', periodo: 3, unidades: [{ id: 101, nombre: 'Taller de Programación Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Estudiante', apellidos: 'Prueba SIGA' },
          { id: 101, matricula_detalle_id: 81, nombres: 'Ana María', apellidos: 'Gómez Perez' }
        ]);
      }
      if (endpoint.includes('/registros/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 200, matricula_detalle_id: 80, nota_final: 16, estado: 'aprobado' }
        ]);
      }
      return Promise.resolve([]);
    });

    render(<EvaluationDashboard />);

    // Esperar a que la unidad didáctica cargue en el select
    await screen.findByText('Taller de Programación Web');
    const selectUnit = screen.getByRole('combobox');
    fireEvent.change(selectUnit, { target: { value: '101' } });

    // Verificar que los estudiantes se renderizan en la nómina
    await waitFor(() => {
      expect(screen.getByText(/Prueba SIGA, Estudiante/i)).toBeInTheDocument();
      expect(screen.getByText(/Gómez Perez, Ana María/i)).toBeInTheDocument();
    });

    // Verificar condición aprobada para el estudiante con nota 16
    expect(screen.getByText(/Aprobado/i)).toBeInTheDocument();
    expect(screen.getByText(/Pendiente/i)).toBeInTheDocument();
  });

  it('2. Los estados de carga y error de la API no deben romper la pantalla', async () => {
    // Simular que las peticiones rechazan con error 500
    apiClient.request.mockRejectedValue(new Error('Internal Server Error 500'));

    const { container } = render(<EvaluationDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Registro de Calificaciones')).toBeInTheDocument();
    });

    // La interfaz no debe colapsar y debe seguir en el DOM
    expect(container).toBeDefined();
    expect(screen.getByText(/Módulo de Evaluación y Calificaciones/i)).toBeInTheDocument();
  });

  it('3. Una nota fuera de rango (ej. 25 o -1) no actualiza el estado y no envía la petición a la API', async () => {
    apiClient.request.mockImplementation((endpoint) => {
      if (endpoint.includes('/programas-estudio/programas') && !endpoint.includes('/malla')) {
        return Promise.resolve([{ id: 1, nombre: 'DSI' }]);
      }
      if (endpoint.includes('/programas-estudio/periodos')) {
        return Promise.resolve([{ id: 1, codigo: '2026-I' }]);
      }
      if (endpoint.includes('/carga-lectiva')) {
        return Promise.resolve([{ id: 1, programa_id: 1, periodo_id: 1, unidad_didactica_id: 101 }]);
      }
      if (endpoint.includes('/malla')) {
        return Promise.resolve([
          { id: 1, nombre: 'Módulo 3', periodo: 3, unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Luis', apellidos: 'Ruiz' }
        ]);
      }
      if (endpoint.includes('/registros/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 200, matricula_detalle_id: 80, nota_final: 14, estado: 'aprobado' }
        ]);
      }
      return Promise.resolve([]);
    });

    render(<EvaluationDashboard />);

    await screen.findByText('Taller Web');
    const selectUnit = screen.getByRole('combobox');
    fireEvent.change(selectUnit, { target: { value: '101' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('14')).toBeInTheDocument();
    });

    const inputNota = screen.getByDisplayValue('14');

    // Intentar escribir nota fuera de rango (25)
    fireEvent.change(inputNota, { target: { value: '25' } });

    // La nota no debe haber cambiado a 25 en el input
    expect(inputNota.value).not.toBe('25');

    // Click en Guardar
    const saveBtn = screen.getByRole('button', { name: /Guardar Promedios/i });
    fireEvent.click(saveBtn);

    // No debe haber enviado ninguna petición PUT con 25
    expect(apiClient.request).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.stringContaining('"nota_final":25')
      })
    );
  });

  it('4. [BUG-D10] Debe mostrar un mensaje de error visual cuando se ingresa una nota fuera de rango', async () => {
    // BUG-D10: EvaluationDashboard actualmente ignora en silencio las notas inválidas sin mostrar ningún mensaje de advertencia o feedback al usuario
    apiClient.request.mockImplementation((endpoint) => {
      if (endpoint.includes('/programas-estudio/programas') && !endpoint.includes('/malla')) {
        return Promise.resolve([{ id: 1, nombre: 'DSI' }]);
      }
      if (endpoint.includes('/programas-estudio/periodos')) {
        return Promise.resolve([{ id: 1, codigo: '2026-I' }]);
      }
      if (endpoint.includes('/carga-lectiva')) {
        return Promise.resolve([{ id: 1, programa_id: 1, periodo_id: 1, unidad_didactica_id: 101 }]);
      }
      if (endpoint.includes('/malla')) {
        return Promise.resolve([
          { id: 1, nombre: 'Módulo 3', periodo: 3, unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Luis', apellidos: 'Ruiz' }
        ]);
      }
      return Promise.resolve([]);
    });

    render(<EvaluationDashboard />);
    await screen.findByText('Taller Web');
    const selectUnit = screen.getByRole('combobox');
    fireEvent.change(selectUnit, { target: { value: '101' } });

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const inputNota = screen.getByRole('textbox');
    fireEvent.change(inputNota, { target: { value: '25' } });

    // Se espera que aparezca un mensaje de error visible para el docente, pero falla porque no está implementado
    expect(screen.getByText(/La nota debe estar entre 0 y 20/i)).toBeInTheDocument();
  });

  it('5. DocentePlanning se renderiza y muestra opciones de subida de sílabos y planes', async () => {
    apiClient.request.mockImplementation((endpoint) => {
      if (endpoint.includes('/programas-estudio/programas') && !endpoint.includes('/malla')) {
        return Promise.resolve([{ id: 1, nombre: 'DSI' }]);
      }
      if (endpoint.includes('/programas-estudio/periodos')) {
        return Promise.resolve([{ id: 1, codigo: '2026-I' }]);
      }
      if (endpoint.includes('/carga-lectiva')) {
        return Promise.resolve([
          { id: 1, programa_id: 1, periodo_id: 1, unidad_didactica_id: 101, seccion: 'A', turno: 'M' }
        ]);
      }
      if (endpoint.includes('/malla')) {
        return Promise.resolve([
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/planes-trabajo')) {
        return Promise.resolve([
          { id: 1, estado: 'aprobado', archivo_url: '/docs/plan.pdf' }
        ]);
      }
      if (endpoint.includes('/silabos')) {
        return Promise.resolve([
          { id: 1, carga_lectiva_id: 1, estado: 'presentado', archivo_url: '/docs/silabo.pdf' }
        ]);
      }
      return Promise.resolve([]);
    });

    render(<DocentePlanning />);

    await waitFor(() => {
      expect(screen.getByText(/Plan de Trabajo/i)).toBeInTheDocument();
      expect(screen.getByText(/Unidades Didácticas y Sílabos/i)).toBeInTheDocument();
    });
  });

  it('6. DocentePlanning tolera fallos de red sin romper la interfaz', async () => {
    apiClient.request.mockRejectedValue(new Error('Network error'));

    const { container } = render(<DocentePlanning />);

    await waitFor(() => {
      expect(container).toBeDefined();
    });

    expect(container.firstChild).toHaveClass('space-y-6');
  });
});
