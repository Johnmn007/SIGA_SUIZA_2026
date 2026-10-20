/**
 * Bloque informativo rectangular reutilizable para las secciones del
 * módulo Gestión de Matrícula Académica.
 *
 * Mantiene la misma identidad visual en todas las pestañas: acento azul
 * institucional, icono en degradado, título, descripción breve, chips
 * opcionales y una marca decorativa suave a la derecha.
 */
export function SectionInfoBlock(props) {
  const {
    icon: Icon,
    ghostIcon: GhostIcon,
    title,
    description,
    chips = [],
    children,
    className = '',
  } = props;

  return (
    <section className={`sma-info ${className}`.trim()}>
      <span className="sma-info-deco" aria-hidden="true" />
      <span className="sma-info-deco-2" aria-hidden="true" />

      <div className="sma-info-body">
        <div className="sma-info-icon" aria-hidden="true">
          <Icon size={24} />
        </div>

        <div className="sma-info-copy">
          <h4 className="sma-info-title">{title}</h4>
          <p className="sma-info-text">{description}</p>

          {chips.length > 0 && (
            <ul className="sma-info-chips" aria-label="Categorías de la sección">
              {chips.map((chip) => (
                <li key={chip} className="sma-info-chip">{chip}</li>
              ))}
            </ul>
          )}
        </div>

        {GhostIcon && (
          <span className="sma-info-ghost" aria-hidden="true">
            <GhostIcon size={82} strokeWidth={1.15} />
          </span>
        )}
      </div>

      {children && <div className="sma-info-extra">{children}</div>}
    </section>
  );
}

export default SectionInfoBlock;
