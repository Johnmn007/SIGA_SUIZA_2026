import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { CurriculumMesh } from './CurriculumMesh';
import { PeriodManager } from './PeriodManager';
import { Rocket, BookOpen, Calendar, X, FileSpreadsheet, Settings, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';

export function AcademicDashboard() {
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'mesh'
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPeriodManager, setShowPeriodManager] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSaveProgram = async (e) => {
    e.preventDefault();
    if (!editingProgram) return;
    setSavingEdit(true);
    try {
      await apiClient.request(`/api/mod-programas-estudio/programas/${editingProgram.id}`, {
        method: 'PUT',
        data: {
          nombre: editingProgram.nombre,
          codigo: editingProgram.codigo,
          descripcion: editingProgram.descripcion || '',
          creditos_totales: parseInt(editingProgram.creditos_totales) || 120,
          duracion_periodos: parseInt(editingProgram.duracion_periodos) || 6,
          modalidad: editingProgram.modalidad || 'presencial',
          estado: editingProgram.estado || 'activo'
        }
      });
      setEditingProgram(null);
      fetchData();
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Error al guardar la configuración de la carrera');
    } finally {
      setSavingEdit(false);
    }
  };

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

  if (view === 'mesh') {
    return <CurriculumMesh programId={selectedProgram} onBack={() => setView('list')} />;
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header Estilo Linear / Stripe */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 mb-2">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Gestión Curricular y Académica</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Programas de Estudio
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Administración de carreras profesionales, planes formativos y calendarios lectivos.
          </p>
        </div>

        <button 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
          onClick={() => setShowImportModal(true)}
        >
          <Rocket size={16} />
          <span>Importar Plan MINEDU</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Periods Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h5 className="font-semibold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <Calendar size={16} className="text-slate-500" />
                <span>Periodos Lectivos</span>
              </h5>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
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
                  const isActivo = period.estado?.toLowerCase() === 'activo' || period.estado?.toLowerCase() === 'en_curso';
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
                      
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
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

        {/* Right: Programs List */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-slate-500 text-sm font-medium">Cargando programas académicos...</p>
            </div>
          ) : programs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
                <BookOpen size={28} />
              </div>
              <h5 className="text-lg font-bold text-slate-800 mb-1">No hay carreras registradas</h5>
              <p className="text-slate-500 text-xs max-w-sm mb-5">
                Carga el primer programa de estudios a través del botón de importación de Plan MINEDU.
              </p>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                <Rocket size={14} /> Importar Ahora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {programs.map(program => (
                <div 
                  key={program.id} 
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Title and Code Badge */}
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div>
                        <span className="inline-block font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2">
                          {program.codigo}
                        </span>
                        <h4 className="font-bold text-lg text-slate-900 tracking-tight leading-snug">
                          {program.nombre}
                        </h4>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                          {program.creditos_totales}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          Créditos
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-5">
                      {program.descripcion || 'Programa modular de formación profesional técnica adaptado a lineamientos MINEDU.'}
                    </p>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Duración
                        </span>
                        <span className="font-semibold text-xs text-slate-800">
                          {program.duracion_periodos} Ciclos Lectivos
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Modalidad
                        </span>
                        <span className="font-semibold text-xs text-slate-800 capitalize">
                          {program.modalidad || 'Presencial'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-2">
                    <button 
                      className="flex-1 py-2 px-3 bg-primary text-white hover:bg-primary-dark font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      onClick={() => {
                        setSelectedProgram(program.id);
                        setView('mesh');
                      }}
                    >
                      <span>Ver Malla Curricular</span>
                      <ArrowRight size={13} />
                    </button>
                    <button 
                      className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200/90 text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      onClick={() => setEditingProgram({ ...program })}
                      title="Editar configuración"
                    >
                      <Settings size={14} className="text-slate-500" />
                      <span>Configurar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import MINEDU Modal */}
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
                aria-label="Cerrar"
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

      {/* Period Manager Modal */}
      {showPeriodManager && (
        <PeriodManager 
          onClose={() => setShowPeriodManager(false)} 
          onUpdate={fetchData} 
        />
      )}

      {/* Edit Program Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parámetros del Programa</span>
                <h5 className="font-bold text-base text-slate-900">{editingProgram.nombre}</h5>
              </div>
              <button
                onClick={() => setEditingProgram(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Nombre del Programa</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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

              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 capitalize focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editingProgram.modalidad || 'presencial'}
                    onChange={e => setEditingProgram({ ...editingProgram, modalidad: e.target.value })}
                  >
                    <option value="presencial">Presencial</option>
                    <option value="semipresencial">Semipresencial</option>
                    <option value="a_distancia">A Distancia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea
                  rows="3"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={editingProgram.descripcion || ''}
                  onChange={e => setEditingProgram({ ...editingProgram, descripcion: e.target.value })}
                  placeholder="Descripción general del perfil formativo..."
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  disabled={savingEdit}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
