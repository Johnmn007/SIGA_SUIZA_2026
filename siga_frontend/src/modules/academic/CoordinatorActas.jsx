import React, { useState, useEffect } from 'react';
import { apiClient } from '../../core/api/client';
import { 
  FileCheck, Calendar, Clock, AlertTriangle, CheckCircle2, Lock, Unlock, 
  RefreshCw, Users, ShieldAlert, Check, X, Search, Filter, BookOpen
} from 'lucide-react';

export function CoordinatorActas({ programId, periodId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    cargas: [],
    unidades_sin_carga: 0,
    unidades_sin_programa: 0,
    total_matriculas_pendientes: 0
  });
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos', 'abiertas', 'cerradas', 'pendientes_notas'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Feedback
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modales
  const [modalMassiveDate, setModalMassiveDate] = useState(false);
  const [massiveDateValue, setMassiveDateValue] = useState('');
  
  const [modalIndividualDate, setModalIndividualDate] = useState(null); // carga object
  const [individualDateValue, setIndividualDateValue] = useState('');

  const [modalCloseActa, setModalCloseActa] = useState(null); // carga object
  const [closing, setClosing] = useState(false);

  const [modalReopenActa, setModalReopenActa] = useState(null); // carga object
  const [reopenMotivo, setReopenMotivo] = useState('');
  const [reopenNuevaFecha, setReopenNuevaFecha] = useState('');
  const [reopening, setReopening] = useState(false);

  const fetchActas = React.useCallback(async () => {
    if (!programId || !periodId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.request(`/api/mod-evaluacion/actas/periodo/${periodId}/programa/${programId}`);
      if (res) {
        setData({
          cargas: Array.isArray(res.cargas) ? res.cargas : [],
          unidades_sin_carga: res.unidades_sin_carga || 0,
          unidades_sin_programa: res.unidades_sin_programa || 0,
          total_matriculas_pendientes: res.total_matriculas_pendientes || 0
        });
      }
    } catch (err) {
      console.error('Error fetching actas de coordinación:', err);
      setErrorMessage(err.detail || err.message || 'Error al consultar estado de actas del programa');
    } finally {
      setLoading(false);
    }
  }, [programId, periodId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchActas();
  }, [fetchActas]);

  // Manejo de Fecha Límite Masiva
  const handleMassiveDateSubmit = async (e) => {
    e.preventDefault();
    if (!massiveDateValue) return;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiClient.request(`/api/mod-evaluacion/actas/programa/${programId}/periodo/${periodId}/fecha-limite`, {
        method: 'POST',
        body: JSON.stringify({ fecha_limite_notas: massiveDateValue })
      });
      setSuccessMessage('Fecha límite establecida masivamente para todas las actas del programa.');
      setModalMassiveDate(false);
      setMassiveDateValue('');
      await fetchActas();
    } catch (err) {
      setErrorMessage(err.detail || err.message || 'Error al fijar fecha límite masiva');
    } finally {
      setLoading(false);
    }
  };

  // Manejo de Fecha Límite Individual
  const handleIndividualDateSubmit = async (e) => {
    e.preventDefault();
    if (!modalIndividualDate || !individualDateValue) return;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiClient.request(`/api/mod-evaluacion/actas/carga/${modalIndividualDate.carga_id}/fecha-limite`, {
        method: 'PUT',
        body: JSON.stringify({ fecha_limite_notas: individualDateValue })
      });
      setSuccessMessage(`Fecha límite actualizada para ${modalIndividualDate.unidad}.`);
      setModalIndividualDate(null);
      setIndividualDateValue('');
      await fetchActas();
    } catch (err) {
      setErrorMessage(err.detail || err.message || 'Error al actualizar fecha límite');
    } finally {
      setLoading(false);
    }
  };

  // Manejo de Cierre Formal de Acta
  const handleCloseActaSubmit = async () => {
    if (!modalCloseActa) return;
    setClosing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await apiClient.request(`/api/mod-evaluacion/actas/carga/${modalCloseActa.carga_id}/cerrar`, {
        method: 'POST'
      });
      setSuccessMessage(`Acta de ${modalCloseActa.unidad} cerrada formalmente. Total calificados: ${res.total_calificados || modalCloseActa.evaluados}.`);
      setModalCloseActa(null);
      await fetchActas();
    } catch (err) {
      setErrorMessage(err.detail || err.message || 'No se pudo cerrar el acta');
    } finally {
      setClosing(false);
    }
  };

  // Manejo de Reapertura Excepcional de Acta
  const handleReopenActaSubmit = async (e) => {
    e.preventDefault();
    if (!modalReopenActa) return;
    if (!reopenMotivo || reopenMotivo.trim().length < 10) {
      setErrorMessage('El motivo de reapertura debe tener al menos 10 caracteres.');
      return;
    }
    if (!reopenNuevaFecha) {
      setErrorMessage('Debe indicar la nueva fecha límite de calificación.');
      return;
    }
    setReopening(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiClient.request(`/api/mod-evaluacion/actas/carga/${modalReopenActa.carga_id}/reabrir`, {
        method: 'POST',
        body: JSON.stringify({
          motivo: reopenMotivo.trim(),
          nueva_fecha_limite: reopenNuevaFecha
        })
      });
      setSuccessMessage(`Acta de ${modalReopenActa.unidad} reabierta excepcionalmente hasta el ${reopenNuevaFecha}.`);
      setModalReopenActa(null);
      setReopenMotivo('');
      setReopenNuevaFecha('');
      await fetchActas();
    } catch (err) {
      setErrorMessage(err.detail || err.message || 'No se pudo reabrir el acta');
    } finally {
      setReopening(false);
    }
  };

  // Filtrado de cargas
  const filteredCargas = data.cargas.filter(carga => {
    const matchesSearch = 
      (carga.unidad && carga.unidad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (carga.docente && carga.docente.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filterStatus === 'cerradas') return carga.acta_cerrada;
    if (filterStatus === 'abiertas') return !carga.acta_cerrada;
    if (filterStatus === 'pendientes_notas') return !carga.acta_cerrada && carga.faltantes > 0;
    return true;
  });

  const totalCargas = data.cargas.length;
  const cerradasCount = data.cargas.filter(c => c.acta_cerrada).length;
  const abiertasCount = totalCargas - cerradasCount;
  const conNotasFaltantes = data.cargas.filter(c => !c.acta_cerrada && c.faltantes > 0).length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="panel-control-actas">
      {/* Banner de Mensajes */}
      {successMessage && (
        <div data-testid="actas-success-alert" className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div data-testid="actas-error-alert" className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas de Resumen Ejecutivo / Métricas Semáforo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Actas</span>
            <BookOpen size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCargas}</p>
          <span className="text-[11px] text-slate-400">Asignaciones lectivas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cerradas</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{cerradasCount}</p>
          <span className="text-[11px] text-emerald-600/80">{totalCargas > 0 ? Math.round((cerradasCount / totalCargas) * 100) : 0}% concluidas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">En Proceso</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{abiertasCount}</p>
          <span className="text-[11px] text-blue-600/80">Actas abiertas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Notas Pendientes</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{conNotasFaltantes}</p>
          <span className="text-[11px] text-amber-600/80">Cargas con faltantes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sin Docente</span>
            <ShieldAlert size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-700">{data.unidades_sin_carga}</p>
          <span className="text-[11px] text-rose-600/80">Unidades huérfanas</span>
        </div>
      </div>

      {/* Barra de Acciones y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por curso o docente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${filterStatus === 'todos' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Todos ({totalCargas})
            </button>
            <button
              onClick={() => setFilterStatus('abiertas')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${filterStatus === 'abiertas' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Abiertas ({abiertasCount})
            </button>
            <button
              onClick={() => setFilterStatus('cerradas')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${filterStatus === 'cerradas' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Cerradas ({cerradasCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalMassiveDate(true)}
            data-testid="btn-fecha-limite-masiva"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 shadow-sm transition-all cursor-pointer"
          >
            <Calendar size={14} />
            <span>Fijar Plazo Masivo</span>
          </button>

          <button
            onClick={fetchActas}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            title="Recargar datos"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabla de Actas de Carga Lectiva */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="tabla-actas-coordinacion">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Unidad Didáctica</th>
                <th className="py-3 px-4">Docente Asignado</th>
                <th className="py-3 px-4 text-center">Sec / Turno</th>
                <th className="py-3 px-4 text-center">Avance Notas</th>
                <th className="py-3 px-4 text-center">Fecha Límite</th>
                <th className="py-3 px-4 text-center">Estado Acta</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && filteredCargas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Cargando actas del programa...
                  </td>
                </tr>
              ) : filteredCargas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No se encontraron actas con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCargas.map(carga => {
                  const tieneFaltantes = carga.faltantes > 0;
                  
                  return (
                    <tr key={carga.carga_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <span>{carga.unidad}</span>
                        {carga.ciclo && <span className="ml-2 text-[10px] text-slate-400 font-normal">Ciclo {carga.ciclo}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {carga.docente || <span className="text-rose-500 italic">Sin docente</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                        {carga.seccion || 'A'} · {carga.turno || 'M'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-semibold ${tieneFaltantes ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {carga.evaluados} / {carga.total_matriculas}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tieneFaltantes ? `${carga.faltantes} faltante(s)` : 'Completo'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {carga.fecha_limite_notas ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Calendar size={12} className="text-slate-400" />
                            {carga.fecha_limite_notas}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sin plazo</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {carga.acta_cerrada ? (
                          <span data-testid={`estado-cerrada-${carga.carga_id}`} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Lock size={11} /> Cerrada
                          </span>
                        ) : (
                          <span data-testid={`estado-abierta-${carga.carga_id}`} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Unlock size={11} /> Abierta
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Modificar Fecha Límite */}
                          <button
                            onClick={() => {
                              setModalIndividualDate(carga);
                              setIndividualDateValue(carga.fecha_limite_notas || '');
                            }}
                            className="p-1.5 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                            title="Fijar fecha límite"
                            data-testid={`btn-fecha-${carga.carga_id}`}
                          >
                            <Calendar size={14} />
                          </button>

                          {/* Cierre o Reapertura */}
                          {!carga.acta_cerrada ? (
                            <button
                              onClick={() => setModalCloseActa(carga)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Cerrar formalmente el acta"
                              data-testid={`btn-cerrar-${carga.carga_id}`}
                            >
                              <Lock size={12} />
                              <span>Cerrar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setModalReopenActa(carga);
                                setReopenMotivo('');
                                setReopenNuevaFecha(new Date().toISOString().split('T')[0]);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              title="Reapertura excepcional"
                              data-testid={`btn-reabrir-${carga.carga_id}`}
                            >
                              <Unlock size={12} />
                              <span>Reabrir</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Fecha Límite Masiva */}
      {modalMassiveDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                Fijar Fecha Límite Masiva
              </h3>
              <button onClick={() => setModalMassiveDate(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Esta fecha se aplicará como límite máximo de ingreso de calificaciones para <strong>todas las actas abiertas</strong> del programa.
            </p>
            <form onSubmit={handleMassiveDateSubmit} className="space-y-4">
              <div>
                <label htmlFor="massiveDateInput" className="block text-xs font-semibold text-slate-700 mb-1">Nueva Fecha Límite</label>
                <input 
                  id="massiveDateInput"
                  type="date"
                  value={massiveDateValue}
                  onChange={(e) => setMassiveDateValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMassiveDate(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !massiveDateValue}
                  className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/95 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Aplicar a Todas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Fecha Límite Individual */}
      {modalIndividualDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                Fecha Límite Individual
              </h3>
              <button onClick={() => setModalIndividualDate(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Ajustar plazo de notas para: <strong>{modalIndividualDate.unidad}</strong>
            </p>
            <form onSubmit={handleIndividualDateSubmit} className="space-y-4">
              <div>
                <label htmlFor="individualDateInput" className="block text-xs font-semibold text-slate-700 mb-1">Fecha Límite de Notas</label>
                <input 
                  id="individualDateInput"
                  type="date"
                  value={individualDateValue}
                  onChange={(e) => setIndividualDateValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalIndividualDate(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !individualDateValue}
                  className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/95 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Plazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmación Preventiva de Cierre Formal de Acta */}
      {modalCloseActa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">¿Cerrar Acta Formalmente?</h3>
                <p className="text-[11px] text-slate-500">Acción crítica institucional</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Está a punto de cerrar el acta oficial de la unidad <strong>{modalCloseActa.unidad}</strong> a cargo del docente <strong>{modalCloseActa.docente}</strong>.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Estudiantes Evaluados:</span>
                  <span className="font-bold text-slate-900">{modalCloseActa.evaluados}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estudiantes Faltantes:</span>
                  <span className={`font-bold ${modalCloseActa.faltantes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {modalCloseActa.faltantes}
                  </span>
                </div>
              </div>
              {modalCloseActa.faltantes > 0 && (
                <p className="text-rose-700 font-semibold text-[11px] bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  ⚠️ Atención: Existen {modalCloseActa.faltantes} estudiantes sin nota registrada. El cierre solo debe ejecutarse si la nómina está completa.
                </p>
              )}
              <p className="text-slate-500 text-[11px]">
                Una vez cerrada, el docente ya no podrá editar calificaciones sin autorización formal de Coordinación.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalCloseActa(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCloseActaSubmit}
                disabled={closing || modalCloseActa.faltantes > 0}
                className="px-4 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {closing ? 'Cerrando...' : 'Confirmar Cierre de Acta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Reapertura Excepcional de Acta */}
      {modalReopenActa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 pb-3 border-b border-slate-100">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Unlock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Reapertura Excepcional de Acta</h3>
                <p className="text-[11px] text-slate-500">{modalReopenActa.unidad}</p>
              </div>
            </div>

            <form onSubmit={handleReopenActaSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo Justificado (mínimo 10 caracteres) *
                </label>
                <textarea
                  rows={3}
                  value={reopenMotivo}
                  onChange={(e) => setReopenMotivo(e.target.value)}
                  placeholder="Ej: Rectificación de nota autorizada según Solicitud N° 124/2026..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                />
                <span className="text-[10px] text-slate-400">
                  {reopenMotivo.trim().length} / 10 caracteres mínimos
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva Fecha Límite de Notas *
                </label>
                <input
                  type="date"
                  value={reopenNuevaFecha}
                  onChange={(e) => setReopenNuevaFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalReopenActa(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reopening || reopenMotivo.trim().length < 10 || !reopenNuevaFecha}
                  className="px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50"
                >
                  {reopening ? 'Reabriendo...' : 'Reabrir Acta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
