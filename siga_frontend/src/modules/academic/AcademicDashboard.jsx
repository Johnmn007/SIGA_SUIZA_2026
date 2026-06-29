import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

import { CurriculumMesh } from './CurriculumMesh';
import { PeriodManager } from './PeriodManager';

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
  const [newProgram, setNewProgram] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    creditos_totales: 120,
    duracion_periodos: 6
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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setIsProcessing(true);
    setPreviewData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Usamos el cliente API base pero saltándonos el default JSON content-type para FormData
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
      // 1. Crear el Programa en mod-programas-estudio primero (usando datos del preview)
      const programaData = {
        nombre: previewData.nombre,
        codigo: previewData.codigo,
        descripcion: previewData.descripcion || 'Carrera importada desde Plan MINEDU',
        creditos_totales: previewData.creditos_totales,
        duracion_periodos: 6 // Por defecto
      };
      
      const createdProgram = await apiClient.callModule('mod-programas-estudio', 'programas', 'POST', programaData);

      // 1.5 Crear los módulos y unidades en mod-programas-estudio
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

      // 2. Importar la estructura modular en mod-planes-estudio (respaldo oficial MINEDU)
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
        fetchData(); // Refrescar vista
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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Carreras Profesionales</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Administración de programas de estudio y mallas curriculares</p>
        </div>
        <button 
          className="btn-primary flex items-center space-x-2 shadow-glow"
          onClick={() => setShowImportModal(true)}
        >
          <span className="text-xl leading-none">🚀</span>
          <span>Crear Carrera desde Plan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Periods Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-24">
            <h5 className="font-bold text-slate-800 mb-4 tracking-tight">Periodos Académicos</h5>
            {periods.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No hay periodos configurados.</p>
            ) : (
              <div className="flex flex-col space-y-3">
                {periods.map(period => (
                  <div key={period.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center transition-colors hover:bg-slate-100">
                    <span className="font-bold text-sm text-slate-700">{period.codigo}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded border border-green-200">
                      {period.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button 
              className="w-full mt-6 py-2 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors"
              onClick={() => setShowPeriodManager(true)}
            >
              Gestionar Calendario
            </button>
          </div>
        </div>

        {/* Right: Programs List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Cargando programas académicos...</p>
              </div>
            ) : programs.length === 0 ? (
              <div className="col-span-full glass-card p-12 flex flex-col items-center justify-center text-center opacity-80">
                <div className="text-6xl mb-4">📚</div>
                <h5 className="text-xl font-bold text-slate-700 mb-2">No hay programas registrados</h5>
                <p className="text-slate-500 text-sm max-w-md">Comienza registrando la primera carrera profesional del instituto usando el botón de Nueva Carrera.</p>
              </div>
            ) : (
              programs.map(program => (
                <div key={program.id} className="glass-card p-6 flex flex-col h-full hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-bold text-lg text-slate-800 leading-tight mb-1">{program.nombre}</h5>
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider rounded border border-slate-200 uppercase">
                        {program.codigo}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-xl font-extrabold text-primary-dark leading-none">{program.creditos_totales}</div>
                      <small className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Créditos</small>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 mb-6 flex-grow line-clamp-2">
                    {program.descripcion || 'Sin descripción disponible para este programa profesional.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Duración</div>
                      <div className="font-semibold text-slate-700 text-sm">{program.duracion_periodos} Ciclos</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modalidad</div>
                      <div className="font-semibold text-slate-700 text-sm capitalize">{program.modalidad || 'Presencial'}</div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <button 
                      className="flex-1 py-2 bg-primary/10 text-primary hover:bg-primary/20 font-semibold rounded-lg transition-colors text-sm"
                      onClick={() => {
                        setSelectedProgram(program.id);
                        setView('mesh');
                      }}
                    >
                      Ver Malla
                    </button>
                    <button className="flex-1 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-lg transition-colors text-sm">
                      Configurar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Program Modal (Old form removed) */}

      {/* Import MINEDU Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-white/95 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h5 className="font-bold text-xl text-slate-800 tracking-tight">Importar Plan de Estudio MINEDU</h5>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow">
              {!previewData && (
                <div className="border-2 border-dashed border-primary/40 rounded-xl p-12 text-center bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                  />
                  <div className="text-5xl mb-4">📄</div>
                  <h6 className="font-bold text-slate-700 mb-2">Sube el archivo Excel del Plan MINEDU</h6>
                  <p className="text-slate-500 text-sm">El sistema analizará las hojas y extraerá la malla curricular automáticamente.</p>
                  
                  {isProcessing && (
                    <div className="mt-6 flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-semibold text-primary mt-2">Procesando estructura...</span>
                    </div>
                  )}
                </div>
              )}

              {previewData && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="px-2 py-1 bg-primary/10 text-primary font-bold text-xs rounded uppercase tracking-wider mb-2 inline-block">Vista Previa</span>
                      <h4 className="font-bold text-xl text-slate-800">{previewData.nombre}</h4>
                      <p className="text-slate-500 text-sm mt-1">Código Modular: <span className="font-bold text-slate-700">{previewData.codigo}</span></p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-black text-primary-dark">{previewData.creditos_totales}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Créditos</div>
                      </div>
                      <div className="w-px bg-slate-200"></div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-primary-dark">{previewData.horas_totales}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Horas</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h6 className="font-bold text-slate-700 mb-3 border-b pb-2">Estructura Modular Extraída</h6>
                    <div className="space-y-4">
                      {previewData.modulos.map((mod, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 p-3 flex justify-between items-center">
                            <span className="font-bold text-sm text-slate-800">{mod.nombre}</span>
                            <div className="flex gap-3 text-xs font-semibold text-slate-600">
                              <span>{mod.creditos} CR</span>
                              <span>{mod.horas} HR</span>
                            </div>
                          </div>
                          <div className="bg-white p-0">
                            {mod.unidades.length > 0 ? (
                              <table className="w-full text-left text-sm">
                                <tbody>
                                  {mod.unidades.map((ud, uIdx) => (
                                    <tr key={uIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                      <td className="py-2 px-4 text-slate-700">• {ud.nombre}</td>
                                      <td className="py-2 px-4 text-right text-slate-500 font-medium w-24">{ud.creditos} CR</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-400 italic">No se encontraron unidades didácticas</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
              <button 
                type="button" 
                className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" 
                onClick={() => setShowImportModal(false)}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              {previewData && (
                <button 
                  type="button" 
                  className="btn-primary px-6 flex items-center space-x-2"
                  onClick={handleConfirmImport}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
    </div>
  );
}
