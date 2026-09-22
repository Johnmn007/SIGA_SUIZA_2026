export function BoletinLoading() {
  return (
    <div className="glass-card py-20 text-center">
      <div className="inline-block w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium">Cargando boletín de notas...</p>
    </div>
  );
}

export function BoletinEmpty({ message }) {
  return (
    <div className="glass-card py-16 text-center">
      <div className="text-5xl opacity-40 mb-4">📄</div>
      <p className="text-slate-500 font-medium text-lg">
        {message || 'No se encontraron calificaciones registradas para este periodo.'}
      </p>
      <p className="text-slate-400 text-sm mt-2">
        Intenta seleccionar otro periodo académico desde el filtro superior.
      </p>
    </div>
  );
}

export function BoletinError({ message, onRetry }) {
  return (
    <div className="glass-card py-16 text-center border-red-200/60">
      <div className="text-5xl opacity-40 mb-4">⚠️</div>
      <p className="text-red-600 font-semibold text-lg">No se pudo cargar el boletín.</p>
      <p className="text-slate-500 text-sm mt-1">{message || 'Error inesperado al consultar el servicio.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-6">
          Reintentar
        </button>
      )}
    </div>
  );
}