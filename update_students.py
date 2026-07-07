import re

with open("D:/SIGA/siga_frontend/src/modules/students/StudentMaster.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { useState } from 'react';",
    "import { useState, useEffect } from 'react';\nimport { useAuth } from '../../core/auth/useAuth';"
)

# 2. Add useAuth to component
content = content.replace(
    "export function StudentMaster() {",
    "export function StudentMaster() {\n  const { user } = useAuth();\n  const userRole = user?.is_superuser ? 'superadmin' : (user?.role || 'invitado');"
)

# 3. Update handleSearch to mock filtering if needed, and trigger on mount
use_effect_code = """
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async (val = '') => {
"""
content = content.replace("  const handleSearch = async (val = '') => {", use_effect_code)

# 4. Update handleSincronizar
new_sync = """  const handleSincronizar = async () => {
    let targetPrograma = null;
    if (userRole === 'secretaria_programa') {
      targetPrograma = window.prompt("Ingrese el ID de su Programa de Estudios a sincronizar (Ej. 1 para Sistemas):", "1");
      if (!targetPrograma) return;
    } else if (userRole !== 'superadmin' && userRole !== 'admin') {
      alert("No tiene permisos para sincronizar.");
      return;
    }

    if (!window.confirm("¿Sincronizar lista de ingresantes desde el módulo de Admisión?")) return;
    setLoading(true);
    try {
      const resAdmision = await fetch('http://localhost:8009/admitidos');
      if (!resAdmision.ok) throw new Error("No se pudo conectar con Admisión Piloto");
      let admisionData = await resAdmision.json();
      
      if (targetPrograma) {
        const filteredAdmitidos = admisionData.admitidos.filter(a => a.programa_id.toString() === targetPrograma.toString());
        admisionData = { ...admisionData, admitidos: filteredAdmitidos };
      }
      
      if (admisionData.admitidos.length === 0) {
        alert("No se encontraron ingresantes para el programa seleccionado.");
        setLoading(false);
        return;
      }

      const resIngesta = await fetch(`${API_BASE}/api/mod-gestion-academica/admision/ingesta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(admisionData)
      });
      
      if (resIngesta.ok) {
        const result = await resIngesta.json();
        alert(`Sincronización exitosa. ${result.estudiantes_creados} nuevos estudiantes ingresados al Core.`);
        handleSearch('');
      } else {
        const err = await resIngesta.text();
        alert(`Error en la ingesta: ${err}`);
      }
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
    setLoading(false);
  };"""
content = re.sub(r'  const handleSincronizar = async \(\) => \{[\s\S]*?setLoading\(false\);\n  \};', new_sync, content)

# 5. Hide sync button from secretaria_academica
sync_button = """<div className="flex gap-3">
          <button 
            className="btn-secondary flex items-center space-x-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            onClick={handleSincronizar}
          >
            <span className="text-xl leading-none">📥</span>
            <span>Sincronizar desde Admisión</span>
          </button>
          <button"""
new_sync_button = """<div className="flex gap-3">
          {['superadmin', 'admin', 'secretaria_programa'].includes(userRole) && (
            <button 
              className="btn-secondary flex items-center space-x-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              onClick={handleSincronizar}
            >
              <span className="text-xl leading-none">📥</span>
              <span>Sincronizar desde Admisión</span>
            </button>
          )}
          <button"""
content = content.replace(sync_button, new_sync_button)

# 6. Change Cards to Table
old_cards = """<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 opacity-60">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-slate-500 font-medium">Usa el buscador para localizar perfiles maestros</p>
          </div>
        ) : (
          students.map(s => (
            <div key={s.id} className="glass-card p-6 flex flex-col h-full group">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mr-4 border border-primary/20 group-hover:scale-110 transition-transform">
                  {s.nombres[0]}{s.apellidos[0]}
                </div>
                <div>
                  <h6 className="font-bold text-slate-800 leading-tight">{s.nombres} {s.apellidos}</h6>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.codigo_estudiante}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-6 mt-auto">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">DNI</span>
                  <span className="font-bold text-sm text-slate-700">{s.dni}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-500 mb-1">Estado</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded border border-green-200">
                    {s.estado_academico}
                  </span>
                </div>
              </div>
              
              <button 
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm"
                onClick={() => setSelectedStudent(s)}
              >
                Detalle Completo
              </button>
            </div>
          ))
        )}
      </div>"""

new_table = """<div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Estudiante</th>
                <th className="py-4 px-6 font-semibold">Código</th>
                <th className="py-4 px-6 font-semibold">DNI</th>
                <th className="py-4 px-6 font-semibold">Estado</th>
                <th className="py-4 px-6 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center opacity-60">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-slate-500 font-medium">No se encontraron estudiantes registrados</p>
                  </td>
                </tr>
              ) : (
                students.map(s => (
                  <tr key={s.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs mr-3 border border-primary/20">
                          {s.nombres[0]}{s.apellidos[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{s.nombres} {s.apellidos}</p>
                          <p className="text-xs text-slate-500">{s.email_personal || s.email_institucional || 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-600 text-sm bg-slate-100 px-2 py-1 rounded">{s.codigo_estudiante}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">{s.dni}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${s.estado_academico === 'postulante' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                        {s.estado_academico}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => setSelectedStudent(s)}
                        className="text-primary hover:text-primary-dark text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Ver Detalle →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>"""

content = content.replace(old_cards, new_table)

with open("D:/SIGA/siga_frontend/src/modules/students/StudentMaster.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Actualización completada exitosamente.")
