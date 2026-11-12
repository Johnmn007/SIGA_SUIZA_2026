/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { useToast } from '../../core/ui/ToastContext';
import { DocentePlanning } from '../academic/DocentePlanning';
import { useAuth } from '../../core/auth/useAuth';
import { Save, GraduationCap, Calendar, BookOpen, ClipboardList, AlertTriangle, Target, FileText, Printer, X, CheckCircle2 } from 'lucide-react';

/**
 * Formatea una fecha a formato institucional DD/MM/AAAA.
 */
function formatDateDDMMAAAA(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Convierte una marca de tiempo UTC a America/Lima (UTC-5) en formato DD/MM/AAAA HH:mm.
 */
function formatDateTimeLima(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(d);
  } catch {
    return String(isoStr);
  }
}

/**
 * Calcula los días calendario restantes respecto a la fecha actual en America/Lima.
 */
function getDaysRemainingLima(dateStr) {
  if (!dateStr) return null;
  try {
    const targetDateOnly = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
    const parts = targetDateOnly.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;

    const now = new Date();
    const limaFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayLimaStr = limaFormatter.format(now);
    const [todayY, todayM, todayD] = todayLimaStr.split('-').map(Number);

    const targetUtc = Date.UTC(y, m - 1, d);
    const todayUtc = Date.UTC(todayY, todayM - 1, todayD);

    return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Mapea códigos de error HTTP a mensajes institucionales claros.
 */
function mapSaveError(error) {
  let errorText = "No se pudo guardar, intente nuevamente";
  if (!error) return errorText;

  const status = error.status || (error.response && error.response.status);
  const msg = String(error.message || '');
  const detail = error.detail || (error.response && error.response.data && error.response.data.detail);

  if (status === 401 || /401/i.test(msg) || /sesi[oó]n|token|no autenticado/i.test(msg)) {
    return "Su sesión expiró, vuelva a iniciar sesión";
  }
  if (status === 403 || /403/i.test(msg) || /permiso|no asignado/i.test(msg)) {
    return "No tiene permiso sobre esta unidad";
  }
  if (status === 409 || /409/i.test(msg) || /acta.*cerrada|plazo.*venci/i.test(msg)) {
    if (detail) return detail;
    const cleanMsg = msg.replace(/^HTTP error!\s*status:\s*409\s*-?\s*/i, '').trim();
    return cleanMsg || "El acta de esta unidad está cerrada o el plazo ha vencido";
  }
  if (status === 422 || /422/i.test(msg) || /inv[aá]lid/i.test(msg)) {
    return "Dato inválido (la nota debe ser un entero entre 0 y 20)";
  }
  if (status === 500 || /500|failed to fetch|network/i.test(msg)) {
    return "No se pudo guardar, intente nuevamente";
  }
  if (detail) {
    return detail;
  }
  return errorText;
}

export function EvaluationDashboard() {

  const { user } = useAuth();
  const userRole = user?.role || (Array.isArray(user?.roles) ? user.roles[0]?.name || user.roles[0] : '');
  const isAdmin = Boolean(user?.is_superuser || userRole === 'admin' || userRole === 'superadmin');

  const { user, openPasswordModal } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('notas'); // 'notas', 'planificacion'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showActaModal, setShowActaModal] = useState(false);
  const [gradeError, setGradeError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [actaStatus, setActaStatus] = useState(null);

  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [malla, setMalla] = useState([]);
  const [teacherLoad, setTeacherLoad] = useState([]);

  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const [students, setStudents] = useState([]);

  // Cargar Programas, Periodos y Carga del Docente al iniciar
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [progRes, perRes, loadRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas'),
          apiClient.request('/api/mod-programas-estudio/periodos'),
          user?.id ? apiClient.request(`/api/mod-programas-estudio/docentes/${user.id}/carga-lectiva`).catch(() => []) : Promise.resolve([])
        ]);
        setPrograms(progRes || []);
        setPeriods(perRes || []);
        setTeacherLoad(loadRes || []);

        if (loadRes && loadRes.length > 0) {
          setSelectedProgram(loadRes[0].programa_id.toString());
          setSelectedPeriod(loadRes[0].periodo_id.toString());
        } else {
          if (progRes && progRes.length > 0) {
            setSelectedProgram(progRes[0].id.toString());
          }
          if (perRes && perRes.length > 0) {
            const active = perRes.find(p => ['ACTIVO', 'activo', 'matricula_abierta', 'en_curso'].includes(p.estado)) || perRes[perRes.length - 1];
            setSelectedPeriod(active.id.toString());
          }
        }
      } catch (e) {
        console.error('Error fetching initial data', e);
      }
    };
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  // Cargar Malla cuando se selecciona un Programa
  useEffect(() => {
    if (!selectedProgram) {
      setMalla([]);
      setSelectedUnit('');
      return;
    }
    const fetchMalla = async () => {
      try {
        const res = await apiClient.request(`/api/mod-programas-estudio/programas/${selectedProgram}/malla`);
        setMalla(res || []);
      } catch (e) {
        console.error('Error fetching malla', e);
      }
    };
    fetchMalla();
  }, [selectedProgram]);

  // Cargar Estudiantes matriculados, notas y estado del acta cuando se selecciona la Unidad y el Periodo
  useEffect(() => {
    setSaveSuccess(null);
    setSaveError(null);
    setGradeError(null);

    if (!selectedUnit || !selectedPeriod) {
      setStudents([]);
      setActaStatus(null);
      return;
    }

    const fetchStudentsAndGrades = async () => {
      setLoading(true);
      try {
        const [enrolled, grades, actaInfo] = await Promise.all([
          apiClient.request(`/api/mod-gestion-academica/matriculas/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => []),
          apiClient.request(`/api/mod-evaluacion/registros/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => []),
          apiClient.request(`/api/mod-evaluacion/actas/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => null)
        ]);

        if (actaInfo && typeof actaInfo === 'object' && !Array.isArray(actaInfo) && 'tiene_carga' in actaInfo) {
          setActaStatus(actaInfo);
        } else {
          setActaStatus(null);
        }

        const enrolledList = Array.isArray(enrolled) ? enrolled : [];
        const gradesList = Array.isArray(grades) ? grades : [];

        const combined = enrolledList.map(est => {
          const gradeRecord = gradesList.find(g => g.matricula_detalle_id === est.matricula_detalle_id);
          return {
            id: est.id,
            matricula_detalle_id: est.matricula_detalle_id,
            name: `${est.apellidos}, ${est.nombres}`,
            registro_id: gradeRecord ? gradeRecord.id : null,
            nota_final: gradeRecord?.nota_final ?? ''
          };
        });

        combined.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(combined);
      } catch (e) {
        console.error('Error fetching students and grades', e);
      }
      setLoading(false);
    };

    fetchStudentsAndGrades();
  }, [selectedUnit, selectedPeriod]);

  const isReadOnly = Boolean(
    actaStatus && (!actaStatus.tiene_carga || !actaStatus.editable)
  );

  // Sincronizar nómina de alumnos con el programa/sección
  const handleSyncStudents = async () => {
    if (!selectedUnit || !selectedPeriod) return;
    setSyncing(true);
    try {
      const res = await apiClient.request(`/api/mod-evaluacion/seccion/${selectedUnit}/periodo/${selectedPeriod}/sincronizar`, {
        method: 'POST'
      });
      await fetchStudentsAndGrades();
      if (res?.status === 'warning') {
        toast.warning(res.message);
      } else {
        toast.success(res?.message || "Nómina de estudiantes sincronizada con éxito.");
      }
    } catch (e) {
      console.error("Error sincronizando nómina", e);
      toast.error("Ocurrió un error al sincronizar la nómina: " + (e.message || "Error del servidor"));
    } finally {
      setSyncing(false);
    }
  };

  const handleGradeChange = (studentId, criteria, value) => {
    if (isReadOnly) return;

    if (value !== '' && !/^\d+$/.test(value)) {
      setGradeError('La nota debe ser un número entero entre 0 y 20');
      return;
    }

    const numValue = parseInt(value, 10);
    if (value !== '' && (numValue < 0 || numValue > 20)) {
      setGradeError('La nota debe estar entre 0 y 20');
      return;
    }

    setGradeError(null);
    setSaveError(null);
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, [criteria]: value };
      }
      return s;
    }));
  };

  const handleSaveGrades = async () => {
    if (!selectedUnit || !selectedPeriod || students.length === 0 || isReadOnly) return;

    // Validación cliente de todas las notas
    const hasInvalidGrade = students.some(s => {
      if (s.nota_final === '' || s.nota_final === null || s.nota_final === undefined) return false;
      const n = Number(s.nota_final);
      return isNaN(n) || !Number.isInteger(n) || n < 0 || n > 20;
    });

    if (hasInvalidGrade) {
      setGradeError('La nota debe estar entre 0 y 20');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const promises = students.map(student => {
        const payload = {
          nota_final: student.nota_final !== '' && student.nota_final !== null ? parseInt(student.nota_final, 10) : null
        };

        if (student.registro_id) {
          return apiClient.request(`/api/mod-evaluacion/registros/${student.registro_id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          }).then(data => ({ status: 'ok', data }));
        } else {
          return apiClient.request(`/api/mod-evaluacion/registros`, {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              matricula_detalle_id: student.matricula_detalle_id,
              estudiante_id: student.id,
              unidad_didactica_id: parseInt(selectedUnit, 10),
              periodo_id: parseInt(selectedPeriod, 10)
            })
          }).then(data => ({ status: 'ok', data }));
        }
      });

      const results = await Promise.all(promises);

      const newStudents = [...students];
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === 'ok' && !newStudents[i].registro_id) {
          newStudents[i].registro_id = res.data.id;
        }
      }

      setStudents(newStudents);
      setSaveSuccess('Calificaciones guardadas exitosamente');
    } catch (e) {
      console.error('Error saving grades', e);
      setSaveError(mapSaveError(e));

      toast.success("¡Calificaciones guardadas exitosamente en el sistema SIGA!");
    } catch (e) {
      console.error('Error saving grades', e);
      toast.error("Ocurrió un error al guardar las calificaciones: " + (e.message || "Error de conexión"));

    } finally {
      setSaving(false);
    }
  };

  // Exportar Plantilla Excel / CSV
  const handleExportCSV = () => {
    if (!students || students.length === 0) return;
    const unitName = currentUnitName.replace(/,/g, ' ');
    const headers = "N°,DNI,Apellidos y Nombres,Capacidad 1 (C1),Capacidad 2 (C2),Capacidad 3 (C3),Promedio Final,Condición
";
    const rows = students.map((s, idx) => {
      const cond = s.nota_final === '' ? 'Pendiente' : (parseInt(s.nota_final, 10) >= 13 ? 'Aprobado' : 'Desaprobado');
      return `${idx + 1},"${s.dni}","${s.name}",${s.nota_c1},${s.nota_c2},${s.nota_c3},${s.nota_final},${cond}`;
    }).join('
');

    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Registro_Notas_${unitName.replace(/\s+/g, '_')}_${currentPeriodName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Importar Notas desde Archivo Excel / CSV
  const handleImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?
/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          toast.warning("El archivo no contiene suficientes filas.");
          return;
        }

        let loadedCount = 0;
        setStudents(prev => {
          const updated = [...prev];

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
            // Columns: N°, DNI, Apellidos y Nombres, C1, C2, C3, Promedio Final
            if (cols.length >= 3) {
              const dniOrName = cols[1];
              const studentName = cols[2];
              const c1 = cols[3] || '';
              const c2 = cols[4] || '';
              const c3 = cols[5] || '';
              const prom = cols[6] || '';

              const matchIdx = updated.findIndex(s => 
                (dniOrName && s.dni && s.dni === dniOrName) || 
                (studentName && s.name.toLowerCase() === studentName.toLowerCase())
              );

              if (matchIdx !== -1) {
                loadedCount++;
                const item = { ...updated[matchIdx] };
                if (c1 !== '' && !isNaN(Number(c1))) item.nota_c1 = String(Math.min(20, Math.max(0, parseInt(c1, 10))));
                if (c2 !== '' && !isNaN(Number(c2))) item.nota_c2 = String(Math.min(20, Math.max(0, parseInt(c2, 10))));
                if (c3 !== '' && !isNaN(Number(c3))) item.nota_c3 = String(Math.min(20, Math.max(0, parseInt(c3, 10))));

                const validVals = [item.nota_c1, item.nota_c2, item.nota_c3]
                  .filter(v => v !== '' && !isNaN(Number(v)))
                  .map(Number);

                if (validVals.length > 0) {
                  const finalP = Math.round(validVals.reduce((a, b) => a + b, 0) / validVals.length);
                  item.nota_final = String(finalP);
                  item.estado = finalP >= 13 ? 'aprobado' : 'desaprobado';
                } else if (prom !== '' && !isNaN(Number(prom))) {
                  const pVal = Math.min(20, Math.max(0, parseInt(prom, 10)));
                  item.nota_final = String(pVal);
                  item.estado = pVal >= 13 ? 'aprobado' : 'desaprobado';
                }
                updated[matchIdx] = item;
              }
            }
          }
          return updated;
        });
        toast.success(`Se importaron calificaciones para ${loadedCount} estudiantes.`);
      } catch (err) {
        console.error("Error parsing CSV", err);
        toast.error("Error al procesar el archivo: formato CSV inválido.");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = '';
  };

  // Acciones Masivas (Llenado Rápido)
  const handleBulkFill = async (fillValue) => {
    setShowBulkMenu(false);
    if (students.length === 0) return;
    const confirmMsg = fillValue === '' 
      ? "¿Deseas limpiar todas las calificaciones de la lista?" 
      : `¿Deseas asignar la nota ${fillValue} a todos los estudiantes con campos vacíos?`;
    const ok = await toast.confirm({
      title: fillValue === '' ? "Limpiar Calificaciones" : "Asignación Masiva",
      message: confirmMsg,
      type: fillValue === '' ? 'danger' : 'info',
      confirmText: fillValue === '' ? 'Sí, limpiar' : 'Sí, asignar'
    });
    if (!ok) return;

    setStudents(prev => prev.map(s => {
      if (fillValue === '') {
        return { ...s, nota_c1: '', nota_c2: '', nota_c3: '', nota_final: '', estado: 'cursando' };
      }
      const c1 = s.nota_c1 === '' ? String(fillValue) : s.nota_c1;
      const c2 = s.nota_c2 === '' ? String(fillValue) : s.nota_c2;
      const c3 = s.nota_c3 === '' ? String(fillValue) : s.nota_c3;
      const p = Math.round((Number(c1) + Number(c2) + Number(c3)) / 3);
      return {
        ...s,
        nota_c1: c1,
        nota_c2: c2,
        nota_c3: c3,
        nota_final: String(p),
        estado: p >= 13 ? 'aprobado' : 'desaprobado'
      };
    }));
  };

  const getTipoCompetencia = (unidadNombre, moduloNombre) => {
    const isEmpleabilidad = 
      /comunicaci|ingl[eé]s|ofim[aá]tica|emprendimiento|liderazgo|[eé]tica/i.test(unidadNombre) ||
      /empleabilidad|transversal/i.test(moduloNombre);
    return isEmpleabilidad ? 'Transversal / Empleabilidad' : 'Específica / Técnica';
  };

  const selectedUnitData = malla.flatMap(m => m.unidades.map(u => ({ ...u, moduloNombre: m.nombre }))).find(u => u.id === parseInt(selectedUnit));
  const tipoCompetencia = selectedUnitData ? getTipoCompetencia(selectedUnitData.nombre, selectedUnitData.moduloNombre) : '';

  const numberToWords = (num) => {
    const words = [
      'CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
      'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
    ];
    const n = parseInt(num);
    if (isNaN(n) || n < 0 || n > 20) return '-';
    return words[n];
  };

  const gradedStudents = students.filter(s => s.nota_final !== '' && !isNaN(Number(s.nota_final)));
  const aprobadosCount = gradedStudents.filter(s => Number(s.nota_final) >= 13).length;
  const desaprobadosCount = gradedStudents.filter(s => Number(s.nota_final) < 13).length;
  const porcentajeAprobacion = gradedStudents.length > 0 
    ? ((aprobadosCount / gradedStudents.length) * 100).toFixed(1) 
    : '0';

  const currentProgramName = programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Programa de Estudios';
  const currentPeriodName = periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Periodo';
  const currentUnitName = selectedUnitData?.nombre || 'Unidad Didáctica';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Estilo Linear */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-primary" />
            <span>Módulo de Evaluación y Calificaciones</span>
            {isAdmin && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Vista Administrador
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Registro de Calificaciones
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Ingreso y consolidación de promedios finales por unidad didáctica (Escala Vigesimal 0-20).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setShowActaModal(true)}
            disabled={!selectedUnit || students.length === 0}
            className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-medium text-xs border transition-all ${
              !selectedUnit || students.length === 0 
                ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed' 
                : 'border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 shadow-sm cursor-pointer'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>{actaStatus?.acta_cerrada ? 'Acta oficial' : 'Vista previa del acta'}</span>
          </button>

          <button 
            onClick={handleSaveGrades}
            disabled={saving || !selectedUnit || students.length === 0 || isReadOnly}
            title={isReadOnly ? (actaStatus?.motivo_bloqueo || 'Calificaciones en solo lectura') : 'Guardar Promedios'}
            className={`inline-flex items-center gap-1.5 py-2 px-4 rounded-xl font-medium text-xs shadow-sm transition-all ${
              saving || !selectedUnit || students.length === 0 || isReadOnly
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
            }`}
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Promedios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1">
        <button
          onClick={() => setActiveTab('notas')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'notas' 
              ? 'bg-white text-slate-900 shadow-sm font-semibold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Ingreso de Calificaciones
        </button>
        <button
          onClick={() => setActiveTab('planificacion')}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'planificacion' 
              ? 'bg-white text-slate-900 shadow-sm font-semibold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Sílabos y Plan de Trabajo
        </button>
      </div>

      {activeTab === 'planificacion' ? (
        <DocentePlanning />
      ) : (
        <>
          {/* Tarjeta de Contexto y Selección de Curso */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Programa Seleccionado</span>
                  {isAdmin && programs.length > 0 ? (
                    <select
                      className="bg-transparent font-bold text-slate-900 border-none p-0 focus:ring-0 cursor-pointer text-xs"
                      value={selectedProgram}
                      onChange={(e) => setSelectedProgram(e.target.value)}
                    >
                      {programs.map(p => (
                        <option key={p.id} value={p.id.toString()}>{p.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-slate-900">
                      {programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Seleccione un programa'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Periodo Lectivo</span>
                  {isAdmin && periods.length > 0 ? (
                    <select
                      className="bg-transparent font-bold text-slate-900 border-none p-0 focus:ring-0 cursor-pointer text-xs font-mono"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                      {periods.map(p => (
                        <option key={p.id} value={p.id.toString()}>{p.codigo}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Cargando...'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen size={14} className="text-slate-400" />
                <span>Seleccionar Unidad Didáctica a Evaluar</span>
              </label>

              <div className="relative">
                <select 
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  disabled={!selectedProgram || !selectedPeriod || malla.length === 0}
                >
                  <option value="" className="text-slate-400">-- Seleccione el curso a evaluar --</option>
                  {malla.map(modulo => {
                    const hasLoad = teacherLoad.some(t => t.periodo_id === parseInt(selectedPeriod));
                    const assignedUnits = (isAdmin || !hasLoad)
                      ? modulo.unidades
                      : modulo.unidades.filter(u => 
                          teacherLoad.some(t => t.unidad_didactica_id === u.id && t.periodo_id === parseInt(selectedPeriod))
                        );

                    if (assignedUnits.length === 0) return null;

                    return (
                      <optgroup key={`mod-${modulo.id}`} label={`Ciclo ${modulo.periodo} - ${modulo.nombre}`} className="bg-slate-50 font-bold text-slate-500 text-xs">
                        {assignedUnits.map(u => (
                          <option key={u.id} value={u.id} className="font-medium text-slate-800 text-xs">
                            {u.nombre}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>

              {teacherLoad.length === 0 && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-800">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                  <span>No tienes unidades didácticas asignadas en tu carga lectiva para este periodo.</span>
                </div>
              )}
            </div>
          </div>

          {/* Banners Informativos del Estado del Acta */}
          {selectedUnit && selectedPeriod && actaStatus && (
            <div className="space-y-3">
              {/* 1. Unidad sin docente asignado en carga_lectiva */}
              {!actaStatus.tiene_carga && (
                <div data-testid="banner-sin-carga" className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-center gap-3 text-amber-900 text-xs shadow-sm animate-fade-in">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Unidad sin docente asignado</p>
                    <p>Esta unidad no tiene docente asignado. Solicite la asignación a Coordinación de Programa.</p>
                  </div>
                </div>
              )}

              {/* 2. Acta Bloqueada (cerrada, plazo vencido o periodo no calificable) */}
              {actaStatus.tiene_carga && !actaStatus.editable && (
                <div data-testid="banner-bloqueado" className="p-4 bg-rose-50/90 border border-rose-300 rounded-2xl flex items-center gap-3 text-rose-900 text-xs shadow-sm animate-fade-in">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Ingreso de calificaciones bloqueado</p>
                    <p>{actaStatus.motivo_bloqueo || 'El registro de notas no está disponible en este momento.'}</p>
                  </div>
                </div>
              )}

              {/* 3. Editable con Fecha Límite */}
              {actaStatus.tiene_carga && actaStatus.editable && actaStatus.fecha_limite_notas && (
                (() => {
                  const dias = getDaysRemainingLima(actaStatus.fecha_limite_notas);
                  const esUrgente = dias !== null && dias <= 3;
                  return (
                    <div 
                      data-testid="banner-fecha-limite" 
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm animate-fade-in ${
                        esUrgente 
                          ? 'bg-amber-50/95 border-amber-300 text-amber-950 font-medium' 
                          : 'bg-blue-50/80 border-blue-200 text-blue-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className={`w-4 h-4 ${esUrgente ? 'text-amber-600' : 'text-blue-600'} flex-shrink-0`} />
                        <div>
                          <span>Plazo para ingresar notas hasta <strong>{formatDateDDMMAAAA(actaStatus.fecha_limite_notas)}</strong></span>
                          {esUrgente && (
                            <span className="ml-2 font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[11px]">
                              {dias < 0 ? '¡Plazo vencido!' : dias === 0 ? '¡Vence hoy!' : dias === 1 ? '¡Queda 1 día!' : `¡Quedan ${dias} días!`}
                            </span>
                          )}
                        </div>
                      </div>
                      {actaStatus.matriculas_pendientes > 0 && (
                        <span className="text-[11px] text-amber-800 bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-lg">
                          ⚠️ {actaStatus.matriculas_pendientes} matrícula(s) pendiente(s) de confirmación
                        </span>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Tabla de Registro de Promedios */}
          {selectedUnit && selectedPeriod && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
              {/* Notificación de Éxito al Guardar */}
              {saveSuccess && (
                <div data-testid="save-success-alert" className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="font-semibold">{saveSuccess}</span>
                  </div>
                  <button onClick={() => setSaveSuccess(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Notificación de Error al Guardar */}
              {saveError && (
                <div data-testid="save-error-alert" className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
                    <span className="font-medium">{saveError}</span>
                  </div>
                  <button onClick={() => setSaveError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Alerta de Error de Validación de Formato */}
              {gradeError && (
                <div data-testid="grade-error-alert" className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 animate-fade-in">
                  <AlertTriangle size={15} className="text-rose-600 flex-shrink-0" />
                  <span className="font-medium">{gradeError}</span>
                </div>
              )}

              {/* Barra superior de estado */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-sm text-slate-900">
                    Nómina de Calificaciones
                  </h4>
                  {tipoCompetencia && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <Target size={12} className="text-slate-500" />
                      <span>{tipoCompetencia}</span>
                    </span>
                  )}
                  {isReadOnly && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Solo Lectura
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Nota mínima aprobatoria: 13 a 20</span>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-slate-400 text-xs">Cargando nómina...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-slate-400 text-xs">No hay estudiantes matriculados en esta unidad didáctica.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] w-12 text-center">N°</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Apellidos y Nombres</th>
                        <th className="py-3 px-4 font-semibold text-slate-700 uppercase tracking-wider text-[11px] text-center w-36">Promedio Final</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] text-center w-32">Condición</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student, idx) => {
                        const numGrade = parseInt(student.nota_final, 10);
                        const hasGrade = student.nota_final !== '' && !isNaN(numGrade);
                        const isPassed = hasGrade && numGrade >= 13;

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-medium text-slate-800 text-xs">{student.name}</td>
                            <td className="py-2 px-4 text-center">
                              <input 
                                type="text" 
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                className={`w-16 mx-auto text-center py-1.5 px-2 border rounded-xl outline-none font-bold text-sm transition-all ${
                                  isReadOnly
                                    ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                                    : student.nota_final === '' 
                                      ? 'border-slate-200 bg-white text-slate-800 focus:border-slate-900 focus:ring-1 focus:ring-slate-900' 
                                      : isPassed 
                                        ? 'border-emerald-300 text-emerald-800 bg-emerald-50/50 focus:border-emerald-500 focus:bg-white' 
                                        : 'border-rose-300 text-rose-700 bg-rose-50/50 focus:border-rose-500 focus:bg-white'
                                }`}
                                value={student.nota_final}
                                onChange={(e) => handleGradeChange(student.id, 'nota_final', e.target.value)}
                                maxLength={2}
                                placeholder="--"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              {!hasGrade ? (
                                <span className="text-[11px] text-slate-400 font-medium">Pendiente</span>
                              ) : isPassed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aprobado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Desaprobado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL ACTA OFICIAL IMPRIMIBLE */}
      {showActaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-4xl w-full my-8 overflow-hidden print:shadow-none print:max-w-none print:w-full print:m-0">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-sm text-slate-900">
                  {actaStatus?.acta_cerrada ? 'Acta Oficial de Evaluación' : 'Vista Previa del Acta de Evaluación'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer size={14} />
                  <span>Imprimir / Descargar PDF</span>
                </button>
                <button
                  onClick={() => setShowActaModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Documento Oficial del Acta */}
            <div className="p-8 md:p-10 text-slate-900 print:p-4 text-xs font-sans">
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  República del Perú • Ministerio de Educación
                </div>
                <h2 className="text-lg font-black uppercase tracking-tight mt-0.5 text-slate-900">
                  INSTITUTO DE EDUCACIÓN SUPERIOR TECNOLÓGICO PÚBLICO "SUIZA"
                </h2>
                <div className="inline-block px-3 py-1 bg-slate-100 font-extrabold text-[11px] uppercase mt-2 rounded border border-slate-300">
                  ACTA CONSOLIDADA DE EVALUACIÓN FINAL DE UNIDAD DIDÁCTICA
                </div>

                {/* Marca de Agua / Estado Oficial */}
                <div>
                  {!actaStatus?.acta_cerrada ? (
                    <div data-testid="acta-watermark" className="mt-2 inline-block px-4 py-1.5 bg-amber-100 text-amber-900 border-2 border-dashed border-amber-400 font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
                      VISTA PREVIA - ACTA NO CERRADA
                    </div>
                  ) : (
                    <div className="mt-2 inline-block px-4 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs uppercase rounded-lg">
                      ACTA OFICIAL CONSOLIDADA (CERRADA)
                    </div>
                  )}
                  {actaStatus?.acta_cerrada && actaStatus?.acta_cerrada_at && (
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Cierre registrado el: {formatDateTimeLima(actaStatus.acta_cerrada_at)} (Hora Institucional Perú)
                    </p>
                  )}
                </div>
              </div>

              {/* Datos de Cabecera */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Programa de Estudios:</span>
                  <span className="font-extrabold text-slate-800">{currentProgramName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Periodo Académico:</span>
                  <span className="font-bold text-slate-800">{currentPeriodName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Unidad Didáctica:</span>
                  <span className="font-bold text-slate-800">{currentUnitName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Docente Responsable:</span>
                  <span className="font-bold text-slate-800">{user?.full_name || 'Docente Titular'}</span>
                </div>
              </div>

              {/* Tabla de Estudiantes */}
              <table className="w-full text-left border border-slate-400 border-collapse mb-6 text-xs">
                <thead className="bg-slate-100 uppercase font-extrabold text-slate-800 border-b border-slate-400 text-center">
                  <tr>
                    <th className="py-2 px-2 border-r border-slate-400 w-10">N°</th>
                    <th className="py-2 px-3 border-r border-slate-400 text-left">Apellidos y Nombres</th>
                    <th className="py-2 px-2 border-r border-slate-400 w-20">Nota (N°)</th>
                    <th className="py-2 px-3 border-r border-slate-400 w-36">Nota en Letras</th>
                    <th className="py-2 px-3 w-28">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {students.map((st, idx) => {
                    const gradeNum = parseInt(st.nota_final);
                    const hasGrade = st.nota_final !== '' && !isNaN(gradeNum);
                    const isPassed = hasGrade && gradeNum >= 13;
                    return (
                      <tr key={st.id} className="text-center hover:bg-slate-50">
                        <td className="py-2 px-2 border-r border-slate-300 font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-300 text-left font-semibold text-slate-800">{st.name}</td>
                        <td className="py-2 px-2 border-r border-slate-300 font-black text-sm">
                          {hasGrade ? String(gradeNum).padStart(2, '0') : '-'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300 uppercase text-[10px] font-semibold text-slate-600">
                          {hasGrade ? numberToWords(gradeNum) : 'NO EVALUADO'}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-[10px]">
                          {!hasGrade ? (
                            <span className="text-slate-400">SIN NOTA</span>
                          ) : isPassed ? (
                            <span className="text-blue-800">APROBADO</span>
                          ) : (
                            <span className="text-red-700">DESAPROBADO</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Estadísticas */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl mb-12 text-center text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">Matriculados</span>
                  <span className="font-black text-sm text-slate-800">{students.length}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">Aprobados</span>
                  <span className="font-black text-sm text-emerald-700">{aprobadosCount}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">Desaprobados</span>
                  <span className="font-black text-sm text-red-600">{desaprobadosCount}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[9px] block">% Aprobación</span>
                  <span className="font-black text-sm text-blue-700">{porcentajeAprobacion}%</span>
                </div>
              </div>

              {/* Firmas */}
              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                <div>
                  <div className="w-40 mx-auto border-t border-slate-800 mb-1"></div>
                  <span className="font-bold text-slate-800 block">Firma del Docente</span>
                  <span className="text-[10px] text-slate-500">{user?.full_name || 'Docente Responsable'}</span>
                </div>
                <div>
                  <div className="w-40 mx-auto border-t border-slate-800 mb-1"></div>
                  <span className="font-bold text-slate-800 block">Coordinación de Carrera</span>
                  <span className="text-[10px] text-slate-500">Visto Bueno</span>
                </div>
                <div>
                  <div className="w-40 mx-auto border-t border-slate-800 mb-1"></div>
                  <span className="font-bold text-slate-800 block">Secretaría Académica</span>
                  <span className="text-[10px] text-slate-500">Recepción Oficial</span>
                </div>
              </div>

              <div className="text-[9px] text-slate-400 text-center mt-8 pt-4 border-t border-slate-200">
                {actaStatus?.acta_cerrada 
                  ? `Acta oficial institucional cerrada el ${formatDateTimeLima(actaStatus.acta_cerrada_at) || ''} • Válida como registro institucional oficial` 
                  : `Borrador / Vista previa de acta no cerrada generada el ${formatDateDDMMAAAA(new Date().toISOString())} • Documento sin validez oficial`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
