import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';
import { useAuth } from '../../core/auth/useAuth';
import { EnrollmentProcess } from './EnrollmentProcess';
import ExtraordinaryEnrollmentModal from './ExtraordinaryEnrollmentModal';
import { Search, UserPlus, GraduationCap } from 'lucide-react';

export function EnrollmentDashboard() {
  const { user } = useAuth();
  const userRoles = user?.roles ? user.roles.map(r => typeof r === 'string' ? r : r.nombre || r.name) : [];
  const primaryRole = user?.is_superuser ? 'superadmin' : (userRoles.length > 0 ? userRoles[0] : (user?.role || 'invitado'));
  const userRole = primaryRole;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' or 'process'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPrograma, setCurrentPrograma] = useState('ALL');


  const fetchStudents = async (searchVal = searchTerm) => {
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
        const fallbackId = user?.email === 'secretaria_prog@siga.edu' ? '2' : '1';
        setCurrentPrograma(user?.programa_id ? String(user.programa_id) : fallbackId);
      } else {
        fetchStudents();
      }
    }
  }, [currentPrograma, userRole]);

  const handleEnrollClick = (student) => {
    setSelectedStudent(student);
    setView('process');
  };

  if (view === 'process') {
    return (
      <EnrollmentProcess 
        initialStudent={selectedStudent} 
        onCancel={() => {
          setView('list');
          setSelectedStudent(null);
          fetchStudents(); // Refrescar en caso de matrícula exitosa
        }} 
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-slate-text">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Matrícula Académica</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Control de procesos de matrícula para estudiantes registrados</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <UserPlus size={18} />
          Matrícula Extraordinaria
        </button>
      </div>

      <div className="glass-card p-2 mb-8 flex items-center max-w-3xl gap-2">
        {['superadmin', 'admin'].includes(userRole) && (
          <select 
            className="input-field py-3 text-sm bg-slate-50 border-none w-48 font-bold text-primary"
            value={currentPrograma}
            onChange={(e) => {
              setCurrentPrograma(e.target.value);
            }}
          >
            <option value="ALL">Todos los Programas</option>
            <option value="1">Arquitectura de Plat.</option>
            <option value="2">Enfermería Técnica</option>
            <option value="3">Diseño Gráfico</option>
            <option value="4">Administración</option>
            <option value="5">Contabilidad</option>
            <option value="6">Mecatrónica</option>
          </select>
        )}
        <Search size={20} className="text-slate-400 ml-4" />
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
      </div>

      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-[12%]">Código</th>
                <th className="w-[35%]">Estudiante</th>
                <th className="w-[13%]">DNI</th>
                <th className="w-[15%]">Email</th>
                <th className="w-[10%]">Estado</th>
                <th className="text-right w-[15%]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-slate-500 font-medium">Cargando estudiantes...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                      <GraduationCap size={30} />
                    </div>
                    <p className="text-slate-500 font-medium">No hay estudiantes registrados.</p>
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className="hover:bg-primary/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">{student.codigo_estudiante}</td>
                    <td className="py-3 px-4 text-slate-text font-medium">{student.nombres} {student.apellidos}</td>
                    <td className="py-3 px-4 text-slate-600">{student.dni}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm truncate max-w-[150px]" title={student.email_personal}>{student.email_personal || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="badge badge-green">
                        {student.estado_academico}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        className="px-4 py-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                        onClick={() => handleEnrollClick(student)}
                      >
                        Matricular
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <ExtraordinaryEnrollmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPrograma={currentPrograma}
        userRole={userRole}
        onSuccess={(student) => {
          handleEnrollClick(student);
        }}
      />
    </div>
  );
}
