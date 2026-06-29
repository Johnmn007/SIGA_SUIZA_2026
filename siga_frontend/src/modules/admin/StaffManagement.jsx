import { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';

export function StaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    condicion_laboral: 'NOMBRADO_ESTADO',
    numero_resolucion: '',
    fecha_fin_contrato: '',
    cargo_funcional: 'DOCENTE_AULA',
    profesion_titulo: '',
    programa_estudio_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request('/api/mod-usuarios/personal');
      setStaffList(Array.isArray(data) ? data : []);
      
      // Also fetch programs for the dropdown
      const progData = await apiClient.request('/api/mod-programas-estudio/programas');
      setPrograms(Array.isArray(progData) ? progData : []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Prepare payload
    const payload = { ...formData };
    if (!payload.numero_resolucion) payload.numero_resolucion = null;
    if (!payload.fecha_fin_contrato) payload.fecha_fin_contrato = null;
    if (!payload.profesion_titulo) payload.profesion_titulo = null;
    if (!payload.programa_estudio_id) {
      payload.programa_estudio_id = null;
    } else {
      payload.programa_estudio_id = parseInt(payload.programa_estudio_id);
    }

    try {
      await apiClient.request('/api/mod-usuarios/personal', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      alert('Personal registrado exitosamente');
      setShowModal(false);
      setFormData({
        email: '',
        full_name: '',
        password: '',
        condicion_laboral: 'NOMBRADO_ESTADO',
        numero_resolucion: '',
        fecha_fin_contrato: '',
        cargo_funcional: 'DOCENTE_AULA',
        profesion_titulo: '',
        programa_estudio_id: ''
      });
      fetchStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert(error.message || 'Error al guardar el personal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isContracted = ['CONTRATADO_DRE', 'CONTRATADO_INSTITUCIONAL'].includes(formData.condicion_laboral);
  const requiresProgram = ['SECRETARIA_PROGRAMA', 'DOCENTE_AULA', 'ASISTENTE_LABORATORIO'].includes(formData.cargo_funcional);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="text-xl font-bold text-slate-800">Plana Docente y Administrativa</h4>
          <p className="text-slate-500 text-sm">Gestión de RRHH, Contratos y Designaciones</p>
        </div>
        <button 
          className="btn-primary flex items-center space-x-2 shadow-glow"
          onClick={() => setShowModal(true)}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Registrar Personal</span>
        </button>
      </div>

      <div className="glass-card overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Personal</th>
                <th className="px-6 py-4 font-semibold">Cargo Funcional</th>
                <th className="px-6 py-4 font-semibold">Condición</th>
                <th className="px-6 py-4 font-semibold">Resolución / Fin</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      Cargando personal...
                    </div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                    No hay personal registrado en el sistema.
                  </td>
                </tr>
              ) : (
                staffList.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold mr-3 shadow-md">
                          {item.usuario.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{item.usuario.full_name}</div>
                          <div className="text-xs text-slate-500">{item.usuario.email}</div>
                          {item.perfil.profesion_titulo && (
                            <div className="text-[10px] text-primary font-medium">{item.perfil.profesion_titulo}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.perfil.cargo_funcional.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.perfil.condicion_laboral === 'NOMBRADO_ESTADO' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {item.perfil.condicion_laboral.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.perfil.numero_resolucion ? (
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{item.perfil.numero_resolucion}</div>
                          {item.perfil.fecha_fin_contrato && (
                            <div className="text-xs text-slate-500">
                              Vence: {new Date(item.perfil.fecha_fin_contrato).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No aplica</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors p-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Personal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-800">Registrar Personal (RRHH)</h3>
              <button 
                className="text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setShowModal(false)}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="staff-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Datos de Identidad */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-3 border-b pb-2 flex items-center">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs mr-2">1</span>
                    Identidad y Credenciales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Profesión / Título</label>
                      <input 
                        type="text" 
                        name="profesion_titulo"
                        value={formData.profesion_titulo}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="Ej. Ing. de Sistemas"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Email Institucional</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña Inicial</label>
                      <input 
                        type="text" 
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Perfil Funcional */}
                <div>
                  <h4 className="font-bold text-slate-700 mb-3 border-b pb-2 flex items-center">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs mr-2">2</span>
                    Cargo y Asignación
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Cargo Funcional</label>
                      <select 
                        name="cargo_funcional"
                        value={formData.cargo_funcional}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                      >
                        <option value="DOCENTE_AULA">Docente de Aula</option>
                        <option value="ASISTENTE_LABORATORIO">Asistente de Laboratorio</option>
                        <option value="JEFE_AREA">Jefe de Área Académica</option>
                        <option value="SECRETARIA_PROGRAMA">Secretaría de Programa</option>
                      </select>
                    </div>

                    {requiresProgram && (
                      <div className="animate-fade-in">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Designar a Programa</label>
                        <select 
                          name="programa_estudio_id"
                          value={formData.programa_estudio_id}
                          onChange={handleInputChange}
                          required={requiresProgram}
                          className="w-full px-4 py-2 bg-slate-50 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-semibold text-amber-900"
                        >
                          <option value="">-- Seleccionar Carrera --</option>
                          {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">Requerido para aislar la data administrativa</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Condición Laboral */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-3 flex items-center">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs mr-2">3</span>
                    Condición Laboral (Contrato)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Condición</label>
                      <select 
                        name="condicion_laboral"
                        value={formData.condicion_laboral}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold text-sm"
                      >
                        <option value="NOMBRADO_ESTADO">Nombrado (Estado)</option>
                        <option value="CONTRATADO_DRE">Contratado DREU</option>
                        <option value="CONTRATADO_INSTITUCIONAL">Contrato Institucional (RDR)</option>
                      </select>
                    </div>

                    {isContracted && (
                      <>
                        <div className="animate-fade-in">
                          <label className="block text-sm font-semibold text-slate-700 mb-1">N° Resolución</label>
                          <input 
                            type="text" 
                            name="numero_resolucion"
                            value={formData.numero_resolucion}
                            onChange={handleInputChange}
                            required={isContracted}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                            placeholder={formData.condicion_laboral === 'CONTRATADO_DRE' ? "Ej. RD 045-2026-DREU" : "Ej. RDI 012-2026-IESTP"}
                          />
                        </div>
                        <div className="animate-fade-in">
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Fin de Contrato</label>
                          <input 
                            type="date" 
                            name="fecha_fin_contrato"
                            value={formData.fecha_fin_contrato}
                            onChange={handleInputChange}
                            required={isContracted}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 sticky bottom-0 z-10">
              <button 
                type="button" 
                className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="staff-form"
                className="btn-primary px-6 flex items-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Registrar Personal</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
