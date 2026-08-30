import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';
import { Search, Wallet, CheckCircle2, AlertTriangle, Banknote } from 'lucide-react';

export function FinancesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handleSearch('');
  }, []);

  const handleSearch = async (val) => {
    setSearchTerm(val);
    if (val.length > 0 && val.length < 3) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error("Data is not an array:", data);
        setStudents([]);
        return;
      }
      
      const filtered = data.filter(s => {
        const d = s.dni || '';
        const n = s.nombres || '';
        const a = s.apellidos || '';
        const c = s.codigo_estudiante || '';
        return d.includes(val) || 
               n.toLowerCase().includes(val.toLowerCase()) || 
               a.toLowerCase().includes(val.toLowerCase()) || 
               c.includes(val);
      });
      setStudents(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const registerPayment = async (estudianteId) => {
    if (!window.confirm("¿Confirmar recepción de pago físico de matrícula?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${estudianteId}/pago_matricula?pagado=true`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (res.ok) {
        alert("Pago registrado con éxito. Estudiante habilitado financieramente.");
        // Refrescar lista
        handleSearch(searchTerm);
      } else {
        alert("Error al registrar pago.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red al registrar pago.");
    }
  };

  return (
    <div className="animate-fade-in p-6">
      <div className="mb-8">
        <h3 className="text-3xl font-bold tracking-tight text-slate-text flex items-center">
          <Wallet className="w-9 h-9 mr-3 text-primary" />
          Caja y <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark ml-2">Finanzas</span>
        </h3>
        <p className="text-slate-500 text-sm mt-1">Módulo de recaudación física y liberación de candados financieros.</p>
      </div>

      <div className="glass-card p-4 mb-8 flex items-center max-w-2xl bg-white border border-slate-200">
        <Search className="w-5 h-5 text-slate-400 mx-4" />
        <input 
          type="text" 
          className="w-full bg-transparent border-none focus:ring-0 py-2 text-slate-text placeholder-slate-400 outline-none"
          placeholder="Buscar estudiante por DNI, Nombre o Código..."
          value={searchTerm} 
          onChange={(e) => handleSearch(e.target.value)}
        />
        {loading && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-4"></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 mb-4 rounded-full bg-primary-soft flex items-center justify-center text-primary"><Wallet className="w-10 h-10" /></div>
            <p className="text-slate-500 font-medium">Usa el buscador para ubicar a un estudiante y registrar su pago</p>
          </div>
        ) : (
          students.map(s => (
            <div key={s.id} className={`glass-card p-6 flex flex-col h-full border-t-4 transition-all ${s.pago_matricula ? 'border-t-emerald-500 bg-emerald-50/30' : 'border-t-amber-400 bg-white'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h6 className="font-bold text-slate-text leading-tight">{s.nombres} {s.apellidos}</h6>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.codigo_estudiante} | DNI: {s.dni}</span>
                </div>
                {s.pago_matricula ? (
                  <span className="bg-emerald-100 text-emerald-700 p-1.5 rounded-full" title="Habilitado Financieramente">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-700 p-1.5 rounded-full" title="Deuda Pendiente">
                    <AlertTriangle className="w-5 h-5" />
                  </span>
                )}
              </div>
              
              <div className="mt-auto pt-4 flex space-x-3">
                <button 
                  className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center space-x-2 ${
                    s.pago_matricula 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'btn-primary'
                  }`}
                  disabled={s.pago_matricula}
                  onClick={() => registerPayment(s.id)}
                >
                  {s.pago_matricula ? <CheckCircle2 className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                  <span>{s.pago_matricula ? 'Pagado' : 'Registrar Pago Físico'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
