import re

path = "D:/SIGA/siga_frontend/src/modules/enrollment/EnrollmentProcess.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update fetchAcademic to auto-select program and period
fetch_old = """    const fetchAcademic = async () => {
      try {
        const [pRes, peRes] = await Promise.all([
          apiClient.callModule('mod-programas-estudio', 'programas'),
          apiClient.callModule('mod-programas-estudio', 'periodos')
        ]);
        setPrograms(Array.isArray(pRes) ? pRes : []);
        setPeriods(Array.isArray(peRes) ? peRes : []);
      } catch (e) { console.error(e); }
    };
    fetchAcademic();
  }, []);"""

fetch_new = """    const fetchAcademic = async () => {
      try {
        const [pRes, peRes] = await Promise.all([
          apiClient.callModule('mod-programas-estudio', 'programas'),
          apiClient.callModule('mod-programas-estudio', 'periodos')
        ]);
        const fetchedPrograms = Array.isArray(pRes) ? pRes : [];
        const fetchedPeriods = Array.isArray(peRes) ? peRes : [];
        
        setPrograms(fetchedPrograms);
        setPeriods(fetchedPeriods);
        
        // Auto-select based on student and active period
        if (initialStudent) {
          const studentProgram = fetchedPrograms.find(p => p.id === initialStudent.programa_id || p.id == initialStudent.programa_id);
          const activePeriod = fetchedPeriods.find(p => p.estado === 'ACTIVO') || fetchedPeriods[fetchedPeriods.length - 1];
          
          setSelection(prev => ({
            ...prev,
            program: studentProgram || null,
            period: activePeriod || null
          }));
        }
      } catch (e) { console.error(e); }
    };
    fetchAcademic();
  }, [initialStudent]);"""

content = content.replace(fetch_old, fetch_new)

# 2. Update UI for Step 2
ui_old = """              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="label uppercase tracking-wider text-xs font-bold">Carrera Profesional</label>
                  <select 
                    className="input-field" 
                    onChange={(e) => setSelection({...selection, program: programs.find(p => p.id == e.target.value)})}
                  >
                    <option value="">Seleccione Carrera...</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label uppercase tracking-wider text-xs font-bold">Periodo Académico</label>
                  <select 
                    className="input-field" 
                    onChange={(e) => setSelection({...selection, period: periods.find(p => p.id == e.target.value)})}
                  >
                    <option value="">Seleccione Periodo...</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label uppercase tracking-wider text-xs font-bold">Tipo de Ingreso</label>
                  <select 
                    className="input-field" 
                    value={selection.tipo}
                    onChange={(e) => setSelection({...selection, tipo: e.target.value})}
                  >
                    <option value="Ordinario">Ingresante (Primera Vez)</option>
                    <option value="Regular">Estudiante Regular / Invicto</option>
                    <option value="Irregular">Estudiante Irregular</option>
                    <option value="Reingresante">Reingresante</option>
                    <option value="Traslado">Traslado / Convalidación</option>
                  </select>
                </div>
              </div>"""

ui_new = """              {/* Contexto Operativo y Casuística */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass-card p-4 border-l-4 border-l-primary bg-gradient-to-r from-white to-slate-50 flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Programa de Estudios</p>
                  <p className="font-bold text-slate-800">{selection.program ? selection.program.nombre : 'Buscando...'}</p>
                </div>
                
                <div className="glass-card p-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-white to-slate-50 flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Periodo Activo</p>
                  <p className="font-bold text-slate-800">{selection.period ? selection.period.codigo : 'Buscando...'}</p>
                </div>

                <div className="glass-card p-4 border-l-4 border-l-amber-500 bg-gradient-to-r from-white to-slate-50">
                  <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1 block">Casuística de Matrícula</label>
                  <select 
                    className="w-full bg-transparent border-b-2 border-slate-200 focus:border-amber-500 outline-none font-bold text-slate-700 pb-1" 
                    value={selection.tipo}
                    onChange={(e) => setSelection({...selection, tipo: e.target.value})}
                  >
                    <option value="Ordinario">Cachimbo (Auto-selección C1)</option>
                    <option value="Regular">Estudiante Regular (Invicto)</option>
                    <option value="Irregular">Estudiante Irregular</option>
                    <option value="Reingresante">Reingresante</option>
                    <option value="Traslado">Traslado / Convalidación</option>
                  </select>
                </div>
              </div>"""

if ui_old in content:
    content = content.replace(ui_old, ui_new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("EnrollmentProcess updated successfully.")
else:
    print("Could not find ui_old to replace.")
