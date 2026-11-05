import { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '../../core/api/client';
import { DocentePlanning } from '../academic/DocentePlanning';
import { useAuth } from '../../core/auth/useAuth';
import {
  Save, GraduationCap, Calendar, BookOpen, ClipboardList, AlertTriangle,
  Target, FileText, Printer, X, CheckCircle2, RefreshCw, KeyRound,
  Download, Upload, Users, Search, Check, ChevronDown, Clock,
  XCircle, Sparkles, Filter, SlidersHorizontal
} from 'lucide-react';

export function EvaluationDashboard() {
  const { user, openPasswordModal } = useAuth();
  const [activeTab, setActiveTab] = useState('notas'); // 'notas', 'planificacion'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showActaModal, setShowActaModal] = useState(false);
  const [gradingMode, setGradingMode] = useState('capacidades'); // 'capacidades' | 'directo'
  const [searchStudent, setSearchStudent] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'aprobados' | 'recuperacion' | 'desaprobados' | 'pendientes'
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [malla, setMalla] = useState([]);
  const [teacherLoad, setTeacherLoad] = useState([]);
  
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  
  const [students, setStudents] = useState([]);
  const fileInputRef = useRef(null);

  // Cargar Programas, Periodos y Carga del Docente al iniciar
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [progRes, perRes, loadRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas').catch(() => []),
          apiClient.request('/api/mod-programas-estudio/periodos').catch(() => []),
          user?.id ? apiClient.request(`/api/mod-programas-estudio/docentes/${user.id}/carga-lectiva`).catch(() => []) : Promise.resolve([])
        ]);
        setPrograms(progRes || []);
        setPeriods(perRes || []);
        setTeacherLoad(loadRes || []);

        let initProg = '';
        let initPer = '';
        if (loadRes && loadRes.length > 0) {
          initProg = loadRes[0].programa_id.toString();
          initPer = loadRes[0].periodo_id.toString();
        }
        if (!initProg && progRes && progRes.length > 0) {
          initProg = progRes[0].id.toString();
        }
        if (!initPer && perRes && perRes.length > 0) {
          const activePer = perRes.find(p => p.estado === 'matricula_abierta' || p.estado === 'abierto' || p.estado === 'ACTIVO');
          initPer = activePer ? activePer.id.toString() : perRes[perRes.length - 1].id.toString();
        }
        if (initProg) setSelectedProgram(initProg);
        if (initPer) setSelectedPeriod(initPer);
      } catch (e) {
        console.error('Error fetching initial data', e);
      }
    };
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const reloadTeacherLoad = async () => {
    if (!user?.id) return;
    try {
      const loadRes = await apiClient.request(`/api/mod-programas-estudio/docentes/${user.id}/carga-lectiva`).catch(() => []);
      setTeacherLoad(loadRes || []);
    } catch (e) {
      console.error('Error reloading teacher load', e);
    }
  };

  // Cursos asignados filtrados por periodo y programa actual
  const currentAssignedCargas = useMemo(() => {
    return teacherLoad.filter(t => 
      (!selectedPeriod || String(t.periodo_id) === String(selectedPeriod)) &&
      (!selectedProgram || String(t.programa_id) === String(selectedProgram))
    );
  }, [teacherLoad, selectedPeriod, selectedProgram]);

  // Auto-seleccionar primer curso asignado si no hay ninguno seleccionado
  useEffect(() => {
    if (!selectedUnit && currentAssignedCargas.length > 0) {
      setSelectedUnit(String(currentAssignedCargas[0].unidad_didactica_id));
    }
  }, [currentAssignedCargas, selectedUnit]);

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

  // Función para cargar Estudiantes matriculados y sus notas
  const fetchStudentsAndGrades = async () => {
    if (!selectedUnit || !selectedPeriod) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const [enrolled, grades] = await Promise.all([
        apiClient.request(`/api/mod-gestion-academica/matriculas/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => []),
        apiClient.request(`/api/mod-evaluacion/registros/unidad/${selectedUnit}/periodo/${selectedPeriod}`).catch(() => [])
      ]);
      
      const combined = (enrolled || []).map(est => {
        const gradeRecord = (grades || []).find(g => g.matricula_detalle_id === est.matricula_detalle_id);
        const c1 = gradeRecord?.nota_c1 != null ? String(gradeRecord.nota_c1) : '';
        const c2 = gradeRecord?.nota_c2 != null ? String(gradeRecord.nota_c2) : '';
        const c3 = gradeRecord?.nota_c3 != null ? String(gradeRecord.nota_c3) : '';
        const finalNote = gradeRecord?.nota_final != null ? String(gradeRecord.nota_final) : '';

        return {
          id: est.id,
          matricula_detalle_id: est.matricula_detalle_id,
          name: `${est.apellidos}, ${est.nombres}`,
          dni: est.dni || '',
          registro_id: gradeRecord ? gradeRecord.id : null,
          nota_c1: c1,
          nota_c2: c2,
          nota_c3: c3,
          nota_final: finalNote,
          estado: gradeRecord?.estado || (finalNote !== '' ? (parseInt(finalNote, 10) >= 13 ? 'aprobado' : 'desaprobado') : 'cursando')
        };
      });
      
      combined.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(combined);
    } catch (e) {
      console.error('Error fetching students and grades', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndGrades();
  }, [selectedUnit, selectedPeriod]);

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
        alert("ℹ️ " + res.message);
      } else {
        alert("✅ " + (res?.message || "Nómina de estudiantes sincronizada con éxito."));
      }
    } catch (e) {
      console.error("Error sincronizando nómina", e);
      alert("❌ Ocurrió un error al sincronizar la nómina: " + (e.message || "Error del servidor"));
    } finally {
      setSyncing(false);
    }
  };

  // Manejo de cambio de notas con cálculo automático de promedio
  const handleGradeChange = (studentId, field, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    const numValue = parseInt(value, 10);
    if (value !== '' && (numValue < 0 || numValue > 20)) return;

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const updated = { ...s, [field]: value };
        
        // Si estamos en modo capacidades o editando c1/c2/c3
        if (field === 'nota_c1' || field === 'nota_c2' || field === 'nota_c3') {
          const c1 = updated.nota_c1 !== '' ? parseInt(updated.nota_c1, 10) : null;
          const c2 = updated.nota_c2 !== '' ? parseInt(updated.nota_c2, 10) : null;
          const c3 = updated.nota_c3 !== '' ? parseInt(updated.nota_c3, 10) : null;
          
          const validGrades = [c1, c2, c3].filter(n => n !== null);
          if (validGrades.length > 0) {
            const prom = Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length);
            updated.nota_final = String(prom);
            updated.estado = prom >= 13 ? 'aprobado' : 'desaprobado';
          } else {
            updated.nota_final = '';
            updated.estado = 'cursando';
          }
        } else if (field === 'nota_final') {
          if (value !== '') {
            updated.estado = numValue >= 13 ? 'aprobado' : 'desaprobado';
          } else {
            updated.estado = 'cursando';
          }
        }
        
        return updated;
      }
      return s;
    }));
  };

  // Navegación por teclado tipo Excel (Enter / Flechas)
  const handleKeyDown = (e, studentIndex, field) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`grade-input-${studentIndex + 1}-${field}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`grade-input-${studentIndex - 1}-${field}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Guardado masivo eficiente
  const handleSaveGrades = async () => {
    if (!selectedUnit || !selectedPeriod || students.length === 0) return;
    
    setSaving(true);
    try {
      const items = students.map(student => ({
        id: student.registro_id,
        matricula_detalle_id: student.matricula_detalle_id,
        estudiante_id: student.id,
        unidad_didactica_id: parseInt(selectedUnit, 10),
        periodo_id: parseInt(selectedPeriod, 10),
        nota_c1: student.nota_c1 !== '' ? parseInt(student.nota_c1, 10) : null,
        nota_c2: student.nota_c2 !== '' ? parseInt(student.nota_c2, 10) : null,
        nota_c3: student.nota_c3 !== '' ? parseInt(student.nota_c3, 10) : null,
        nota_final: student.nota_final !== '' ? parseInt(student.nota_final, 10) : null
      }));
      
      const res = await apiClient.request('/api/mod-evaluacion/registros/batch', {
        method: 'POST',
        body: JSON.stringify(items)
      });
      
      if (Array.isArray(res)) {
        setStudents(prev => prev.map(s => {
          const match = res.find(r => r.matricula_detalle_id === s.matricula_detalle_id);
          if (match) {
            return {
              ...s,
              registro_id: match.id,
              nota_final: match.nota_final !== null ? String(match.nota_final) : s.nota_final,
              estado: match.estado || s.estado
            };
          }
          return s;
        }));
      }
      alert("✅ ¡Calificaciones guardadas exitosamente en el sistema SIGA!");
    } catch (e) {
      console.error('Error saving grades', e);
      alert("❌ Ocurrió un error al guardar las calificaciones: " + (e.message || "Error de conexión"));
    } finally {
      setSaving(false);
    }
  };

  // Exportar Plantilla Excel / CSV
  const handleExportCSV = () => {
    if (!students || students.length === 0) return;
    const unitName = currentUnitName.replace(/,/g, ' ');
    const headers = "N°,DNI,Apellidos y Nombres,Capacidad 1 (C1),Capacidad 2 (C2),Capacidad 3 (C3),Promedio Final,Condición\n";
    const rows = students.map((s, idx) => {
      const cond = s.nota_final === '' ? 'Pendiente' : (parseInt(s.nota_final, 10) >= 13 ? 'Aprobado' : 'Desaprobado');
      return `${idx + 1},"${s.dni}","${s.name}",${s.nota_c1},${s.nota_c2},${s.nota_c3},${s.nota_final},${cond}`;
    }).join('\n');
    
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
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          alert("El archivo no contiene suficientes filas.");
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
        alert(`✅ Se importaron calificaciones para ${loadedCount} estudiantes.`);
      } catch (err) {
        console.error("Error parsing CSV", err);
        alert("Error al procesar el archivo: formato CSV inválido.");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = '';
  };

  // Acciones Masivas (Llenado Rápido)
  const handleBulkFill = (fillValue) => {
    setShowBulkMenu(false);
    if (students.length === 0) return;
    const confirmMsg = fillValue === '' 
      ? "¿Deseas limpiar todas las calificaciones de la lista?" 
      : `¿Deseas asignar la nota ${fillValue} a todos los estudiantes con campos vacíos?`;
    if (!window.confirm(confirmMsg)) return;

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

  const selectedUnitData = malla.flatMap(m => m.unidades.map(u => ({ ...u, moduloNombre: m.nombre }))).find(u => u.id === parseInt(selectedUnit, 10));
  const tipoCompetencia = selectedUnitData ? getTipoCompetencia(selectedUnitData.nombre, selectedUnitData.moduloNombre) : '';

  const numberToWords = (num) => {
    const words = [
      'CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
      'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
    ];
    const n = parseInt(num, 10);
    if (isNaN(n) || n < 0 || n > 20) return '-';
    return words[n];
  };

  // Filtrado de estudiantes en la vista
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchSearch = !searchStudent || 
        student.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        (student.dni && student.dni.includes(searchStudent));
        
      if (!matchSearch) return false;

      const numGrade = parseInt(student.nota_final, 10);
      const hasGrade = student.nota_final !== '' && !isNaN(numGrade);

      if (filterStatus === 'aprobados') return hasGrade && numGrade >= 13;
      if (filterStatus === 'recuperacion') return hasGrade && numGrade >= 10 && numGrade <= 12;
      if (filterStatus === 'desaprobados') return hasGrade && numGrade < 10;
      if (filterStatus === 'pendientes') return !hasGrade;
      return true;
    });
  }, [students, searchStudent, filterStatus]);

  // Estadísticas del Aula
  const gradedStudents = students.filter(s => s.nota_final !== '' && !isNaN(Number(s.nota_final)));
  const aprobadosCount = gradedStudents.filter(s => Number(s.nota_final) >= 13).length;
  const recuperacionCount = gradedStudents.filter(s => Number(s.nota_final) >= 10 && Number(s.nota_final) <= 12).length;
  const desaprobadosCount = gradedStudents.filter(s => Number(s.nota_final) < 13).length;
  const porcentajeAprobacion = gradedStudents.length > 0 
    ? ((aprobadosCount / gradedStudents.length) * 100).toFixed(1) 
    : '0';
  const aulaAverage = gradedStudents.length > 0
    ? (gradedStudents.reduce((acc, s) => acc + Number(s.nota_final), 0) / gradedStudents.length).toFixed(1)
    : '—';

  const currentProgramName = programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Programa de Estudios';
  const currentPeriodName = periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Periodo';
  const currentUnitName = selectedUnitData?.nombre || currentAssignedCargas.find(c => String(c.unidad_didactica_id) === String(selectedUnit))?.unidad_nombre || 'Unidad Didáctica';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Institucional de Calificaciones */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-primary" />
            <span>Módulo de Evaluación y Calificaciones</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Registro de Calificaciones
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Evaluación continua por capacidades y consolidación de actas oficiales (Escala Vigesimal 0–20).
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={openPasswordModal}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-medium text-xs border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 hover:text-primary shadow-xs cursor-pointer transition-colors"
            title="Configuración de seguridad y cambio de contraseña docente"
          >
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span>Seguridad / Clave</span>
          </button>

          <button 
            type="button"
            onClick={() => setShowActaModal(true)}
            disabled={!selectedUnit || students.length === 0}
            className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-medium text-xs border transition-all ${
              !selectedUnit || students.length === 0 
                ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed' 
                : 'border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 shadow-xs cursor-pointer'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Acta Oficial (PDF)</span>
          </button>

          <button 
            type="button"
            onClick={handleSaveGrades}
            disabled={saving || !selectedUnit || students.length === 0}
            className={`inline-flex items-center gap-1.5 py-2 px-4 rounded-xl font-medium text-xs shadow-md transition-all ${
              saving || !selectedUnit || students.length === 0 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-primary hover:bg-primary-dark text-white cursor-pointer active:scale-95'
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
                <span>Guardar Calificaciones</span>
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
          Registro y Calificación
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-5 border-b border-slate-100 items-end">
              <div className="md:col-span-5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <GraduationCap size={14} className="text-primary" />
                  <span>Programa de Estudios</span>
                </label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                  value={selectedProgram}
                  onChange={(e) => {
                    setSelectedProgram(e.target.value);
                    setSelectedUnit('');
                  }}
                >
                  <option value="">-- Seleccione un programa --</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Calendar size={14} className="text-primary" />
                  <span>Periodo Lectivo</span>
                </label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono transition-all cursor-pointer"
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    setSelectedUnit('');
                  }}
                >
                  <option value="">-- Seleccione un periodo --</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} {p.estado ? `— ${p.estado.replace(/_/g, ' ')}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={reloadTeacherLoad}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Actualizar cursos asignados"
                >
                  <RefreshCw size={14} className="text-primary" />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* Tarjetas de Cursos Asignados al Docente */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} className="text-primary" />
                  <span>Mis Cursos Asignados ({currentAssignedCargas.length})</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {currentAssignedCargas.length > 0 ? 'Haz clic en una unidad didáctica para cargar las notas' : ''}
                </span>
              </div>

              {currentAssignedCargas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentAssignedCargas.map((carga) => {
                    const isSelected = String(selectedUnit) === String(carga.unidad_didactica_id);
                    const udName = carga.unidad_nombre || malla.flatMap(m => m.unidades || []).find(u => u.id === carga.unidad_didactica_id)?.nombre || `Unidad #${carga.unidad_didactica_id}`;
                    const cicloNum = carga.ciclo || malla.find(m => (m.unidades || []).some(u => u.id === carga.unidad_didactica_id))?.periodo;

                    return (
                      <button
                        key={carga.id}
                        type="button"
                        onClick={() => setSelectedUnit(String(carga.unidad_didactica_id))}
                        className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50/80 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600">
                            {cicloNum ? `Ciclo ${cicloNum}` : 'Ciclo —'}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              Sec. {carga.seccion || 'A'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700">
                              {carga.turno || 'Mañana'}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-1">
                          {udName}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                          <span>
                            {carga.creditos ? `${carga.creditos} Cr.` : ''} {carga.horas ? `· ${carga.horas}h` : ''}
                          </span>
                          <span className={`font-semibold text-[11px] ${isSelected ? 'text-primary' : 'text-slate-400'}`}>
                            {isSelected ? '✓ Seleccionado' : 'Evaluar →'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">No tienes cursos asignados para este periodo y programa.</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      El Coordinador del Programa Académico asigna los cursos en la sección "Coordinación de Programa".
                      Si tienes cursos asignados en otro periodo o programa, puedes cambiar los selectores superiores.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Selector desplegable de respaldo */}
            {currentAssignedCargas.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  O selecciona directamente de la lista:
                </label>
                <div className="relative">
                  <select 
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                  >
                    <option value="" className="text-slate-400">-- Seleccione el curso a evaluar --</option>
                    {currentAssignedCargas.map((carga) => {
                      const udName = carga.unidad_nombre || malla.flatMap(m => m.unidades || []).find(u => u.id === carga.unidad_didactica_id)?.nombre || `Unidad #${carga.unidad_didactica_id}`;
                      const cicloNum = carga.ciclo || malla.find(m => (m.unidades || []).some(u => u.id === carga.unidad_didactica_id))?.periodo;
                      return (
                        <option key={carga.id} value={carga.unidad_didactica_id} className="font-medium text-slate-800 text-xs">
                          {cicloNum ? `[Ciclo ${cicloNum}] ` : ''}{udName} (Sec. {carga.seccion || 'A'} · {carga.turno || 'Mañana'})
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <ChevronDown size={15} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel Principal de Calificación */}
          {selectedUnit && selectedPeriod && (
            <div className="space-y-4">
              
              {/* Tarjeta de Estadísticas del Aula en Vivo */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Matriculados</span>
                  <span className="text-lg font-extrabold text-slate-800">{students.length}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Evaluados</span>
                  <span className="text-lg font-extrabold text-indigo-700">{gradedStudents.length}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider block">Aprobados</span>
                  <span className="text-lg font-extrabold text-emerald-700">{aprobadosCount}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-amber-600 tracking-wider block">Recuperación</span>
                  <span className="text-lg font-extrabold text-amber-600">{recuperacionCount}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-red-600 tracking-wider block">Desaprobados</span>
                  <span className="text-lg font-extrabold text-red-600">{desaprobadosCount}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-primary tracking-wider block">Promedio Aula</span>
                  <span className="text-lg font-extrabold text-primary-dark">{aulaAverage}</span>
                </div>
              </div>

              {/* Contenedor de la Tabla y Herramientas */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                
                {/* Barra de Herramientas Docentes */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Selector de Modo de Calificación */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <SlidersHorizontal size={13} />
                      <span>Modo:</span>
                    </span>
                    <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setGradingMode('capacidades')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          gradingMode === 'capacidades'
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Capacidades (C1, C2, C3)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradingMode('directo')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          gradingMode === 'directo'
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Promedio Directo
                      </button>
                    </div>

                    {tipoCompetencia && (
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Target size={11} className="text-slate-500" />
                        <span>{tipoCompetencia}</span>
                      </span>
                    )}
                  </div>

                  {/* Acciones de Nómina, Excel y Acciones Rápidas */}
                  <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
                    {/* Botón Sincronizar Alumnos */}
                    <button
                      type="button"
                      onClick={handleSyncStudents}
                      disabled={syncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-primary text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      title="Sincronizar estudiantes del programa/ciclo con esta unidad"
                    >
                      <RefreshCw size={13} className={`text-primary ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Sincronizando...' : 'Sincronizar Nómina'}</span>
                    </button>

                    {/* Botón Exportar CSV */}
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={students.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      title="Descargar plantilla de calificaciones en Excel (CSV)"
                    >
                      <Download size={13} className="text-emerald-600" />
                      <span>Plantilla Excel</span>
                    </button>

                    {/* Botón Importar CSV */}
                    <label 
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer ${students.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
                      title="Subir archivo CSV con calificaciones"
                    >
                      <Upload size={13} className="text-blue-600" />
                      <span>Importar Notas</span>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept=".csv" 
                        onChange={handleImportCSV} 
                        className="hidden" 
                      />
                    </label>

                    {/* Menú de Acciones Rápidas */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowBulkMenu(!showBulkMenu)}
                        disabled={students.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        <Sparkles size={13} className="text-amber-500" />
                        <span>Relleno Rápido</span>
                        <ChevronDown size={12} />
                      </button>

                      {showBulkMenu && (
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1.5 animate-slide-up text-xs">
                          <button
                            type="button"
                            onClick={() => handleBulkFill(14)}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center justify-between"
                          >
                            <span>Asignar 14 a pendientes</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">14</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkFill(16)}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center justify-between"
                          >
                            <span>Asignar 16 a pendientes</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">16</span>
                          </button>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button
                            type="button"
                            onClick={() => handleBulkFill('')}
                            className="w-full text-left px-3.5 py-2 hover:bg-rose-50 font-medium text-rose-600 flex items-center justify-between"
                          >
                            <span>Limpiar todas las notas</span>
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filtros y Búsqueda */}
                <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar estudiante por nombre o DNI..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    {searchStudent && (
                      <button 
                        onClick={() => setSearchStudent('')} 
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Filter size={11} />
                      <span>Filtro:</span>
                    </span>
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'aprobados', label: 'Aprobados (≥13)' },
                      { id: 'recuperacion', label: 'Recuperación (10-12)' },
                      { id: 'desaprobados', label: 'Desaprobados (<10)' },
                      { id: 'pendientes', label: 'Pendientes' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterStatus(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          filterStatus === f.id
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contenido de la Tabla de Calificaciones */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-slate-600 text-xs font-semibold">Cargando nómina de estudiantes...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-14 px-4 bg-slate-50/50 m-6 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Users size={28} />
                    </div>
                    <h4 className="text-base font-bold text-slate-800 mb-1">
                      No hay estudiantes matriculados en esta sección
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                      Puedes sincronizar automáticamente a los estudiantes activos del programa y ciclo correspondiente para poblar la nómina e iniciar la calificación.
                    </p>
                    <button
                      type="button"
                      onClick={handleSyncStudents}
                      disabled={syncing}
                      className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      {syncing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sincronizando nómina...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          <span>Sincronizar Nómina de Alumnos</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] w-12 text-center">N°</th>
                          <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] w-24">DNI</th>
                          <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Apellidos y Nombres</th>
                          
                          {gradingMode === 'capacidades' ? (
                            <>
                              <th className="py-3 px-2 font-bold uppercase tracking-wider text-[11px] text-center w-24">
                                <div>C1</div>
                                <div className="text-[9px] font-normal text-slate-500">Saberes (0-20)</div>
                              </th>
                              <th className="py-3 px-2 font-bold uppercase tracking-wider text-[11px] text-center w-24">
                                <div>C2</div>
                                <div className="text-[9px] font-normal text-slate-500">Práctica (0-20)</div>
                              </th>
                              <th className="py-3 px-2 font-bold uppercase tracking-wider text-[11px] text-center w-24">
                                <div>C3</div>
                                <div className="text-[9px] font-normal text-slate-500">Proyecto (0-20)</div>
                              </th>
                              <th className="py-3 px-3 font-extrabold uppercase tracking-wider text-[11px] text-center w-28 bg-slate-200/50">
                                <div>Promedio</div>
                                <div className="text-[9px] font-normal text-slate-500">Calculado</div>
                              </th>
                            </>
                          ) : (
                            <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[11px] text-center w-36 bg-slate-200/50">
                              <div>Promedio Final</div>
                              <div className="text-[9px] font-normal text-slate-500">Escala 0–20</div>
                            </th>
                          )}

                          <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-center w-36">Condición</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((student, idx) => {
                          const numGrade = parseInt(student.nota_final, 10);
                          const hasGrade = student.nota_final !== '' && !isNaN(numGrade);
                          const isPassed = hasGrade && numGrade >= 13;
                          const isRecovery = hasGrade && numGrade >= 10 && numGrade <= 12;

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-3 px-3 font-mono text-slate-500 font-semibold">{student.dni || '—'}</td>
                              <td className="py-3 px-4 font-bold text-slate-800 text-xs">
                                {student.name}
                              </td>

                              {gradingMode === 'capacidades' ? (
                                <>
                                  {/* Capacidad 1 */}
                                  <td className="py-2 px-2 text-center">
                                    <input
                                      id={`grade-input-${idx}-c1`}
                                      type="text"
                                      className="w-14 mx-auto text-center py-1 px-1 border border-slate-200 rounded-lg outline-none font-bold text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                      value={student.nota_c1}
                                      onChange={(e) => handleGradeChange(student.id, 'nota_c1', e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, idx, 'c1')}
                                      maxLength={2}
                                      placeholder="--"
                                    />
                                  </td>
                                  {/* Capacidad 2 */}
                                  <td className="py-2 px-2 text-center">
                                    <input
                                      id={`grade-input-${idx}-c2`}
                                      type="text"
                                      className="w-14 mx-auto text-center py-1 px-1 border border-slate-200 rounded-lg outline-none font-bold text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                      value={student.nota_c2}
                                      onChange={(e) => handleGradeChange(student.id, 'nota_c2', e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, idx, 'c2')}
                                      maxLength={2}
                                      placeholder="--"
                                    />
                                  </td>
                                  {/* Capacidad 3 */}
                                  <td className="py-2 px-2 text-center">
                                    <input
                                      id={`grade-input-${idx}-c3`}
                                      type="text"
                                      className="w-14 mx-auto text-center py-1 px-1 border border-slate-200 rounded-lg outline-none font-bold text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                      value={student.nota_c3}
                                      onChange={(e) => handleGradeChange(student.id, 'nota_c3', e.target.value)}
                                      onKeyDown={(e) => handleKeyDown(e, idx, 'c3')}
                                      maxLength={2}
                                      placeholder="--"
                                    />
                                  </td>
                                  {/* Promedio Calculado */}
                                  <td className="py-2 px-3 text-center bg-slate-50/50">
                                    <div className={`w-14 mx-auto text-center py-1 px-1 rounded-lg font-black text-sm border ${
                                      !hasGrade 
                                        ? 'border-slate-200 bg-white text-slate-400' 
                                        : isPassed 
                                          ? 'border-emerald-300 text-emerald-800 bg-emerald-50' 
                                          : isRecovery
                                            ? 'border-amber-300 text-amber-800 bg-amber-50'
                                            : 'border-rose-300 text-rose-700 bg-rose-50'
                                    }`}>
                                      {hasGrade ? String(numGrade).padStart(2, '0') : '—'}
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <td className="py-2 px-4 text-center bg-slate-50/50">
                                  <input 
                                    id={`grade-input-${idx}-prom`}
                                    type="text" 
                                    className={`w-16 mx-auto text-center py-1.5 px-2 border rounded-xl outline-none font-bold text-sm transition-all ${
                                      !hasGrade 
                                        ? 'border-slate-200 bg-white text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary' 
                                        : isPassed 
                                          ? 'border-emerald-300 text-emerald-800 bg-emerald-50 focus:border-emerald-500 focus:bg-white' 
                                          : isRecovery
                                            ? 'border-amber-300 text-amber-800 bg-amber-50 focus:border-amber-500 focus:bg-white'
                                            : 'border-rose-300 text-rose-700 bg-rose-50 focus:border-rose-500 focus:bg-white'
                                    }`}
                                    value={student.nota_final}
                                    onChange={(e) => handleGradeChange(student.id, 'nota_final', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, idx, 'prom')}
                                    maxLength={2}
                                    placeholder="--"
                                  />
                                </td>
                              )}

                              {/* Condición */}
                              <td className="py-3 px-4 text-center">
                                {!hasGrade ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                                    <Clock size={12} /> Pendiente
                                  </span>
                                ) : isPassed ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                                    <CheckCircle2 size={12} className="text-emerald-500" /> Aprobado
                                  </span>
                                ) : isRecovery ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full">
                                    <AlertTriangle size={12} className="text-amber-500" /> Recuperación
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-2.5 py-0.5 rounded-full">
                                    <XCircle size={12} className="text-rose-500" /> Desaprobado
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
            </div>
          )}
        </>
      )}

      {/* MODAL ACTA OFICIAL IMPRIMIBLE (PDF) */}
      {showActaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-4xl w-full my-8 overflow-hidden print:shadow-none print:max-w-none print:w-full print:m-0">
            {/* Header del modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-sm text-slate-900">Acta Oficial de Evaluación</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir / Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowActaModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
                    <th className="py-2 px-2 border-r border-slate-400 w-24">DNI</th>
                    <th className="py-2 px-3 border-r border-slate-400 text-left">Apellidos y Nombres</th>
                    <th className="py-2 px-2 border-r border-slate-400 w-12">C1</th>
                    <th className="py-2 px-2 border-r border-slate-400 w-12">C2</th>
                    <th className="py-2 px-2 border-r border-slate-400 w-12">C3</th>
                    <th className="py-2 px-2 border-r border-slate-400 w-20">Prom. (N°)</th>
                    <th className="py-2 px-3 border-r border-slate-400 w-36">Nota en Letras</th>
                    <th className="py-2 px-3 w-28">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {students.map((st, idx) => {
                    const gradeNum = parseInt(st.nota_final, 10);
                    const hasGrade = st.nota_final !== '' && !isNaN(gradeNum);
                    const isPassed = hasGrade && gradeNum >= 13;
                    return (
                      <tr key={st.id} className="text-center hover:bg-slate-50">
                        <td className="py-2 px-2 border-r border-slate-300 font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-2 border-r border-slate-300 font-mono text-slate-600">{st.dni || '—'}</td>
                        <td className="py-2 px-3 border-r border-slate-300 text-left font-semibold text-slate-800">{st.name}</td>
                        <td className="py-2 px-2 border-r border-slate-300 font-mono text-slate-600">{st.nota_c1 || '—'}</td>
                        <td className="py-2 px-2 border-r border-slate-300 font-mono text-slate-600">{st.nota_c2 || '—'}</td>
                        <td className="py-2 px-2 border-r border-slate-300 font-mono text-slate-600">{st.nota_c3 || '—'}</td>
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

              {/* Firmas Institucionales */}
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
                Acta oficial generada por el SIGA el {new Date().toLocaleString()} • Válida como registro institucional oficial
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
