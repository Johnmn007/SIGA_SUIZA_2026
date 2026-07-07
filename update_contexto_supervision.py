import re

path = "D:/SIGA/siga_frontend/src/modules/evaluation/CoordinatorSupervision.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add useAuth import
content = content.replace(
    "import { apiClient } from '../../core/api/client';",
    "import { apiClient } from '../../core/api/client';\nimport { useAuth } from '../../core/auth/useAuth';"
)

# 2. Add user from useAuth
content = content.replace(
    "export function CoordinatorSupervision() {",
    "export function CoordinatorSupervision() {\n  const { user } = useAuth();"
)

# 3. Add personal to state and fetch logic
content = content.replace(
    "const [periods, setPeriods] = useState([]);",
    "const [periods, setPeriods] = useState([]);\n  const [personal, setPersonal] = useState([]);"
)

fetch_old = """    const fetchInitial = async () => {
      try {
        const [progRes, perRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas'),
          apiClient.request('/api/mod-programas-estudio/periodos')
        ]);
        setPrograms(progRes || []);
        setPeriods(perRes || []);
      } catch (e) {
        console.error('Error fetching initial data', e);
      }
    };
    fetchInitial();
  }, []);"""

fetch_new = """    const fetchInitial = async () => {
      try {
        const [progRes, perRes, personalRes] = await Promise.all([
          apiClient.request('/api/mod-programas-estudio/programas').catch(() => []),
          apiClient.request('/api/mod-programas-estudio/periodos').catch(() => []),
          apiClient.request('/api/mod-usuarios/personal').catch(() => [])
        ]);
        
        setPrograms(progRes || []);
        setPeriods(perRes || []);
        setPersonal(personalRes || []);
        
        if (personalRes && user) {
          const myProfile = personalRes.find(p => p.usuario?.id === user.id);
          if (myProfile?.perfil?.programa_estudio_id) {
            setSelectedProgram(myProfile.perfil.programa_estudio_id.toString());
          }
        }
        
        if (perRes && perRes.length > 0) {
          const active = perRes.find(p => p.estado === 'ACTIVO');
          setSelectedPeriod(active ? active.id.toString() : perRes[perRes.length - 1].id.toString());
        }
      } catch (e) {
        console.error('Error fetching initial data', e);
      }
    };
    if (user) fetchInitial();
  }, [user]);"""

content = content.replace(fetch_old, fetch_new)

# 4. Replace Contexto Operativo UI
ui_old = """      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 border-l-4 border-l-indigo-500">
          <label className="label uppercase tracking-wider text-[10px] font-extrabold text-slate-400 mb-2">1. Programa de Estudio</label>
          <select 
            className="input-field w-full text-sm font-medium"
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
          >
            <option value="">-- Seleccionar Programa a Supervisar --</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        
        <div className="glass-card p-5 border-l-4 border-l-teal-500">
          <label className="label uppercase tracking-wider text-[10px] font-extrabold text-slate-400 mb-2">2. Periodo Académico</label>
          <select 
            className="input-field w-full text-sm font-medium"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            disabled={!selectedProgram}
          >
            <option value="">-- Seleccionar Periodo --</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
          </select>
        </div>
      </div>"""

ui_new = """      {/* Contexto Operativo Informativo */}
      {selectedProgram && selectedPeriod && (
        <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-l-4 border-l-indigo-500 mb-6 bg-gradient-to-r from-white to-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-xl">🎓</div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Programa de Estudios</p>
              <p className="font-bold text-slate-800">{programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Cargando...'}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xl">📅</div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Periodo Activo</p>
              <p className="font-bold text-slate-800">{periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Cargando...'}</p>
            </div>
          </div>
        </div>
      )}"""

if ui_old in content:
    content = content.replace(ui_old, ui_new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("CoordinatorSupervision updated successfully.")
else:
    print("Could not find ui_old to replace.")
