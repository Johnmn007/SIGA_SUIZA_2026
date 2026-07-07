import re

file_path = "D:/SIGA/siga_frontend/src/modules/enrollment/EnrollmentDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { API_BASE } from '../../core/api/client';",
    "import { API_BASE } from '../../core/api/client';\nimport { useAuth } from '../../core/auth/useAuth';"
)

# 2. Add useAuth and new states
state_block_old = """export function EnrollmentDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'process'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);"""

state_block_new = """export function EnrollmentDashboard() {
  const { user } = useAuth();
  const userRole = user?.is_superuser ? 'superadmin' : (user?.role || 'invitado');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'process'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPrograma, setCurrentPrograma] = useState('ALL');
"""
content = content.replace(state_block_old, state_block_new)

# 3. Update fetchStudents
fetch_old = """  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);"""

fetch_new = """  const fetchStudents = async (searchVal = searchTerm) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/mod-gestion-academica/estudiantes/`;
      if (currentPrograma && currentPrograma !== 'ALL') {
        url += `?programa_id=${currentPrograma}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      let finalData = Array.isArray(data) ? data : [];
      if (searchVal.length >= 3) {
        finalData = finalData.filter(s => 
          (s.dni && s.dni.includes(searchVal)) || 
          (s.nombres && s.nombres.toLowerCase().includes(searchVal.toLowerCase())) || 
          (s.apellidos && s.apellidos.toLowerCase().includes(searchVal.toLowerCase())) || 
          (s.codigo_estudiante && s.codigo_estudiante.includes(searchVal))
        );
      }
      setStudents(finalData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole !== 'invitado') {
      if (userRole === 'secretaria_programa' && currentPrograma === 'ALL') {
        setCurrentPrograma('1');
      } else {
        fetchStudents();
      }
    }
  }, [currentPrograma, userRole]);"""
content = content.replace(fetch_old, fetch_new)

# 4. Add UI elements for filter and search
header_old = """      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Matrícula Académica</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Control de procesos de matrícula para estudiantes registrados</p>
        </div>
      </div>"""

header_new = """      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Matrícula Académica</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Control de procesos de matrícula para estudiantes registrados</p>
        </div>
      </div>

      <div className="glass-card p-2 mb-8 flex items-center max-w-3xl gap-2">
        <select 
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
        </select>
        <span className="px-4 text-slate-400 text-xl">🔍</span>
        <input 
          type="text" 
          className="w-full bg-transparent border-none focus:ring-0 py-3 text-slate-700 placeholder-slate-400 outline-none"
          placeholder="Buscar por DNI, Nombre o Código..."
          value={searchTerm} 
          onChange={(e) => {
            setSearchTerm(e.target.value);
            fetchStudents(e.target.value);
          }}
        />
        {loading && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-4"></div>}
      </div>"""
content = content.replace(header_old, header_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated EnrollmentDashboard.jsx")
