import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('7. [PASO 1] Renderiza banner editable con fecha límite formateada en DD/MM/AAAA y alerta si quedan <= 3 días', async () => {
    // Calculamos fecha límite dentro de 2 días
    const hoy = new Date();
    const fechaLimite = new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000);
    const y = fechaLimite.getFullYear();
    const m = String(fechaLimite.getMonth() + 1).padStart(2, '0');
    const d = String(fechaLimite.getDate()).padStart(2, '0');
    const fechaLimiteIso = `${y}-${m}-${d}`;
    const fechaLimiteEsp = `${d}/${m}/${y}`;

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
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Estudiante', apellidos: 'Uno' }
        ]);
      }
      if (endpoint.includes('/actas/unidad/101/periodo/1')) {
        return Promise.resolve({
          tiene_carga: true,
          acta_cerrada: false,
          fecha_limite_notas: fechaLimiteIso,
          editable: true,
          motivo_bloqueo: null
        });
      }
      return Promise.resolve([]);
    });

    render(<EvaluationDashboard />);
    await screen.findByText('Taller Web');
    const selectUnit = screen.getByRole('combobox');
    fireEvent.change(selectUnit, { target: { value: '101' } });

    await waitFor(() => {
      expect(screen.getByTestId('banner-fecha-limite')).toBeInTheDocument();
    });

    // Validar formato DD/MM/AAAA y mensaje de urgencia (<= 3 días)
    const banner = screen.getByTestId('banner-fecha-limite');
    expect(banner).toHaveTextContent(new RegExp(`Plazo para ingresar notas hasta\\s+${fechaLimiteEsp}`, 'i'));
    expect(banner).toHaveTextContent(/¡Quedan 2 días!/i);
  });

  it('8. [PASO 1] Banner de acta cerrada con motivo de bloqueo e inputs en read-only / deshabilitados', async () => {
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
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Estudiante', apellidos: 'Uno' }
        ]);
      }
      if (endpoint.includes('/actas/unidad/101/periodo/1')) {
        return Promise.resolve({
          tiene_carga: true,
          acta_cerrada: true,
          fecha_limite_notas: null,
          editable: false,
          motivo_bloqueo: 'El acta de la unidad 101 del periodo 2026-I está cerrada. Solicite su reapertura al coordinador.'
        });
      }
      return Promise.resolve([]);
    });

    render(<EvaluationDashboard />);
    await screen.findByText('Taller Web');
    const selectUnit = screen.getByRole('combobox');
    fireEvent.change(selectUnit, { target: { value: '101' } });

    await waitFor(() => {
      expect(screen.getByTestId('banner-bloqueado')).toBeInTheDocument();
    });

    // Verificar motivo de bloqueo visible
    expect(screen.getByText(/El acta de la unidad 101 del periodo 2026-I está cerrada/i)).toBeInTheDocument();

    // Verificar inputs deshabilitados
    const inputNota = screen.getByRole('textbox');
    expect(inputNota).toBeDisabled();

    // Botón guardar deshabilitado con title explicativo
    const saveBtn = screen.getByRole('button', { name: /Guardar Promedios/i });
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute('title', expect.stringMatching(/está cerrada|solo lectura/i));
  });

  it('9. [PASO 1] Unidad sin carga muestra mensaje "Esta unidad no tiene docente asignado..." en read-only', async () => {
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
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Estudiante', apellidos: 'Uno' }
        ]);
      }
      if (endpoint.includes('/actas/unidad/101/periodo/1')) {
        return Promise.resolve({
          tiene_carga: false,
          acta_cerrada: false,
          fecha_limite_notas: null,
          editable: false,
          motivo_bloqueo: null
        });
      }
      return Promise.resolve([]);
    });

    render(<EvaluationDashboard />);
    await screen.findByText('Taller Web');
    const selectUnit = screen.getByRole('combobox');
    fireEvent.change(selectUnit, { target: { value: '101' } });

    await waitFor(() => {
      expect(screen.getByTestId('banner-sin-carga')).toBeInTheDocument();
    });

    expect(screen.getByText(/Esta unidad no tiene docente asignado\. Solicite la asignación a Coordinación de Programa\./i)).toBeInTheDocument();
    const inputNota = screen.getByRole('textbox');
    expect(inputNota).toBeDisabled();
  });

  it('10. [PASO 2] Error 409 al guardar muestra el detail del backend y no pierde notas ingresadas', async () => {
    apiClient.request.mockImplementation((endpoint, options) => {
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
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Estudiante', apellidos: 'Uno' }
        ]);
      }
      if (endpoint.includes('/actas/unidad/101/periodo/1')) {
        return Promise.resolve({
          tiene_carga: true,
          acta_cerrada: false,
          fecha_limite_notas: null,
          editable: true,
          motivo_bloqueo: null
        });
      }
      if (endpoint.includes('/registros') && options?.method === 'POST') {
        const err = new Error('HTTP error! status: 409');
        err.status = 409;
        err.detail = 'El acta de esta unidad didáctica ya se encuentra cerrada';
        return Promise.reject(err);
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
    fireEvent.change(inputNota, { target: { value: '17' } });

    await waitFor(() => {
      expect(inputNota).toHaveValue('17');
    });

    // Click en Guardar
    const saveBtn = screen.getByRole('button', { name: /Guardar Promedios/i });
    fireEvent.click(saveBtn);

    // Debe mostrar la alerta con el detail devuelto por el backend
    await waitFor(() => {
      expect(screen.getByTestId('save-error-alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/El acta de esta unidad didáctica ya se encuentra cerrada/i)).toBeInTheDocument();

    // Las notas ingresadas por el docente NO deben perderse
    expect(inputNota).toHaveValue('17');
  });

  it('11. [PASO 3] Botón "Vista previa del acta" y modal con marca de agua cuando no está cerrada', async () => {
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
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Estudiante', apellidos: 'Uno' }
        ]);
      }
      if (endpoint.includes('/actas/unidad/101/periodo/1')) {
        return Promise.resolve({
          tiene_carga: true,
          acta_cerrada: false,
          fecha_limite_notas: null,
          editable: true,
          motivo_bloqueo: null
        });
      }
      return Promise.resolve([]);
    });

    render(<EvaluationDashboard />);
    await screen.findByText('Taller Web');
    const selectUnit = screen.getByRole('combobox');
    fireEvent.change(selectUnit, { target: { value: '101' } });

    // Esperar a que la nómina de estudiantes cargue y habilite el botón
    await screen.findByText(/Uno, Estudiante/i);
    const actaBtn = await screen.findByRole('button', { name: /Vista previa del acta/i });
    expect(actaBtn).toBeEnabled();

    // Abrir modal de vista previa
    fireEvent.click(actaBtn);
    await waitFor(() => {
      expect(screen.getByTestId('acta-watermark')).toBeInTheDocument();
    });
    expect(screen.getByText(/VISTA PREVIA - ACTA NO CERRADA/i)).toBeInTheDocument();
  });

  it('12. [PASO 3] Botón "Acta oficial" y modal oficial con fecha/hora de cierre en Lima cuando está cerrada', async () => {
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
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/matriculas/unidad/101/periodo/1')) {
        return Promise.resolve([
          { id: 100, matricula_detalle_id: 80, nombres: 'Estudiante', apellidos: 'Uno' }
        ]);
      }
      if (endpoint.includes('/actas/unidad/101/periodo/1')) {
        return Promise.resolve({
          tiene_carga: true,
          acta_cerrada: true,
          fecha_limite_notas: null,
          editable: false,
          motivo_bloqueo: 'El acta está cerrada',
          acta_cerrada_at: '2026-10-30T20:45:00Z' // 15:45 en Lima (UTC-5)
        });
      }
      return Promise.resolve([]);
    });

    render(<EvaluationDashboard />);
    await screen.findByText('Taller Web');
    const selectUnit = screen.getByRole('combobox');
    fireEvent.change(selectUnit, { target: { value: '101' } });

    // Esperar a que la nómina de estudiantes cargue y habilite el botón
    await screen.findByText(/Uno, Estudiante/i);
    const actaOficialBtn = await screen.findByRole('button', { name: /Acta oficial/i });
    expect(actaOficialBtn).toBeEnabled();

    // Abrir modal oficial
    fireEvent.click(actaOficialBtn);
    await waitFor(() => {
      expect(screen.getByText(/ACTA OFICIAL CONSOLIDADA \(CERRADA\)/i)).toBeInTheDocument();
      // En Lima UTC-5, 20:45 UTC es 15:45 (se renderiza en encabezado y pie de página del acta)
      expect(screen.getAllByText(/30\/10\/2026.*15:45/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('13. DocentePlanning permite subir sílabo enviando POST con carga_lectiva_id al backend', async () => {
    window.alert = vi.fn();
    apiClient.request.mockImplementation((endpoint, options) => {
      if (options?.method === 'POST' && endpoint.includes('/silabos')) {
        return Promise.resolve({
          id: 10,
          carga_lectiva_id: 1,
          estado: 'presentado',
          archivo_url: '/docs/silabos/mi_silabo.pdf'
        });
      }
      if (endpoint.includes('/programas-estudio/programas') && !endpoint.includes('/malla')) {
        return Promise.resolve([{ id: 1, nombre: 'DSI' }]);
      }
      if (endpoint.includes('/programas-estudio/periodos')) {
        return Promise.resolve([{ id: 1, codigo: '2026-I', estado: 'abierto' }]);
      }
      if (endpoint.includes('/carga-lectiva')) {
        return Promise.resolve([
          { id: 1, programa_id: 1, periodo_id: 1, unidad_didactica_id: 101, unidad_nombre: 'Taller Web', seccion: 'A', turno: 'M' }
        ]);
      }
      if (endpoint.includes('/malla')) {
        return Promise.resolve([
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/planes-trabajo')) {
        return Promise.resolve([]);
      }
      if (endpoint.includes('/silabos')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    render(<DocentePlanning />);
    const subirSilaboBtn = await screen.findByRole('button', { name: /Subir Sílabo/i });
    expect(subirSilaboBtn).toBeInTheDocument();

    fireEvent.click(subirSilaboBtn);

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const silaboInput = fileInputs[0];
    const fakeFile = new File(['dummy content'], 'mi_silabo.pdf', { type: 'application/pdf' });

    fireEvent.change(silaboInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/mod-programas-estudio/silabos',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            carga_lectiva_id: 1,
            estado: 'presentado',
            archivo_url: '/docs/silabos/mi_silabo.pdf'
          })
        })
      );
      expect(window.alert).toHaveBeenCalledWith('Sílabo enviado correctamente al Coordinador');
    });
  });

  it('14. DocentePlanning permite subir plan de trabajo enviando POST con periodo_id y programa_id', async () => {
    window.alert = vi.fn();
    apiClient.request.mockImplementation((endpoint, options) => {
      if (options?.method === 'POST' && endpoint.includes('/planes-trabajo')) {
        return Promise.resolve({
          id: 5,
          periodo_id: 1,
          programa_id: 1,
          docente_id: 10,
          estado: 'presentado',
          archivo_url: '/docs/planes/plan_anual.pdf'
        });
      }
      if (endpoint.includes('/programas-estudio/programas') && !endpoint.includes('/malla')) {
        return Promise.resolve([{ id: 1, nombre: 'DSI' }]);
      }
      if (endpoint.includes('/programas-estudio/periodos')) {
        return Promise.resolve([{ id: 1, codigo: '2026-I', estado: 'abierto' }]);
      }
      if (endpoint.includes('/carga-lectiva')) {
        return Promise.resolve([
          { id: 1, programa_id: 1, periodo_id: 1, unidad_didactica_id: 101, unidad_nombre: 'Taller Web', seccion: 'A', turno: 'M' }
        ]);
      }
      if (endpoint.includes('/malla')) {
        return Promise.resolve([
          { id: 1, nombre: 'Módulo 3', unidades: [{ id: 101, nombre: 'Taller Web' }] }
        ]);
      }
      if (endpoint.includes('/planes-trabajo')) {
        return Promise.resolve([]);
      }
      if (endpoint.includes('/silabos')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    render(<DocentePlanning />);
    const subirPlanBtn = await screen.findByRole('button', { name: /Subir Plan de Trabajo/i });
    expect(subirPlanBtn).toBeInTheDocument();

    fireEvent.click(subirPlanBtn);

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const planInput = fileInputs[1];
    const fakeFile = new File(['dummy plan'], 'plan_anual.pdf', { type: 'application/pdf' });

    fireEvent.change(planInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/mod-programas-estudio/planes-trabajo',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            periodo_id: 1,
            programa_id: 1,
            docente_id: 10,
            estado: 'presentado',
            archivo_url: '/docs/planes/plan_anual.pdf'
          })
        })
      );
      expect(window.alert).toHaveBeenCalledWith('Plan de Trabajo enviado correctamente al Coordinador');
    });
  });
});
