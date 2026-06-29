import { useState, useEffect } from 'react';
import { API_BASE } from '../../core/api/client';

export function StudentReportCard() {
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('1'); // Mock: Asumimos estudiante con ID 1
  const [period, setPeriod] = useState('2026-I');
  
  const [studentInfo, setStudentInfo] = useState(null);
  const [grades, setGrades] = useState([]);

  useEffect(() => {
    const fetchReportCard = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 1. Obtener info del estudiante
        const estRes = await fetch(`${API_BASE}/api/mod-gestion-academica/estudiantes/${studentId}`, { headers });
        if (estRes.ok) {
          setStudentInfo(await estRes.json());
        }
        
        // 2. Obtener las notas consolidadas (Aún no hay endpoint para esto, lo simularemos cruzando matrículas y notas)
        // Obtener matrículas del estudiante
        const matRes = await fetch(`${API_BASE}/api/mod-gestion-academica/matriculas/estudiante/${studentId}`, { headers });
        let enrolledUnits = [];
        if (matRes.ok) {
          const matriculas = await matRes.json();
          // Filtrar por periodo activo (esto requeriría join con Periodo en backend real, aquí filtramos mock)
          // Asumimos que la primera matrícula es la actual
          if (matriculas.length > 0) {
            enrolledUnits = matriculas[0].detalles || [];
          }
        }
        
        // Para cada unidad matriculada, intentar buscar su nota (Simulación de lo que haría un endpoint de consolidado)
        // En producción el backend mod-evaluacion debería tener: GET /registros/estudiante/{id}/periodo/{periodo_id}
        const consolidatedGrades = [];
        
        for (const det of enrolledUnits) {
          const unitId = det.unidad_didactica_id;
          // Esto es ineficiente, pero sirve como mock hasta crear el endpoint consolidado
          const gRes = await fetch(`${API_BASE}/api/mod-evaluacion/registros/unidad/${unitId}/periodo/1`, { headers });
          if (gRes.ok) {
            const allGrades = await gRes.json();
            const myGrade = allGrades.find(g => g.estudiante_id === parseInt(studentId));
            
            consolidatedGrades.push({
              unidad_id: unitId,
              nombre: `Unidad Didáctica ${unitId}`, // En prod vendría del join con mod-programas-estudio
              creditos: det.creditos,
              c1: myGrade?.nota_c1 ?? '-',
              c2: myGrade?.nota_c2 ?? '-',
              c3: myGrade?.nota_c3 ?? '-'
            });
          }
        }
        
        setGrades(consolidatedGrades);
        
      } catch (error) {
        console.error("Error fetching report card:", error);
      }
      setLoading(false);
    };
    
    fetchReportCard();
  }, [studentId]);
  
  const calculateAverage = (g) => {
    const vals = [g.c1, g.c2, g.c3].filter(v => v !== '-' && v !== null);
    if (vals.length === 0) return '-';
    return Math.round(vals.reduce((a, b) => a + parseInt(b), 0) / vals.length);
  };
  
  const getGradeColor = (val) => {
    if (val === '-' || val === null) return 'text-slate-500';
    const num = parseInt(val);
    return num >= 13 ? 'text-blue-600 font-bold' : 'text-red-600 font-bold';
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h3 className="text-4xl font-extrabold tracking-tight text-slate-800 mb-2">
          Boletín de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Notas</span>
        </h3>
        <p className="text-slate-500 font-medium">Periodo Académico {period}</p>
      </div>

      {studentInfo && (
        <div className="glass-card p-6 mb-8 border-l-4 border-l-primary flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-4xl shadow-inner border-2 border-white">
            🎓
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">{studentInfo.apellidos}, {studentInfo.nombres}</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Código</p>
                <p className="font-semibold text-slate-700">{studentInfo.codigo_estudiante}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">DNI</p>
                <p className="font-semibold text-slate-700">{studentInfo.dni}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center min-w-[120px] shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Estado</p>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
              Regular
            </span>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h4 className="font-bold flex items-center text-lg">
            <span className="mr-2">📊</span> Resumen Académico
          </h4>
        </div>
        
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500">Generando boletín...</p>
          </div>
        ) : grades.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl opacity-40 mb-4">📄</div>
            <p className="text-slate-500 font-medium text-lg">No se encontraron calificaciones para este periodo.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-4 px-6 font-bold text-slate-500 uppercase text-xs tracking-wider">Unidad Didáctica</th>
                <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Créditos</th>
                <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 1</th>
                <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 2</th>
                <th className="py-4 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-center">Cap. 3</th>
                <th className="py-4 px-6 font-extrabold text-slate-800 uppercase text-xs tracking-wider text-center bg-slate-100/50">Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grades.map((g, idx) => {
                const avg = calculateAverage(g);
                return (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-700">{g.nombre}</td>
                    <td className="py-4 px-4 text-center font-medium text-slate-500">{g.creditos}</td>
                    <td className={`py-4 px-4 text-center text-lg ${getGradeColor(g.c1)}`}>{g.c1}</td>
                    <td className={`py-4 px-4 text-center text-lg ${getGradeColor(g.c2)}`}>{g.c2}</td>
                    <td className={`py-4 px-4 text-center text-lg ${getGradeColor(g.c3)}`}>{g.c3}</td>
                    <td className={`py-4 px-6 text-center text-2xl bg-slate-50/50 ${getGradeColor(avg)}`}>
                      {avg}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
