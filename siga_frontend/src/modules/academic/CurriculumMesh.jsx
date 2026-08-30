import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';
import { ArrowLeft, X, Plus } from 'lucide-react';

export function CurriculumMesh({ programId, onBack }) {
  const [malla, setMalla] = useState([]);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({ nombre: '', periodo: 1 });

  const fetchMalla = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [mallaRes, programRes] = await Promise.all([
        fetch(`${API_BASE}/api/mod-programas-estudio/programas/${programId}/malla`, { headers }),
        fetch(`${API_BASE}/api/mod-programas-estudio/programas/${programId}`, { headers })
      ]);
      setMalla(await mallaRes.json());
      setProgram(await programRes.json());
    } catch (error) {
      console.error('Error fetching mesh:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMalla();
  }, [programId]);

  const handleAddModule = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/mod-programas-estudio/programas/${programId}/modulos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newModule)
      });
      if (response.ok) {
        setShowAddModule(false);
        setNewModule({ nombre: '', periodo: 1 });
        fetchMalla();
      }
    } catch (error) {
      console.error('Error adding module:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="inline-block w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <button
          className="mr-3 p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
          onClick={onBack}
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="font-bold mb-0 text-slate-text">
            Malla Curricular: <span className="text-primary">{program?.nombre}</span>
          </h3>
          <p className="text-slate-500 text-sm mb-0">Gestión de módulos y unidades didácticas por ciclo</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {malla.map((modulo) => (
          <div key={modulo.id}>
            <div className="glass-card p-3 h-full border-t-4 border-t-primary">
              <div className="flex justify-between items-center mb-3">
                <h6 className="font-bold mb-0 text-slate-text">{modulo.nombre}</h6>
                <span className="badge-blue">
                  Ciclo {modulo.periodo}
                </span>
              </div>

              <div className="flex flex-col gap-2 mb-3">
                {modulo.unidades.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-3 border border-dashed border-slate-300 rounded">
                    Sin unidades asignadas
                  </p>
                ) : (
                  modulo.unidades.map(u => (
                    <div
                      key={u.id}
                      className="p-2 bg-slate-50 border border-slate-200 rounded text-sm flex justify-between items-center"
                    >
                      <span>{u.nombre}</span>
                      <span className="text-slate-500 font-bold" style={{fontSize: '0.7rem'}}>{u.creditos} CR</span>
                    </div>
                  ))
                )}
              </div>

              <button
                className="w-full rounded-full border border-primary text-primary text-sm font-semibold py-1.5 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                style={{fontSize: '0.7rem'}}
              >
                <Plus size={12} /> Agregar Unidad
              </button>
            </div>
          </div>
        ))}

        <div>
          <div className="glass-card p-8 h-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            onClick={() => setShowAddModule(true)}
          >
            <div className="w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-3">
              <Plus size={26} />
            </div>
            <span className="text-slate-500 text-sm font-bold">NUEVO MÓDULO</span>
          </div>
        </div>
      </div>

      {showAddModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md">
            <div className="glass-card overflow-hidden bg-white/95 shadow-2xl">
              <div className="flex justify-between items-center p-5 pb-0">
                <h6 className="text-lg font-bold text-slate-text">Nuevo Módulo/Ciclo</h6>
                <button
                  onClick={() => setShowAddModule(false)}
                  className="btn-icon text-slate-400 hover:text-slate-600"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddModule}>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="label">NOMBRE</label>
                    <input
                      type="text"
                      className="input-field w-full"
                      value={newModule.nombre}
                      onChange={e => setNewModule({...newModule, nombre: e.target.value})}
                      placeholder="Ej: Módulo I"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">CICLO/PERIODO</label>
                    <input
                      type="number"
                      className="input-field w-full"
                      value={newModule.periodo}
                      onChange={e => setNewModule({...newModule, periodo: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="p-5 pt-0">
                  <button type="submit" className="btn-primary w-full">Crear Módulo</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}