const sufijoCiclo = (titulo) => String(titulo || '').replace(/^CICLO\s*/i, '').trim();

export function BoletinImpresion({
  estudiante = {},
  ciclos = [],
  promedioGeneral,
  ciclosCompletados,
  ciclosTotales,
  codigoVerificacion,
}) {
  const lista = Array.isArray(ciclos) ? ciclos : [];
  const unidadesTotales = lista.reduce(
    (s, c) => s + (Array.isArray(c.unidades) ? c.unidades.length : 0),
    0
  );
  const clsGrid = lista.length > 6 ? 'bp-grid bp-grid-3' : 'bp-grid';
  const clsDenso = lista.length > 8 || unidadesTotales > 36 ? ' bp-dense' : '';

  const rangoCiclos = lista.length === 0
    ? 'Historial académico'
    : lista.length === 1
      ? `Ciclo ${sufijoCiclo(lista[0].titulo)}`
      : `Historial académico • ${sufijoCiclo(lista[0].titulo)} al ${sufijoCiclo(lista[lista.length - 1].titulo)} ciclo`;

  const nombreEstudiante =
    [estudiante.apellidos, estudiante.nombres].filter(Boolean).join(', ') || '—';

  return (
    <div className={`print-only boletin-print${clsDenso}`}>
      <div className="bp-top">
        <div className="bp-deco">
          <span className="bp-d-navy"></span>
          <span className="bp-d-teal"></span>
        </div>
        <p className="bp-inst">Instituto de Educación Superior Tecnológico</p>
        <div className="bp-deco bp-deco--mirror">
          <span className="bp-d-navy"></span>
          <span className="bp-d-teal"></span>
        </div>
      </div>

      <div className="bp-title">
        <h2>Boletín de Notas</h2>
        <p>{rangoCiclos}</p>
      </div>

      <div className="bp-info">
        <div><b>Estudiante:</b><span>{nombreEstudiante}</span></div>
        <div><b>Programa:</b><span>{estudiante.programa_nombre || '—'}</span></div>
        <div><b>Código:</b><span>{estudiante.codigo_estudiante || '—'}</span></div>
      </div>

      {lista.length === 0 ? (
        <div className="bp-empty">El plan de estudios no tiene ciclos registrados.</div>
      ) : (
        <div className={clsGrid}>
          {lista.map(ciclo => (
            <div className="bp-card" key={ciclo.ciclo}>
              <div className="bp-card-t">{ciclo.titulo}</div>
              <table className="bp-table">
                <thead>
                  <tr>
                    <th>Unidad didáctica</th>
                    <th>Créditos</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(ciclo.unidades) ? ciclo.unidades : []).map((u, i) => (
                    <tr key={`${ciclo.ciclo}-${i}`}>
                      <td>{u.nombre}</td>
                      <td>{u.creditos ?? '—'}</td>
                      <td>{u.nota ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Promedio</td>
                    <td>{ciclo.promedio != null ? ciclo.promedio.toFixed(2) : 'S/N'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      )}

      <div className="bp-summary">
        <div className="bp-sum-block">
          <span className="bp-sum-label">Promedio general:</span>
          <span className="bp-sum-value">
            {promedioGeneral != null ? promedioGeneral.toFixed(2) : 'S/N'}
          </span>
        </div>
        <div className="bp-sum-sep"></div>
        <div className="bp-sum-block">
          <span className="bp-sum-label">Ciclos completados:</span>
          <span className="bp-sum-value">
            {ciclosCompletados ?? 0} de {ciclosTotales ?? lista.length}
          </span>
        </div>
      </div>

      <p className="bp-scale">
        Escala de calificación: 0 a 20 &middot; Nota mínima aprobatoria: 13
      </p>

      <div className="bp-signs">
        <div className="bp-sign">
          <div className="line"></div>
          <p>Secretaría académica</p>
        </div>
        <div className="bp-sign">
          <div className="line"></div>
          <p>Coordinación del programa</p>
        </div>
      </div>

      <div className="bp-foot">
        IESTP Suiza · SIGA — Documento generado el {estudiante.fecha_emision || '—'}
        {codigoVerificacion ? ` · Cód. verificación: ${codigoVerificacion}` : ''}
      </div>
    </div>
  );
}
