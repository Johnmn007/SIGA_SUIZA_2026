import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';
import { EnrollmentProcess } from './EnrollmentProcess';

export function EnrollmentDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'process'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    codigo_estudiante: '',
    dni: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: ''
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/mod-matricula/estudiantes`, {
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
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/mod-matricula/estudiantes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newStudent)
      });
      if (response.ok) {
        setShowModal(false);
        setNewStudent({ codigo_estudiante: '', dni: '', nombres: '', apellidos: '', email: '', telefono: '' });
        fetchStudents();
      }
    } catch (error) {
      console.error('Error registering student:', error);
    }
  };

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
          <h3 className="text-3xl font-bold tracking-tight text-slate-800">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Estudiantes y Matrícula</span>
          </h3>
          <p className="text-slate-500 text-sm mt-1">Control de ingresos, registros académicos y procesos de matrícula</p>
        </div>
        <button 
          className="btn-primary flex items-center space-x-2 shadow-glow"
          onClick={() => setShowModal(true)}
        >
          <span className="text-xl leading-none">+</span>
          <span>Registrar Estudiante</span>
        </button>
      </div>

      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estudiante</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">DNI</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
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
                    <div className="text-4xl mb-3 opacity-50">🎓</div>
                    <p className="text-slate-500 font-medium">No hay estudiantes registrados.</p>
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-700">{student.codigo_estudiante}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{student.nombres} {student.apellidos}</td>
                    <td className="py-3 px-4 text-slate-600">{student.dni}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{student.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded border border-green-200">
                        {student.estado}
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

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg overflow-hidden bg-white/95 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h5 className="font-bold text-xl text-slate-800 tracking-tight">Nuevo Estudiante</h5>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleRegister}>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label uppercase tracking-wider text-xs">CÓDIGO ESTUDIANTE</label>
                    <input 
                      type="text" className="input-field" 
                      value={newStudent.codigo_estudiante} onChange={e => setNewStudent({...newStudent, codigo_estudiante: e.target.value})}
                      required 
                    />
                  </div>
                  <div>
                    <label className="label uppercase tracking-wider text-xs">DNI / DOCUMENTO</label>
                    <input 
                      type="text" className="input-field" 
                      value={newStudent.dni} onChange={e => setNewStudent({...newStudent, dni: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label uppercase tracking-wider text-xs">NOMBRES</label>
                    <input 
                      type="text" className="input-field" 
                      value={newStudent.nombres} onChange={e => setNewStudent({...newStudent, nombres: e.target.value})}
                      required 
                    />
                  </div>
                  <div>
                    <label className="label uppercase tracking-wider text-xs">APELLIDOS</label>
                    <input 
                      type="text" className="input-field" 
                      value={newStudent.apellidos} onChange={e => setNewStudent({...newStudent, apellidos: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="label uppercase tracking-wider text-xs">EMAIL INSTITUCIONAL</label>
                  <input 
                    type="email" className="input-field" 
                    value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
                <button type="button" className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary px-6">Registrar Estudiante</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
