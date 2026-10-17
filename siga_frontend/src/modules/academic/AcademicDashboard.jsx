import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../core/api/client';
import { CurriculumMesh } from './CurriculumMesh';
import { PeriodManager } from './PeriodManager';
import { CareerCarousel } from './CareerCarousel';
import { 
  Rocket, 
  BookOpen, 
  Calendar, 
  X, 
  FileSpreadsheet, 
  Settings, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Search, 
  Plus, 
  Filter, 
  LayoutGrid, 
  List, 
  Sliders, 
  Edit3, 
  Clock, 
  GraduationCap, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Check, 
  RotateCcw,
  Sparkles,
  Award,
  Briefcase
} from 'lucide-react';

export function AcademicDashboard() {
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'mesh'
  const [selectedProgram, setSelectedProgram] = useState(null);
  
  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPeriodManager, setShowPeriodManager] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editingProgram, setEditingProgram] = useState(null);
  const [configProgram, setConfigProgram] = useState(null);
  
  // Import modal state
  const [importFile, setImportFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Saving states
  const [savingProgram, setSavingProgram] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterModalidad, setFilterModalidad] = useState('todas');
  const [filterArea, setFilterArea] = useState('todas');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 6 : 8;

  // Form for New Program
  const [newProgram, setNewProgram] = useState({
    nombre: '',
    codigo: '',
    resolucion: '',
    descripcion: '',
    creditos_totales: 126,
    duracion_periodos: 6,
    modalidad: 'presencial',
    estado: 'activo'
  });

  // Form for Parametrization
  const [paramConfig, setParamConfig] = useState({
    periodo_academico: 1,
    turnos: ['mañana'],
    max_estudiantes: 35,
    coordinador_nombre: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [programsData, periodsData] = await Promise.all([
        apiClient.callModule('mod-programas-estudio', 'programas'),
        apiClient.callModule('mod-programas-estudio', 'periodos')
      ]);

      setPrograms(Array.isArray(programsData) ? programsData : []);
      setPeriods(Array.isArray(periodsData) ? periodsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: Categorize program by academic area
  const getAreaByProgram = (nombre) => {
    const n = (nombre || '').toUpperCase();
    if (n.includes('SISTEMA') || n.includes('COMPUTO') || n.includes('SOFTWARE') || n.includes('INFORMACI')) {
      return { name: 'Tecnologías de la Información', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (n.includes('ENFERMER') || n.includes('SALUD') || n.includes('CLINIC') || n.includes('FARMACIA')) {
      return { name: 'Ciencias de la Salud', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (n.includes('CONTABILIDAD') || n.includes('GESTI') || n.includes('ADMINISTRA') || n.includes('ASISTENCIA')) {
      return { name: 'Gestión y Negocios', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (n.includes('CONSTRUCCI') || n.includes('CIVIL') || n.includes('EDIFICACI') || n.includes('ARQUITECT')) {
      return { name: 'Ingeniería y Construcción', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (n.includes('MECATR') || n.includes('AUTOMOTRIZ') || n.includes('ELECTRICIDAD') || n.includes('INDUSTRIAL')) {
      return { name: 'Electrotecnia y Mecánica', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    }
    if (n.includes('AGRO') || n.includes('FORESTAL') || n.includes('PECUARIA') || n.includes('AMBIENT')) {
      return { name: 'Agropecuaria y Forestal', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (n.includes('TURISMO') || n.includes('HOTEL') || n.includes('GASTRONOM')) {
      return { name: 'Turismo y Hotelería', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    return { name: 'Formación Técnica General', badge: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  // Helper: Extract ministerial resolution
  const getResolucion = (program) => {
    if (!program) return 'R.M. MINEDU';
    const text = (program.descripcion || '') + ' ' + (program.codigo || '');
    const match = text.match(/(R\.?[MD]\.?\s*[\w\d\-\/]+)/i);
    if (match) return match[1];
    return `R.M. ${program.codigo}-MINEDU`;
  };

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        p.nombre?.toLowerCase().includes(q) || 
        p.codigo?.toLowerCase().includes(q) || 
        p.descripcion?.toLowerCase().includes(q) ||
        getAreaByProgram(p.nombre).name.toLowerCase().includes(q);

      const pEstado = (p.estado || 'activo').toLowerCase();
      const matchesEstado = filterEstado === 'todos' || 
        (filterEstado === 'activo' && pEstado === 'activo') ||
        (filterEstado === 'en_liquidacion' && (pEstado === 'en_liquidacion' || pEstado === 'liquidacion')) ||
        (filterEstado === 'inactivo' && pEstado === 'inactivo');

      const pModalidad = (p.modalidad || 'presencial').toLowerCase();
      const matchesModalidad = filterModalidad === 'todas' || pModalidad === filterModalidad;

      const pArea = getAreaByProgram(p.nombre).name;
      const matchesArea = filterArea === 'todas' || pArea === filterArea;

      return matchesSearch && matchesEstado && matchesModalidad && matchesArea;
    });
  }, [programs, searchTerm, filterEstado, filterModalidad, filterArea]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, filterModalidad, filterArea, viewMode]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage) || 1;
  const paginatedPrograms = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPrograms.slice(start, start + itemsPerPage);
  }, [filteredPrograms, currentPage, itemsPerPage]);

  const hasActiveFilters = searchTerm !== '' || filterEstado !== 'todos' || filterModalidad !== 'todas' || filterArea !== 'todas';

  const resetFilters = () => {
    setSearchTerm('');
    setFilterEstado('todos');
    setFilterModalidad('todas');
    setFilterArea('todas');
  };

  // Create Program Handler
  const handleCreateProgram = async (e) => {
    e.preventDefault();
    setCreateError('');
    setSavingProgram(true);
    try {
      const nombreTrimmed = newProgram.nombre.trim();
      const codigoTrimmed = newProgram.codigo.trim().toUpperCase();

      // Validación preventiva local: verificar si el programa ya existe por código o por nombre
      const normalize = (str) => (str || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const existeLocal = programs.some(p => 
        (p.codigo && p.codigo.trim().toUpperCase() === codigoTrimmed) ||
        (normalize(p.nombre) === normalize(nombreTrimmed))
      );

      if (existeLocal) {
        setCreateError("Este programa de estudio ya existe");
        setSavingProgram(false);
        return;
      }

      const fullDescription = newProgram.resolucion 
        ? `${newProgram.resolucion}. ${newProgram.descripcion}` 
        : newProgram.descripcion || 'Carrera profesional técnica oficial del IESTP Suiza';

      const payload = {
        nombre: nombreTrimmed,
        codigo: codigoTrimmed,
        descripcion: fullDescription,
        creditos_totales: parseInt(newProgram.creditos_totales) || 126,
        duracion_periodos: parseInt(newProgram.duracion_periodos) || 6,
        modalidad: newProgram.modalidad || 'presencial',
        estado: newProgram.estado || 'activo'
      };

      await apiClient.callModule('mod-programas-estudio', 'programas', 'POST', payload);

      setShowCreateModal(false);
      setCreateError('');
      setNewProgram({
        nombre: '',
        codigo: '',
        resolucion: '',
        descripcion: '',
        creditos_totales: 126,
        duracion_periodos: 6,
        modalidad: 'presencial',
        estado: 'activo'
      });
      await fetchData();
    } catch (error) {
      console.error('Error al crear programa:', error);
      const detail = error.message || '';
      if (detail.toLowerCase().includes('ya existe') || detail.toLowerCase().includes('duplicado') || detail.includes('programa de estudio')) {
        setCreateError("Este programa de estudio ya existe");
      } else {
        setCreateError(detail || "Este programa de estudio ya existe");
      }
    } finally {
      setSavingProgram(false);
    }
  };

  // Edit Program Handler
  const handleSaveProgram = async (e) => {
    e.preventDefault();
    if (!editingProgram) return;
    setSavingProgram(true);
    try {
      // El body debe enviarse como `body` (RequestInit de fetch). Antes se usaba
      // `data`, que fetch ignora: la PUT viajaba sin cuerpo y el backend
      // respondia 422 porque nombre, codigo y creditos_totales son obligatorios.
      const payload = {
        nombre: editingProgram.nombre,
        codigo: editingProgram.codigo,
        descripcion: editingProgram.descripcion || '',
        creditos_totales: parseInt(editingProgram.creditos_totales) || 120,
        duracion_periodos: parseInt(editingProgram.duracion_periodos) || 6,
        modalidad: editingProgram.modalidad || 'presencial',
        estado: editingProgram.estado || 'activo'
      };

      console.log("Payload enviado:", payload);
      console.log("Programa seleccionado:", editingProgram);

      await apiClient.request(`/api/mod-programas-estudio/programas/${editingProgram.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setEditingProgram(null);
      await fetchData();
    } catch (error) {
      console.error("Status:", error?.status);
      console.error("Response data:", error?.data);
      console.error("Error completo:", error);
      alert('Error al guardar la configuración de la carrera');
    } finally {
      setSavingProgram(false);
    }
  };

  // Open Parametrization Modal
  const handleOpenConfigModal = async (program) => {
    setConfigProgram(program);
    try {
      const res = await apiClient.request(`/api/mod-programas-estudio/programas/${program.id}/configuracion`).catch(() => null);
      if (res) {
        setParamConfig({
          periodo_academico: res.periodo_academico || 1,
          turnos: Array.isArray(res.turnos) ? res.turnos : ['mañana'],
          max_estudiantes: res.max_estudiantes || 35,
          coordinador_nombre: res.coordinador_nombre || ''
        });
      } else {
        setParamConfig({
          periodo_academico: 1,
          turnos: ['mañana', 'noche'],
          max_estudiantes: 35,
          coordinador_nombre: ''
        });
      }
    } catch {
      setParamConfig({
        periodo_academico: 1,
        turnos: ['mañana', 'noche'],
        max_estudiantes: 35,
        coordinador_nombre: ''
      });
    }
  };

  // Save Parametrization Handler
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!configProgram) return;
    setSavingConfig(true);
    try {
      await apiClient.request(`/api/mod-programas-estudio/programas/${configProgram.id}/configuracion`, {
        method: 'POST',
        body: JSON.stringify({
          periodo_academico: parseInt(paramConfig.periodo_academico) || 1,
          turnos: paramConfig.turnos,
          max_estudiantes: parseInt(paramConfig.max_estudiantes) || 35,
          coordinador_id: null
        })
      });
      alert('¡Parametrización guardada exitosamente!');
      setConfigProgram(null);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('Error al guardar la parametrización');
    } finally {
      setSavingConfig(false);
    }
  };

  // Toggle turno in config
  const toggleTurno = (t) => {
    setParamConfig(prev => {
      const exists = prev.turnos.includes(t);
      if (exists) {
        if (prev.turnos.length === 1) return prev; // Mantener al menos uno
        return { ...prev, turnos: prev.turnos.filter(x => x !== t) };
      }
      return { ...prev, turnos: [...prev.turnos, t] };
    });
  };

  // Excel Import Handlers (Preserved)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setIsProcessing(true);
    setPreviewData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiClient.baseURL}/api/mod-planes-estudio/planes/parse-minedu`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      if (response.ok) {
        setPreviewData(result.data);
      } else {
        alert(result.detail || 'Error al procesar el archivo');
      }
    } catch (error) {
      console.error('Error procesando Excel:', error);
      alert('Error de conexión al procesar el archivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile || !previewData) return;
    setIsProcessing(true);
    
    try {
      const programaData = {
        nombre: previewData.nombre,
        codigo: previewData.codigo,
        descripcion: previewData.descripcion || 'Carrera importada desde Plan MINEDU',
        creditos_totales: previewData.creditos_totales,
        duracion_periodos: 6
      };
      
      const createdProgram = await apiClient.callModule('mod-programas-estudio', 'programas', 'POST', programaData);

      if (createdProgram && createdProgram.id) {
        for (let i = 0; i < previewData.modulos.length; i++) {
          const modData = previewData.modulos[i];
          const moduloToCreate = {
            nombre: modData.nombre,
            periodo: modData.orden || i + 1,
            horas_totales: modData.horas || 0,
            creditos: modData.creditos || 0,
            orden: modData.orden || i + 1
          };
          
          const createdModulo = await apiClient.callModule('mod-programas-estudio', `programas/${createdProgram.id}/modulos`, 'POST', moduloToCreate);
          
          if (createdModulo && createdModulo.id && modData.unidades) {
            for (let j = 0; j < modData.unidades.length; j++) {
              const udData = modData.unidades[j];
              const unidadToCreate = {
                nombre: udData.nombre,
                horas_teoria: udData.horas || 0,
                horas_practica: 0,
                creditos: udData.creditos || 0,
                orden: j + 1
              };
              await apiClient.callModule('mod-programas-estudio', `modulos/${createdModulo.id}/unidades`, 'POST', unidadToCreate);
            }
          }
        }
      }

      const formData = new FormData();
      formData.append('file', importFile);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiClient.baseURL}/api/mod-planes-estudio/planes/importar-minedu`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const result = await response.json();
      if (response.ok) {
        alert('¡Carrera y Plan de Estudios creados exitosamente!');
        setShowImportModal(false);
        setImportFile(null);
        setPreviewData(null);
        fetchData();
      } else {
        alert(result.detail || 'Error al guardar el plan de estudios');
      }
    } catch (error) {
      console.error('Error en importación:', error);
      alert('Error al crear la carrera. Podría haber conflictos de código duplicado.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render Curriculum Mesh if selected
  if (view === 'mesh') {
    return <CurriculumMesh programId={selectedProgram} onBack={() => setView('list')} />;
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 mb-2">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Gestión Curricular y Académica Central</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Programas de Estudio
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Administración central de carreras profesionales técnicas, planes formativos y calendarios lectivos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
            onClick={() => { setCreateError(''); setShowCreateModal(true); }}
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>Crear Nuevo Programa</span>
          </button>

          <button 
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200/90 shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
            onClick={() => setShowImportModal(true)}
          >
            <Rocket size={15} className="text-primary" />
            <span>Importar Plan MINEDU</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Periods Sidebar, Right Programs Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left: Periods Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h5 className="font-semibold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <Calendar size={16} className="text-slate-500" />
                <span>Periodos Lectivos</span>
              </h5>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {periods.length}
              </span>
            </div>

            {periods.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-xs italic">No hay periodos configurados.</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                {periods.map(period => {
                  const isActivo = period.estado?.toLowerCase() === 'activo' || period.estado?.toLowerCase() === 'matricula_abierta' || period.estado?.toLowerCase() === 'en_curso';
                  return (
                    <div 
                      key={period.id} 
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex justify-between items-center transition-all hover:bg-slate-50 hover:border-slate-300/80"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-800 tracking-tight block">
                          {period.codigo}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {period.fecha_inicio ? new Date(period.fecha_inicio).getFullYear() : '2026'}
                        </span>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isActivo
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActivo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {period.estado || 'Activo'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button 
              className="w-full mt-4 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/90 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              onClick={() => setShowPeriodManager(true)}
            >
              <span>Gestionar Calendario</span>
              <ArrowRight size={13} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Right: Programs Explorer */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Search, Filter Toolbar & View Toggle */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3.5">
            {/* Top Bar: Quick Search + View Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar carrera por nombre, código ministerial o resolución..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* View Toggle (Grid / List) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'grid' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Vista en Tarjetas"
                >
                  <LayoutGrid size={15} />
                  <span className="hidden md:inline">Cuadrícula</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'list' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  title="Vista en Lista / Tabla"
                >
                  <List size={15} />
                  <span className="hidden md:inline">Lista</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdowns Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1 text-slate-400 font-medium mr-1">
                <Filter size={13} />
                <span>Filtros:</span>
              </div>

              {/* Estado */}
              <select
                value={filterEstado}
                onChange={e => setFilterEstado(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
              >
                <option value="todos">Todos los Estados</option>
                <option value="activo">Activo</option>
                <option value="en_liquidacion">En Liquidación</option>
                <option value="inactivo">Inactivo</option>
              </select>

              {/* Modalidad */}
              <select
                value={filterModalidad}
                onChange={e => setFilterModalidad(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
              >
                <option value="todas">Todas las Modalidades</option>
                <option value="presencial">Presencial</option>
                <option value="semipresencial">Semipresencial</option>
                <option value="a_distancia">A Distancia</option>
              </select>

              {/* Área / Departamento */}
              <select
                value={filterArea}
                onChange={e => setFilterArea(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
              >
                <option value="todas">Todas las Áreas Académicas</option>
                <option value="Tecnologías de la Información">Tecnologías de la Información</option>
                <option value="Ciencias de la Salud">Ciencias de la Salud</option>
                <option value="Gestión y Negocios">Gestión y Negocios</option>
                <option value="Ingeniería y Construcción">Ingeniería y Construcción</option>
                <option value="Electrotecnia y Mecánica">Electrotecnia y Mecánica</option>
                <option value="Agropecuaria y Forestal">Agropecuaria y Forestal</option>
                <option value="Turismo y Hotelería">Turismo y Hotelería</option>
              </select>

              {/* Limpiar Filtros */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition-colors ml-auto cursor-pointer"
                  title="Restablecer filtros"
                >
                  <RotateCcw size={12} />
                  <span>Limpiar</span>
                </button>
              )}

              {/* Contador */}
              <div className="ml-auto text-slate-400 font-semibold text-[11px]">
                {filteredPrograms.length} {filteredPrograms.length === 1 ? 'carrera' : 'carreras'} en catálogo
              </div>
            </div>
          </div>

          {/* Loading & Empty States */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-slate-500 text-sm font-medium">Cargando programas académicos...</p>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                <BookOpen size={28} />
              </div>
              <h5 className="text-lg font-bold text-slate-800 mb-1">
                {hasActiveFilters ? 'No se encontraron carreras con los filtros actuales' : 'No hay carreras registradas'}
              </h5>
              <p className="text-slate-500 text-xs max-w-sm mb-5">
                {hasActiveFilters 
                  ? 'Intenta restablecer los términos de búsqueda o cambiar los filtros seleccionados.' 
                  : 'Crea tu primer programa de estudio o impórtalo desde el formato oficial MINEDU.'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <RotateCcw size={14} /> Restablecer Filtros
                </button>
              ) : (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <Plus size={14} /> Registrar Primer Programa
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= GRID VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {paginatedPrograms.map(program => {
                const areaInfo = getAreaByProgram(program.nombre);
                const resolucion = getResolucion(program);
                const estado = (program.estado || 'activo').toLowerCase();
                const isActivo = estado === 'activo';
                const isLiquidacion = estado === 'en_liquidacion' || estado === 'liquidacion';

                return (
                  <div 
                    key={program.id} 
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 p-6 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Carrusel de imágenes de la carrera */}
                      <CareerCarousel nombreCarrera={program.nombre} />

                      {/* Top Badges: Code, Area & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {program.codigo}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${areaInfo.badge}`}>
                            {areaInfo.name}
                          </span>
                        </div>

                        {/* Status Chip */}
                        <div>
                          {isActivo && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Activo
                            </span>
                          )}
                          {isLiquidacion && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              En Liquidación
                            </span>
                          )}
                          {!isActivo && !isLiquidacion && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Program Title & Credits */}
                      <div className="flex justify-between items-start gap-3 mb-2.5">
                        <h4 className="font-bold text-base text-slate-900 tracking-tight leading-snug group-hover:text-primary transition-colors">
                          {program.nombre}
                        </h4>
                        
                        <div className="text-right flex-shrink-0 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                          <div className="text-xl font-black text-slate-900 tracking-tight leading-none">
                            {program.creditos_totales}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Créditos
                          </span>
                        </div>
                      </div>

                      {/* Resolution & Description */}
                      <div className="mb-4">
                        <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
                          <Award size={13} className="text-amber-500 flex-shrink-0" />
                          <span className="font-mono text-slate-700">{resolucion}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {program.descripcion || 'Programa modular de formación profesional técnica adaptado a lineamientos MINEDU.'}
                        </p>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                            <Clock size={11} /> Duración
                          </span>
                          <span className="font-semibold text-xs text-slate-800">
                            {program.duracion_periodos} Ciclos Lectivos
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                            <Building2 size={11} /> Modalidad
                          </span>
                          <span className="font-semibold text-xs text-slate-800 capitalize">
                            {program.modalidad || 'Presencial'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="pt-3.5 border-t border-slate-100 flex items-center gap-2">
                      <button 
                        className="flex-1 py-2 px-3 bg-primary text-white hover:bg-primary-dark font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        onClick={() => {
                          setSelectedProgram(program.id);
                          setView('mesh');
                        }}
                        title="Explorar Malla Curricular y Unidades Didácticas"
                      >
                        <span>Ver Malla</span>
                        <ArrowRight size={13} />
                      </button>

                      <button 
                        className="py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 text-xs transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        onClick={() => handleOpenConfigModal(program)}
                        title="Configurar turnos, cupos y coordinación"
                      >
                        <Sliders size={13} className="text-slate-500" />
                        <span className="hidden sm:inline">Parametrización</span>
                      </button>

                      <button 
                        className="py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 text-xs transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        onClick={() => setEditingProgram({ ...program })}
                        title="Editar información de la carrera"
                      >
                        <Edit3 size={13} className="text-slate-500" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= LIST / TABLE VIEW ================= */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Programa de Estudio</th>
                      <th className="py-3.5 px-4">Área / Depto</th>
                      <th className="py-3.5 px-4 text-center">Créditos</th>
                      <th className="py-3.5 px-4">Duración</th>
                      <th className="py-3.5 px-4">Modalidad</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedPrograms.map(program => {
                      const areaInfo = getAreaByProgram(program.nombre);
                      const resolucion = getResolucion(program);
                      const estado = (program.estado || 'activo').toLowerCase();
                      const isActivo = estado === 'activo';
                      const isLiquidacion = estado === 'en_liquidacion' || estado === 'liquidacion';

                      return (
                        <tr key={program.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {program.codigo}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <span className="font-bold text-slate-900 block leading-snug">
                              {program.nombre}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {resolucion}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${areaInfo.badge}`}>
                              {areaInfo.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                            {program.creditos_totales}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {program.duracion_periodos} Ciclos
                          </td>
                          <td className="py-3.5 px-4 capitalize text-slate-700">
                            {program.modalidad || 'Presencial'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isActivo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Activo
                              </span>
                            )}
                            {isLiquidacion && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                En Liquidación
                              </span>
                            )}
                            {!isActivo && !isLiquidacion && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Inactivo
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedProgram(program.id);
                                  setView('mesh');
                                }}
                                className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Ver Malla Curricular"
                              >
                                <ArrowRight size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenConfigModal(program)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Configurar Parametrización"
                              >
                                <Sliders size={14} />
                              </button>
                              <button
                                onClick={() => setEditingProgram({ ...program })}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Editar Carrera"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-sm text-xs">
              <span className="text-slate-500 font-medium">
                Página <span className="font-bold text-slate-800">{currentPage}</span> de <span className="font-bold text-slate-800">{totalPages}</span> ({filteredPrograms.length} carreras)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg font-bold transition-all text-xs ${
                      currentPage === page 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: CREAR NUEVO PROGRAMA DE ESTUDIO ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Plus size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h5 className="font-bold text-base text-slate-900 tracking-tight">Crear Nuevo Programa de Estudio</h5>
                  <p className="text-xs text-slate-400">Registra una nueva carrera profesional técnica en el catálogo del instituto</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="p-6 overflow-y-auto space-y-4">
              {createError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 flex items-center gap-2.5 text-rose-700 text-xs sm:text-sm font-bold shadow-xs animate-shake">
                  <AlertCircle size={18} className="text-rose-500 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Programa de Estudio <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. ARQUITECTURA DE PLATAFORMAS Y SERVICIOS TI"
                  className={`w-full px-3.5 py-2.5 bg-slate-50/50 border rounded-xl text-xs sm:text-sm text-slate-800 uppercase focus:outline-none focus:ring-2 transition-all font-semibold ${
                    createError ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                  }`}
                  value={newProgram.nombre}
                  onChange={e => {
                    setNewProgram({ ...newProgram, nombre: e.target.value });
                    if (createError) setCreateError('');
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Código Modular / MINEDU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 0584735 o APS-01"
                    className={`w-full px-3.5 py-2.5 bg-slate-50/50 border rounded-xl text-xs sm:text-sm font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 transition-all font-bold ${
                      createError ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                    }`}
                    value={newProgram.codigo}
                    onChange={e => {
                      setNewProgram({ ...newProgram, codigo: e.target.value });
                      if (createError) setCreateError('');
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Resolución Ministerial
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. R.M. 0415-2023-MINEDU"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={newProgram.resolucion}
                    onChange={e => setNewProgram({ ...newProgram, resolucion: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Créditos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="180"
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={newProgram.creditos_totales}
                    onChange={e => setNewProgram({ ...newProgram, creditos_totales: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Ciclos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={newProgram.duracion_periodos}
                    onChange={e => setNewProgram({ ...newProgram, duracion_periodos: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Modalidad
                  </label>
                  <select
                    className="w-full px-2.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 capitalize focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    value={newProgram.modalidad}
                    onChange={e => setNewProgram({ ...newProgram, modalidad: e.target.value })}
                  >
                    <option value="presencial">Presencial</option>
                    <option value="semipresencial">Semipresencial</option>
                    <option value="a_distancia">A Distancia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Estado
                  </label>
                  <select
                    className="w-full px-2.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    value={newProgram.estado}
                    onChange={e => setNewProgram({ ...newProgram, estado: e.target.value })}
                  >
                    <option value="activo">Activo</option>
                    <option value="en_liquidacion">En Liquidación</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción Institucional del Programa
                </label>
                <textarea
                  rows="3"
                  placeholder="Perfil de egreso, competencias específicas y ámbito de desempeño profesional..."
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={newProgram.descripcion}
                  onChange={e => setNewProgram({ ...newProgram, descripcion: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  disabled={savingProgram}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  disabled={savingProgram}
                >
                  {savingProgram ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Guardar Programa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIGURAR PARAMETRIZACIÓN ================= */}
      {configProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sliders size={17} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parametrización Operativa</span>
                  <h5 className="font-bold text-base text-slate-900 leading-tight">{configProgram.nombre}</h5>
                </div>
              </div>
              <button
                onClick={() => setConfigProgram(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Código Modular</span>
                  <span className="font-mono font-bold text-slate-800">{configProgram.codigo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Modalidad Oficial</span>
                  <span className="font-semibold text-slate-800 capitalize">{configProgram.modalidad || 'Presencial'}</span>
                </div>
              </div>

              {/* Turnos Habilitados */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Turnos Habilitados para Matrícula y Dictado
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {['mañana', 'tarde', 'noche'].map(t => {
                    const isSelected = paramConfig.turnos.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => toggleTurno(t)}
                        className={`p-2.5 rounded-xl border text-xs font-bold capitalize flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-primary shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Check size={13} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Selecciona al menos un turno vigente para la programación horaria.</p>
              </div>

              {/* Aforo / Cupo Máximo */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Aforo Máximo por Sección
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="60"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={paramConfig.max_estudiantes}
                    onChange={e => setParamConfig({ ...paramConfig, max_estudiantes: e.target.value })}
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Estudiantes límite por aula</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Periodo Lectivo Base
                  </label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={paramConfig.periodo_academico}
                    onChange={e => setParamConfig({ ...paramConfig, periodo_academico: e.target.value })}
                  >
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>Periodo {p.codigo}</option>
                    ))}
                    {periods.length === 0 && <option value="1">Periodo 2026-I</option>}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Ciclo de inicio parametrizado</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfigProgram(null)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  disabled={savingConfig}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                  disabled={savingConfig}
                >
                  {savingConfig ? 'Guardando...' : 'Aplicar Parametrización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR INFORMACIÓN DE CARRERA ================= */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ficha de la Carrera</span>
                <h5 className="font-bold text-base text-slate-900 leading-tight">{editingProgram.nombre}</h5>
              </div>
              <button
                onClick={() => setEditingProgram(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Nombre del Programa</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={editingProgram.nombre}
                  onChange={e => setEditingProgram({ ...editingProgram, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Código Modular</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editingProgram.codigo}
                    onChange={e => setEditingProgram({ ...editingProgram, codigo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Créditos Totales</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editingProgram.creditos_totales}
                    onChange={e => setEditingProgram({ ...editingProgram, creditos_totales: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Duración (Ciclos)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editingProgram.duracion_periodos}
                    onChange={e => setEditingProgram({ ...editingProgram, duracion_periodos: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Modalidad</label>
                  <select
                    className="w-full px-2.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 capitalize focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editingProgram.modalidad || 'presencial'}
                    onChange={e => setEditingProgram({ ...editingProgram, modalidad: e.target.value })}
                  >
                    <option value="presencial">Presencial</option>
                    <option value="semipresencial">Semipresencial</option>
                    <option value="a_distancia">A Distancia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Estado</label>
                  <select
                    className="w-full px-2.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editingProgram.estado || 'activo'}
                    onChange={e => setEditingProgram({ ...editingProgram, estado: e.target.value })}
                  >
                    <option value="activo">Activo</option>
                    <option value="en_liquidacion">En Liquidación</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Resolución y Descripción</label>
                <textarea
                  rows="3"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={editingProgram.descripcion || ''}
                  onChange={e => setEditingProgram({ ...editingProgram, descripcion: e.target.value })}
                  placeholder="Resolución ministerial y descripción del perfil formativo..."
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  disabled={savingProgram}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                  disabled={savingProgram}
                >
                  {savingProgram ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: IMPORTAR MINEDU (PRESERVADO) ================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <h5 className="font-bold text-base text-slate-900 tracking-tight">Importar Plan de Estudio MINEDU</h5>
                <p className="text-xs text-slate-400">Estructura curricular automática a partir del formato Excel oficial</p>
              </div>
              <button 
                onClick={() => setShowImportModal(false)} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow space-y-4">
              {!previewData && (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-slate-400 hover:bg-slate-50/50 transition-all cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                  />
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <FileSpreadsheet size={24} />
                  </div>
                  <h6 className="font-bold text-slate-800 text-sm mb-1">Arrastra o selecciona el archivo Excel</h6>
                  <p className="text-slate-400 text-xs">Formato oficial de planes de estudio y mallas curriculares MINEDU (.xlsx)</p>
                  
                  {isProcessing && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      <span>Procesando archivo...</span>
                    </div>
                  )}
                </div>
              )}

              {previewData && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex justify-between items-center">
                    <div>
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                        <CheckCircle2 size={11} /> Plan Validado
                      </div>
                      <h4 className="font-bold text-base text-slate-900">{previewData.nombre}</h4>
                      <p className="text-slate-500 text-xs mt-0.5">Código: <span className="font-mono font-semibold text-slate-700">{previewData.codigo}</span></p>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <div className="text-xl font-black text-slate-900">{previewData.creditos_totales}</div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">Créditos</div>
                      </div>
                      <div className="w-px bg-slate-200"></div>
                      <div>
                        <div className="text-xl font-black text-slate-900">{previewData.horas_totales}</div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">Horas</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h6 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Módulos Extraídos ({previewData.modulos?.length || 0})</h6>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {previewData.modulos.map((mod, idx) => (
                        <div key={idx} className="border border-slate-200/80 rounded-xl overflow-hidden text-xs">
                          <div className="bg-slate-50 p-2.5 flex justify-between items-center font-semibold text-slate-700">
                            <span>{mod.nombre}</span>
                            <span className="text-slate-500 font-mono text-[11px]">{mod.creditos} CR • {mod.horas} HR</span>
                          </div>
                          {mod.unidades && mod.unidades.length > 0 && (
                            <div className="p-2 bg-white space-y-1">
                              {mod.unidades.map((ud, uIdx) => (
                                <div key={uIdx} className="flex justify-between items-center text-slate-600 px-2 py-1 hover:bg-slate-50 rounded">
                                  <span>• {ud.nombre}</span>
                                  <span className="text-slate-400 font-mono">{ud.creditos} CR</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button 
                type="button" 
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={() => setShowImportModal(false)}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              {previewData && (
                <button 
                  type="button" 
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-2 transition-all"
                  onClick={handleConfirmImport}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Importando...</span>
                    </>
                  ) : (
                    <span>Confirmar e Importar</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: GESTIÓN DE PERIODOS (PRESERVADO) ================= */}
      {showPeriodManager && (
        <PeriodManager 
          onClose={() => setShowPeriodManager(false)} 
          onUpdate={fetchData} 
        />
      )}
    </div>
  );
}
