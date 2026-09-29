import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../core/auth/useAuth';
import { ReportCardFilters } from './ReportCardFilters';
import { ReportCardKpis } from './ReportCardKpis';
import { ReportCardTable } from './ReportCardTable';
import { BoletinLoading, BoletinEmpty, BoletinError } from './ReportCardStates';
import { SubjectDetailModal } from './SubjectDetailModal';
import { buildPrintHtml } from './reportCardUtils';
import { fetchPeriods, fetchStudents, fetchBoletin, resolveStudentId } from './reportCardApi';
import { rangoAprobatorio } from './mock/boletinMock';

const ACTIVO = ['ACTIVO', 'activo', 'matricula_abierta'];

function exportarPDF(boletin) {
  const html = buildPrintHtml(boletin, rangoAprobatorio);
  if (!html) return;
  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function BoletinView() {
  const { user } = useAuth();
  const userEmail = user?.email;

  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [boletin, setBoletin] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [materiaSel, setMateriaSel] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const [periodsRes, studentsRes] = await Promise.all([fetchPeriods(), fetchStudents()]);
        if (cancelled) return;

        setPeriods(periodsRes);
        setStudentId(resolveStudentId(studentsRes, { email: userEmail }));

        const activo = periodsRes.find((p) => ACTIVO.includes(String(p.estado).toLowerCase()));
        setPeriodId(activo ? activo.id : periodsRes[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const loadBoletin = useCallback(async () => {
    if (!studentId || !periodId) return;
    setLoading(true);
    setError(null);
    setMateriaSel(null);
    try {
      const data = await fetchBoletin(studentId, periodId);
      setBoletin(data);
    } catch (err) {
      setError(err.message);
      setBoletin(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, periodId]);

  useEffect(() => {
    loadBoletin();
  }, [loadBoletin]);

  const handlePeriodChange = (nextId) => {
    setBoletin(null);
    setPeriodId(nextId);
  };

  const periodoActual = periods.find((p) => p.id === periodId) || null;
  const puedeExportar = Boolean(boletin && boletin.materias && boletin.materias.length > 0);
  const sinDatos = !loading && !error && !boletin;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <ReportCardFilters
        estudiante={boletin?.estudiante}
        periodo={boletin?.periodo || periodoActual}
        periods={periods}
        periodId={periodId}
        onPeriodChange={handlePeriodChange}
        onExport={() => exportarPDF(boletin)}
        canExport={puedeExportar}
        estadoMatricula={boletin?.estado_matricula}
      />

      {loading && <BoletinLoading />}

      {!loading && error && (
        <BoletinError message={error} onRetry={loadBoletin} />
      )}

      {!loading && sinDatos && (
        <BoletinEmpty message="No existe un boletin registrado para este estudiante en el periodo seleccionado." />
      )}

      {!loading && boletin && (
        <>
          <ReportCardKpis kpis={boletin.kpis} />
          <ReportCardTable materias={boletin.materias} onSelectMateria={setMateriaSel} />
        </>
      )}

      {materiaSel && <SubjectDetailModal materia={materiaSel} onClose={() => setMateriaSel(null)} />}
    </div>
  );
}
