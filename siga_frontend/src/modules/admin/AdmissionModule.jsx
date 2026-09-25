import { useState } from 'react';
import { API_BASE } from '../../core/api/client';
import { GraduationCap, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export function AdmissionModule() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage({ text: '', type: '' });
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    const formData = new FormData();
    formData.append("file", file);

    try {
      // mod-admision upload endpoint
      const res = await fetch('http://localhost:8009/api/mod-admision/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ text: data.message || 'Archivo procesado con éxito.', type: 'success' });
      } else {
        setMessage({ text: data.detail || 'Error al procesar el archivo.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error de conexión al servidor.', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-slate-100 bg-white/40">
        <h5 className="text-xl font-bold text-slate-text flex items-center">
          <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mr-3">
            <GraduationCap className="w-5 h-5" />
          </span>
          Módulo de Admisión
        </h5>
      </div>
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-text mb-4">Cargar Resultados de Admisión</h2>
          <p className="text-slate-500 mb-8">
            Sube el archivo Excel oficial (ej. ADMISION_2026.xlsx) para procesar a los ingresantes.
            El sistema se encargará de extraer los datos de postulantes regulares y exonerados automáticamente.
          </p>

          <form onSubmit={handleProcess} className="space-y-6">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input 
                type="file" 
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-soft file:text-primary hover:file:bg-primary/20 transition-colors cursor-pointer"
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading || !file}
              className="w-full btn-primary py-3 text-lg rounded-xl flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-3 h-5 w-5 text-white" />
                  Procesando Excel...
                </>
              ) : "Procesar Archivo"}
            </button>
          </form>

          {message.text && (
            <div className={`mt-6 p-4 rounded-xl font-medium ${
              message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="inline w-4 h-4 mr-1" /> : <AlertTriangle className="inline w-4 h-4 mr-1" />}
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
