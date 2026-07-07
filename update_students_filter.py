import re

file_path = "D:/SIGA/siga_frontend/src/modules/students/StudentMaster.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update initial state of currentPrograma
# We will set it to 'ALL' if superadmin/admin, otherwise '1'. But since we can't do that directly in useState before user is loaded cleanly, we'll just initialize to 'ALL'.
content = content.replace("const [currentPrograma, setCurrentPrograma] = useState('1');", "const [currentPrograma, setCurrentPrograma] = useState('ALL');")

# 2. Update handleSearch to filter if currentPrograma !== 'ALL'
old_search = """      let url = `${API_BASE}/api/mod-gestion-academica/estudiantes/`;
      const isSecretariaPrograma = user?.role === 'secretaria_programa' || userRole === 'secretaria_programa';
      
      if (isSecretariaPrograma && currentPrograma) {
        url += `?programa_id=${currentPrograma}`;
      }"""
new_search = """      let url = `${API_BASE}/api/mod-gestion-academica/estudiantes/`;
      
      // Filter if a specific program is selected, regardless of role
      if (currentPrograma && currentPrograma !== 'ALL') {
        url += `?programa_id=${currentPrograma}`;
      }"""
content = content.replace(old_search, new_search)

# 3. Update the select UI to be available for everyone and have an "ALL" option
old_select = """        {userRole === 'secretaria_programa' && (
          <select 
            className="input-field py-3 text-sm bg-slate-50 border-none w-48 font-bold text-primary"
            value={currentPrograma}
            onChange={(e) => {
              setCurrentPrograma(e.target.value);
            }}
          >
            <option value="1">Arquitectura de Plat.</option>
            <option value="2">Enfermería Técnica</option>
            <option value="3">Diseño Gráfico</option>
          </select>
        )}"""
new_select = """        <select 
          className="input-field py-3 text-sm bg-slate-50 border-none w-48 font-bold text-primary"
          value={currentPrograma}
          onChange={(e) => {
            setCurrentPrograma(e.target.value);
          }}
        >
          {['superadmin', 'admin'].includes(userRole) && <option value="ALL">Todos los Programas</option>}
          <option value="1">Arquitectura de Plat.</option>
          <option value="2">Enfermería Técnica</option>
          <option value="3">Diseño Gráfico</option>
          <option value="4">Administración</option>
          <option value="5">Contabilidad</option>
          <option value="6">Mecatrónica</option>
        </select>"""
content = content.replace(old_select, new_select)

# 4. Make sure useEffect correctly sets currentPrograma for secretaria
old_effect = """  useEffect(() => {
    if (userRole !== 'invitado') {
      handleSearch(searchTerm);
    }
  }, [currentPrograma, userRole]);"""
new_effect = """  useEffect(() => {
    if (userRole !== 'invitado') {
      if (userRole === 'secretaria_programa' && currentPrograma === 'ALL') {
        setCurrentPrograma('1'); // Force default program for secretaria
      } else {
        handleSearch(searchTerm);
      }
    }
  }, [currentPrograma, userRole]);"""
content = content.replace(old_effect, new_effect)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated StudentMaster.jsx")
