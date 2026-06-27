import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

import { CurriculumMesh } from './CurriculumMesh';

export function AcademicDashboard() {
  const [programs, setPrograms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'mesh'
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.callModule('mod-programas-estudio', 'programas', 'POST', newProgram);

      if (response) {
        setShowModal(false);
        setNewProgram({ nombre: '', codigo: '', descripcion: '', creditos_totales: 120, duracion_periodos: 6 });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating program:', error);
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
          className="btn-primary flex items-center space-x-2"
          onClick={() => setShowModal(true)}
        >
          <span className="text-xl leading-none">+</span>
          <span>Nueva Carrera</span>
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
            <button className="w-full mt-6 py-2 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors">
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

      {/* New Program Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg overflow-hidden bg-white/95 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h5 className="font-bold text-xl text-slate-800 tracking-tight">Nueva Carrera Profesional</h5>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateProgram}>
              <div className="p-6 space-y-5">
                <div>
                  <label className="label uppercase tracking-wider text-xs">Nombre de la Carrera</label>
                  <input 
                    type="text" className="input-field" 
                    value={newProgram.nombre} onChange={e => setNewProgram({...newProgram, nombre: e.target.value})}
                    placeholder="Ej: Desarrollo de Sistemas" required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label uppercase tracking-wider text-xs">Código</label>
                    <input 
                      type="text" className="input-field" 
                      value={newProgram.codigo} onChange={e => setNewProgram({...newProgram, codigo: e.target.value})}
                      placeholder="Ej: DS-2024" required
                    />
                  </div>
                  <div>
                    <label className="label uppercase tracking-wider text-xs">Créditos Totales</label>
                    <input 
                      type="number" className="input-field" 
                      value={newProgram.creditos_totales} onChange={e => setNewProgram({...newProgram, creditos_totales: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label uppercase tracking-wider text-xs">Descripción</label>
                  <textarea 
                    className="input-field min-h-[100px] resize-y"
                    value={newProgram.descripcion} onChange={e => setNewProgram({...newProgram, descripcion: e.target.value})}
                    placeholder="Breve descripción del perfil profesional..."
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
                <button type="button" className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary px-6">Guardar Carrera</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
