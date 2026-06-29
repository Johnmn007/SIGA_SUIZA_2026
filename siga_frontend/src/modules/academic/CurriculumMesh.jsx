import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';

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

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-link text-decoration-none p-0 me-3 fs-4" onClick={onBack}>←</button>
        <div>
          <h3 className="fw-bold mb-0">Malla Curricular: <span className="gradient-text">{program?.nombre}</span></h3>
          <p className="text-secondary small mb-0">Gestión de módulos y unidades didácticas por ciclo</p>
        </div>
      </div>

      <div className="row g-4">
        {malla.map((modulo) => (
          <div key={modulo.id} className="col-md-4">
            <div className="glass-card p-3 h-100 border-top border-4" style={{borderTopColor: 'var(--accent-primary) !important'}}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">{modulo.nombre}</h6>
                <span className="badge bg-light text-dark">Ciclo {modulo.periodo}</span>
              </div>
              
              <div className="d-flex flex-column gap-2 mb-3">
                {modulo.unidades.length === 0 ? (
                  <p className="text-secondary extra-small text-center py-3 border border-dashed rounded">Sin unidades asignadas</p>
                ) : (
                  modulo.unidades.map(u => (
                    <div key={u.id} className="p-2 bg-light border rounded small d-flex justify-content-between align-items-center">
                      <span>{u.nombre}</span>
                      <span className="text-secondary fw-bold" style={{fontSize: '0.7rem'}}>{u.creditos} CR</span>
                    </div>
                  ))
                )}
              </div>

              <button className="btn btn-sm btn-outline-primary w-100 rounded-pill" style={{fontSize: '0.7rem'}}>
                + Agregar Unidad
              </button>
            </div>
          </div>
        ))}

        <div className="col-md-4">
          <div 
            className="glass-card p-5 h-100 d-flex flex-column align-items-center justify-content-center border-dashed cursor-pointer"
            onClick={() => setShowAddModule(true)}
            style={{border: '2px dashed var(--border-color)', background: 'transparent'}}
          >
            <div className="fs-1 text-secondary mb-2">+</div>
            <span className="text-secondary small fw-bold">NUEVO MÓDULO</span>
          </div>
        </div>
      </div>

      {/* Add Module Modal */}
      {showAddModule && (
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content glass-card border-0">
              <div className="modal-header border-0">
                <h6 className="modal-title fw-bold">Nuevo Módulo/Ciclo</h6>
                <button type="button" className="btn-close" onClick={() => setShowAddModule(false)}></button>
              </div>
              <form onSubmit={handleAddModule}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small text-secondary fw-bold">NOMBRE</label>
                    <input 
                      type="text" className="form-control" 
                      value={newModule.nombre} onChange={e => setNewModule({...newModule, nombre: e.target.value})}
                      placeholder="Ej: Módulo I" required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-secondary fw-bold">CICLO/PERIODO</label>
                    <input 
                      type="number" className="form-control" 
                      value={newModule.periodo} onChange={e => setNewModule({...newModule, periodo: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="submit" className="btn-premium w-100">Crear Módulo</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
