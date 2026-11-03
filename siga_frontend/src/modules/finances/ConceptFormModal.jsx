import { useState } from 'react';
import { X, Plus, Trash2, Save, AlertCircle, Tag, Layers, PenLine } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { TUPA_CATEGORIES, PRICE_TYPES } from './tupaCatalog';

const PRICE_TYPE_ICONS = { fijo: Tag, tarifas: Layers, libre: PenLine };

const emptyConcept = {
  codigo: '',
  nombre: '',
  categoria: 'Trámites',
  descripcion: '',
  tipoPrecio: 'fijo',
  tarifas: [{ id: 'T1', nombre: 'General', monto: 0 }],
  montoMinimo: 0,
  liberaMatricula: false,
  permiteRepetir: false,
};

export function ConceptFormModal({ concept, catalog, onSave, onClose }) {
  const isEdit = Boolean(concept);
  const [form, setForm] = useState(() => {
    const base = concept ? { ...concept } : { ...emptyConcept };
    return { ...base, tarifas: base.tarifas.map(t => ({ ...t, monto: String(t.monto) })), montoMinimo: String(base.montoMinimo || 0) };
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const updateTarifa = (idx, field, value) => {
    setForm(prev => ({
      ...prev,
      tarifas: prev.tarifas.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    }));
  };

  const addTarifa = () => {
    setForm(prev => ({
      ...prev,
      tarifas: [...prev.tarifas, { id: `T${Date.now()}`, nombre: '', monto: '' }],
    }));
  };

  const removeTarifa = (idx) => {
    setForm(prev => ({ ...prev, tarifas: prev.tarifas.filter((_, i) => i !== idx) }));
  };

  const changePriceType = (tipo) => {
    setForm(prev => {
      let tarifas = prev.tarifas;
      if (tipo === 'tarifas' && tarifas.length === 1) {
        tarifas = [{ ...tarifas[0], nombre: tarifas[0].nombre === 'General' ? 'Regular' : tarifas[0].nombre }];
      }
      if (tipo !== 'tarifas') tarifas = [tarifas[0]];
      return { ...prev, tipoPrecio: tipo, tarifas };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const codigo = form.codigo.trim().toUpperCase();
    if (!codigo) return setError('Ingresa el código del concepto (ej. CON-03).');
    if (!form.nombre.trim()) return setError('Ingresa el nombre del concepto.');
    const duplicated = catalog.some(c => c.codigo.toUpperCase() === codigo && c.id !== concept?.id);
    if (duplicated) return setError(`Ya existe un concepto con el código ${codigo}.`);

    const tarifas = form.tarifas.map(t => ({ ...t, nombre: t.nombre.trim(), monto: parseFloat(t.monto) }));
    if (tarifas.some(t => Number.isNaN(t.monto) || t.monto < 0)) return setError('Todos los precios deben ser montos válidos (S/ 0.00 o más).');
    if (form.tipoPrecio === 'tarifas') {
      if (tarifas.length < 2) return setError('Agrega al menos dos tarifas o cambia a "Precio fijo".');
      if (tarifas.some(t => !t.nombre)) return setError('Cada tarifa necesita un nombre (ej. Regular, Beca 50%).');
    } else if (form.tipoPrecio === 'fijo' && tarifas[0].monto <= 0) {
      return setError('El precio fijo debe ser mayor a S/ 0.00.');
    }

    const montoMinimo = parseFloat(form.montoMinimo) || 0;
    if (form.tipoPrecio === 'libre' && montoMinimo < 0) return setError('El monto mínimo no puede ser negativo.');

    setSaving(true);
    try {
      await onSave({
        ...form,
        codigo,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        tarifas: tarifas.map((t, i) => ({ ...t, nombre: t.nombre || (i === 0 ? 'General' : `Tarifa ${i + 1}`) })),
        montoMinimo,
      }, concept?.id || null);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el concepto.');
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
          <div className="p-5 bg-gradient-to-r from-[#071329] via-[#0A2552] to-[#00388F] text-white flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base">{isEdit ? 'Editar concepto TUPA' : 'Nuevo concepto TUPA'}</h3>
              <p className="text-xs text-blue-200/80">Define el arancel y el tipo de precio que tendrá en caja</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código</label>
                <input
                  value={form.codigo}
                  onChange={(e) => update('codigo', e.target.value)}
                  placeholder="CON-03"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => update('categoria', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {[...new Set([...TUPA_CATEGORIES, form.categoria])].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del concepto</label>
              <input
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                placeholder="Ej. Constancia de Egresado"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción <span className="font-medium text-slate-400">(opcional)</span></label>
              <textarea
                value={form.descripcion}
                onChange={(e) => update('descripcion', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Tipo de precio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tipo de precio</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Object.entries(PRICE_TYPES).map(([key, info]) => {
                  const Icon = PRICE_TYPE_ICONS[key];
                  const active = form.tipoPrecio === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => changePriceType(key)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${active ? 'border-primary bg-primary-soft/60 ring-2 ring-primary/20' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <span className={`flex items-center gap-1.5 text-xs font-extrabold ${active ? 'text-primary-dark' : 'text-slate-800'}`}>
                        <Icon size={14} /> {info.label}
                      </span>
                      <span className="block text-[10.5px] text-slate-500 mt-1 leading-snug">{info.descripcion}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Precios según tipo */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              {form.tipoPrecio === 'fijo' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio oficial (S/)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.tarifas[0].monto}
                    onChange={(e) => updateTarifa(0, 'monto', e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 rounded-xl border border-slate-200 bg-white text-base font-mono font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              {form.tipoPrecio === 'tarifas' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_8rem_2.25rem] gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    <span>Nombre de la tarifa</span><span>Monto (S/)</span><span />
                  </div>
                  {form.tarifas.map((t, idx) => (
                    <div key={t.id} className="grid grid-cols-[1fr_8rem_2.25rem] gap-2 items-center">
                      <input
                        value={t.nombre}
                        onChange={(e) => updateTarifa(idx, 'nombre', e.target.value)}
                        placeholder={idx === 0 ? 'Regular' : 'Ej. Beca 50%'}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        type="number" step="0.01" min="0"
                        value={t.monto}
                        onChange={(e) => updateTarifa(idx, 'monto', e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => removeTarifa(idx)}
                        disabled={form.tarifas.length <= 1}
                        className="h-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition flex items-center justify-center cursor-pointer"
                        title="Quitar tarifa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTarifa}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-bold hover:bg-primary-soft/50 transition cursor-pointer"
                  >
                    <Plus size={14} /> Agregar tarifa
                  </button>
                  <p className="text-[10.5px] text-slate-500">La primera tarifa es la que se selecciona por defecto al cobrar.</p>
                </div>
              )}

              {form.tipoPrecio === 'libre' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monto sugerido (S/)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.tarifas[0].monto}
                      onChange={(e) => updateTarifa(0, 'monto', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monto mínimo (S/)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.montoMinimo}
                      onChange={(e) => update('montoMinimo', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Reglas de cobro */}
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={form.liberaMatricula} onChange={(e) => update('liberaMatricula', e.target.checked)} className="mt-0.5 accent-emerald-600" />
                <span>
                  <span className="block text-xs font-bold text-slate-800">Habilita la matrícula</span>
                  <span className="block text-[10.5px] text-slate-500">Al pagarse, libera el bloqueo financiero del alumno en el sistema académico.</span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={form.permiteRepetir} onChange={(e) => update('permiteRepetir', e.target.checked)} className="mt-0.5 accent-primary" />
                <span>
                  <span className="block text-xs font-bold text-slate-800">Se puede cobrar varias veces al mismo alumno</span>
                  <span className="block text-[10.5px] text-slate-500">Si está desmarcado, el concepto deja de aparecer en caja cuando el alumno ya lo pagó.</span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/20 transition cursor-pointer disabled:opacity-60">
                <Save size={15} />
                <span>{isEdit ? 'Guardar cambios' : 'Agregar concepto'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
