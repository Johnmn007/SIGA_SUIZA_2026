import re

with open("D:/SIGA/siga_frontend/src/modules/students/StudentMaster.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add currentPrograma state
content = content.replace(
    "const [selectedStudent, setSelectedStudent] = useState(null);",
    "const [selectedStudent, setSelectedStudent] = useState(null);\n  const [currentPrograma, setCurrentPrograma] = useState('1');"
)

# Update handleSearch
old_search = """    try {
      // Usar la ruta correcta del módulo integrado
      let url = `${API_BASE}/api/mod-gestion-academica/estudiantes/`;
      const res = await fetch(url, {"""
new_search = """    try {
      // Usar la ruta correcta del módulo integrado
      let url = `${API_BASE}/api/mod-gestion-academica/estudiantes/`;
      if (userRole === 'secretaria_programa') {
        url += `?programa_id=${currentPrograma}`;
      }
      const res = await fetch(url, {"""
content = content.replace(old_search, new_search)

# Update handleSincronizar
old_sync_start = """  const handleSincronizar = async () => {
    let targetPrograma = null;
    if (userRole === 'secretaria_programa') {
      targetPrograma = window.prompt("Ingrese el ID de su Programa de Estudios a sincronizar (Ej. 1 para Sistemas):", "1");
      if (!targetPrograma) return;
    } else if (userRole !== 'superadmin' && userRole !== 'admin') {"""
new_sync_start = """  const handleSincronizar = async () => {
    let targetPrograma = null;
    if (userRole === 'secretaria_programa') {
      targetPrograma = currentPrograma;
    } else if (userRole !== 'superadmin' && userRole !== 'admin') {"""
content = content.replace(old_sync_start, new_sync_start)

# Add Select to UI
old_search_bar = """<div className="glass-card p-2 mb-8 flex items-center max-w-2xl">
        <span className="px-4 text-slate-400 text-xl">🔍</span>"""
new_search_bar = """<div className="glass-card p-2 mb-8 flex items-center max-w-3xl gap-2">
        {userRole === 'secretaria_programa' && (
          <select 
            className="input-field py-3 text-sm bg-slate-50 border-none w-48 font-bold text-primary"
            value={currentPrograma}
            onChange={(e) => {
              setCurrentPrograma(e.target.value);
              // fetch is triggered by useEffect on currentPrograma change if we wanted, 
              // but we can just let user type or we trigger search
            }}
          >
            <option value="1">Arquitectura de Plat.</option>
            <option value="2">Enfermería Técnica</option>
            <option value="3">Diseño Gráfico</option>
          </select>
        )}
        <span className="px-4 text-slate-400 text-xl">🔍</span>"""
content = content.replace(old_search_bar, new_search_bar)

# Trigger search on currentPrograma change
old_use_effect = """  useEffect(() => {
    handleSearch();
  }, []);"""
new_use_effect = """  useEffect(() => {
    handleSearch(searchTerm);
  }, [currentPrograma]);"""
content = content.replace(old_use_effect, new_use_effect)

with open("D:/SIGA/siga_frontend/src/modules/students/StudentMaster.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Actualización completada exitosamente.")
