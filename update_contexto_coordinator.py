import re

path = "D:/SIGA/siga_frontend/src/modules/academic/CoordinatorAcademic.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_contexto = """      {/* Global Selectors */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
          <span className="mr-2">⚙️</span> Contexto Operativo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Programa de Estudios</label>
            <select 
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white/50 backdrop-blur-sm"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              <option value="">-- Seleccionar Programa --</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Periodo Académico</label>
            <select 
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white/50 backdrop-blur-sm"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="">-- Seleccionar Periodo --</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.codigo} - {p.estado}</option>
              ))}
            </select>
          </div>
        </div>
      </div>"""

new_contexto = """      {/* Contexto Operativo Informativo */}
      {selectedProgram && selectedPeriod && (
        <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-l-4 border-l-primary mb-8 bg-gradient-to-r from-white to-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">🎓</div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Programa de Estudios</p>
              <p className="font-bold text-slate-800">{programs.find(p => p.id.toString() === selectedProgram)?.nombre || 'Cargando...'}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xl">📅</div>
            <div>
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Periodo Activo</p>
              <p className="font-bold text-slate-800">{periods.find(p => p.id.toString() === selectedPeriod)?.codigo || 'Cargando...'}</p>
            </div>
          </div>
        </div>
      )}"""

if old_contexto in content:
    content = content.replace(old_contexto, new_contexto)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced Contexto Operativo successfully.")
else:
    print("Could not find the exact old_contexto string to replace.")
