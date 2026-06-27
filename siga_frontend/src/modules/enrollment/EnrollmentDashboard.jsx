import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';

export function EnrollmentDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-0">Gestión de <span className="gradient-text">Estudiantes y Matrícula</span></h3>
          <p className="text-secondary">Control de ingresos, registros académicos y procesos de matrícula</p>
        </div>
        <button className="btn-premium" onClick={() => setShowModal(true)}>
          + Registrar Estudiante
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="text-secondary small text-uppercase">
              <tr>
                <th>Código</th>
                <th>Estudiante</th>
                <th>DNI</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-4">Cargando datos...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-4">No hay estudiantes registrados.</td></tr>
              ) : (
                students.map(student => (
                  <tr key={student.id}>
                    <td><span className="fw-bold">{student.codigo_estudiante}</span></td>
                    <td>{student.nombres} {student.apellidos}</td>
                    <td>{student.dni}</td>
                    <td className="small">{student.email}</td>
                    <td><span className="status-badge badge-healthy">{student.estado}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary rounded-pill px-3">Matricular</button>
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
        <div className="modal fade show d-block" style={{background: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-card border-0 p-2">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Nuevo Estudiante</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleRegister}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-secondary fw-bold">CÓDIGO ESTUDIANTE</label>
                      <input 
                        type="text" className="form-control" 
                        value={newStudent.codigo_estudiante} onChange={e => setNewStudent({...newStudent, codigo_estudiante: e.target.value})}
                        required 
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-secondary fw-bold">DNI / DOCUMENTO</label>
                      <input 
                        type="text" className="form-control" 
                        value={newStudent.dni} onChange={e => setNewStudent({...newStudent, dni: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-secondary fw-bold">NOMBRES</label>
                      <input 
                        type="text" className="form-control" 
                        value={newStudent.nombres} onChange={e => setNewStudent({...newStudent, nombres: e.target.value})}
                        required 
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label small text-secondary fw-bold">APELLIDOS</label>
                      <input 
                        type="text" className="form-control" 
                        value={newStudent.apellidos} onChange={e => setNewStudent({...newStudent, apellidos: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small text-secondary fw-bold">EMAIL INSTITUCIONAL</label>
                    <input 
                      type="email" className="form-control" 
                      value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-premium">Registrar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
