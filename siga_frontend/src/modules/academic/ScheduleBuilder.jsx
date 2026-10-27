import React, { useState } from 'react';
import { BookOpen, AlertTriangle, Save, RefreshCw } from 'lucide-react';

// Horarios específicos para Desarrollo de Sistemas de Información (Turno Tarde/Noche)
const TIME_SLOTS = [
  { id: 'h1', start: '14:15', end: '15:00', type: 'clase', index: 1 },
  { id: 'h2', start: '15:00', end: '15:45', type: 'clase', index: 2 },
  { id: 'h3', start: '15:45', end: '16:30', type: 'clase', index: 3 },
  { id: 'h4', start: '16:30', end: '17:15', type: 'clase', index: 4 },
  { id: 'h5', start: '17:15', end: '18:00', type: 'clase', index: 5 },
  { id: 'rec', start: '18:00', end: '18:20', type: 'recreo', label: 'RECREO' },
  { id: 'h6', start: '18:20', end: '19:05', type: 'clase', index: 6 },
  { id: 'h7', start: '19:05', end: '19:50', type: 'clase', index: 7 },
];

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export function ScheduleBuilder({ cargaLectiva, getUDName, getDocenteName }) {
  // Estado para el horario: key = "Dia-SlotId", value = carga_lectiva_id
  const [schedule, setSchedule] = useState({});
  const [draggedCargaId, setDraggedCargaId] = useState(null);
  const [warnings, setWarnings] = useState([]);

  // Validación básica de cruces (Si el mismo docente enseña en la misma hora)
  const validateSchedule = (newSchedule) => {
    const newWarnings = [];
    const timeMap = {}; // { timeId: [docente_id] }

    Object.entries(newSchedule).forEach(([key, cargaId]) => {
      const [day, timeId] = key.split('-');
      const carga = cargaLectiva.find(c => c.id === parseInt(cargaId));
      if (!carga) return;

      const slotKey = `${day}-${timeId}`;
      if (!timeMap[slotKey]) timeMap[slotKey] = [];
      
      if (timeMap[slotKey].includes(carga.docente_id)) {
        newWarnings.push(`Cruce detectado: El docente ${getDocenteName(carga.docente_id)} está asignado doble en ${day} a las ${TIME_SLOTS.find(t=>t.id === timeId)?.start}.`);
      } else {
        timeMap[slotKey].push(carga.docente_id);
      }
    });

    setWarnings(newWarnings);
  };

  const handleDragStart = (e, cargaId) => {
    e.dataTransfer.setData('cargaId', cargaId);
    setDraggedCargaId(cargaId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necesario para permitir el Drop
  };

  const handleDrop = (e, day, timeId) => {
    e.preventDefault();
    const cargaId = e.dataTransfer.getData('cargaId');
    if (!cargaId) return;

    const cellKey = `${day}-${timeId}`;
    const newSchedule = { ...schedule, [cellKey]: parseInt(cargaId) };
    setSchedule(newSchedule);
    validateSchedule(newSchedule);
    setDraggedCargaId(null);
  };

  const handleRemoveCell = (day, timeId) => {
    const cellKey = `${day}-${timeId}`;
    const newSchedule = { ...schedule };
    delete newSchedule[cellKey];
    setSchedule(newSchedule);
    validateSchedule(newSchedule);
  };

  const handleClear = () => {
    if(window.confirm("¿Limpiar todo el horario?")) {
      setSchedule({});
      setWarnings([]);
    }
  };

  const handleSave = () => {
    alert("Horario guardado temporalmente. (Función MVP: En un futuro se enlazará para guardarse en la BD).");
  };

  const getAssignedCount = (cargaId) => {
    return Object.values(schedule).filter(id => id === cargaId).length;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      
      {/* Panel Izquierdo: Tarjetas de Carga Lectiva Disponibles */}
      <div className="xl:w-1/4 flex-shrink-0">
        <div className="glass-card p-4 h-full border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={16} className="text-primary"/> Cursos Asignados
          </h4>
          <p className="text-xs text-slate-500 mb-4">Arrastra las tarjetas hacia la cuadrícula de la derecha.</p>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {cargaLectiva.length === 0 && <p className="text-sm italic text-slate-400">No hay carga lectiva creada.</p>}
            
            {cargaLectiva.map(carga => {
              const assigned = getAssignedCount(carga.id);
              return (
                <div 
                  key={carga.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, carga.id)}
                  onDragEnd={() => setDraggedCargaId(null)}
                  className={`p-3 rounded-xl border cursor-grab active:cursor-grabbing hover:shadow-md transition-all
                    ${draggedCargaId === carga.id ? 'opacity-50 ring-2 ring-primary border-primary' : 'bg-white border-slate-200'}
                  `}
                >
                  <div className="text-xs font-bold text-slate-800 leading-tight mb-1">{getUDName(carga.unidad_didactica_id)}</div>
                  <div className="text-[10px] text-slate-500">{getDocenteName(carga.docente_id)}</div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="badge-slate text-[9px]">Sec {carga.seccion}</span>
                    <span className="text-[10px] font-semibold text-primary">{assigned} horas puestas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel Derecho: Cuadrícula del Horario */}
      <div className="xl:w-3/4 flex-grow overflow-x-auto">
        <div className="glass-card p-4 border border-slate-200 min-w-[800px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Cuadrícula de Horarios (Turno D.S.I)</h3>
              <p className="text-sm text-slate-500">Haz clic en una celda ocupada para removerla.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleClear} className="btn-ghost flex items-center gap-1.5 py-1.5"><RefreshCw size={14}/> Limpiar</button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-1.5 py-1.5"><Save size={14}/> Guardar</button>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <div className="flex items-center text-red-600 font-bold text-sm mb-1">
                <AlertTriangle size={16} className="mr-1.5"/> Advertencia de Cruce
              </div>
              {warnings.map((w, i) => <p key={i} className="text-xs text-red-600">{w}</p>)}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th className="border-b border-r border-slate-200 p-3 text-center w-24">Hora</th>
                  {DAYS.map(day => (
                    <th key={day} className="border-b border-r border-slate-200 p-3 text-center w-1/5">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot, index) => (
                  <tr key={slot.id} className={slot.type === 'recreo' ? 'bg-amber-50' : 'bg-white'}>
                    <td className="border-b border-r border-slate-200 p-2 text-center align-middle font-medium text-xs text-slate-500 bg-slate-50/50">
                      <div>{slot.start}</div>
                      <div className="text-[10px] opacity-70">a {slot.end}</div>
                    </td>
                    
                    {slot.type === 'recreo' ? (
                      <td colSpan={5} className="border-b border-slate-200 p-2 text-center text-amber-700/60 font-black tracking-widest text-xs">
                        {slot.label}
                      </td>
                    ) : (
                      DAYS.map(day => {
                        const cellKey = `${day}-${slot.id}`;
                        const cellCargaId = schedule[cellKey];
                        const cellCarga = cellCargaId ? cargaLectiva.find(c => c.id === cellCargaId) : null;
                        
                        return (
                          <td 
                            key={`${day}-${slot.id}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day, slot.id)}
                            className={`border-b border-r border-slate-200 p-1.5 h-16 relative transition-colors
                              ${!cellCargaId && draggedCargaId ? 'hover:bg-primary-soft/30 bg-slate-50 border-dashed' : ''}
                            `}
                          >
                            {cellCarga ? (
                              <div 
                                onClick={() => handleRemoveCell(day, slot.id)}
                                className="absolute inset-1 bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-lg p-1.5 cursor-pointer hover:border-red-300 hover:bg-red-50 group flex flex-col justify-center overflow-hidden"
                                title="Clic para remover"
                              >
                                <div className="text-[10px] font-bold text-indigo-900 leading-tight truncate group-hover:text-red-700">{getUDName(cellCarga.unidad_didactica_id)}</div>
                                <div className="text-[9px] text-indigo-600 truncate group-hover:text-red-600">{getDocenteName(cellCarga.docente_id)}</div>
                              </div>
                            ) : (
                              <div className="w-full h-full border-2 border-transparent border-dashed rounded-lg flex items-center justify-center text-slate-300/50 text-[10px]">
                                {draggedCargaId ? 'soltar' : ''}
                              </div>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
