import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, RotateCcw, Search, ShieldCheck, Repeat, Layers, Tag, PenLine, QrCode, Upload, Building2, Smartphone, X,
  Globe, Save, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { PRICE_TYPES } from './tupaCatalog';
import { ConceptFormModal } from './ConceptFormModal';
import { isPublicUrl } from './lib/tesoreriaApi';

const PRICE_TYPE_STYLE = {
  fijo: { icon: Tag, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  tarifas: { icon: Layers, cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  libre: { icon: PenLine, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export function PriceSummary({ concept }) {
  if (concept.tipoPrecio === 'tarifas') {
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        {concept.tarifas.map(t => (
          <span key={t.id} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10.5px] font-semibold text-slate-700 whitespace-nowrap">
            {t.nombre}: <b className="font-mono">S/ {t.monto.toFixed(2)}</b>
          </span>
        ))}
      </div>
    );
  }
  if (concept.tipoPrecio === 'libre') {
    return (
      <span className="text-xs text-slate-600">
        Sugerido <b className="font-mono text-slate-900">S/ {concept.monto.toFixed(2)}</b>
        {concept.montoMinimo > 0 && <span className="block text-[10.5px] text-slate-400">Mín. S/ {concept.montoMinimo.toFixed(2)}</span>}
      </span>
    );
  }
  return <span className="font-mono font-black text-sm text-slate-900 whitespace-nowrap">S/ {concept.monto.toFixed(2)}</span>;
}

export function TupaCatalogManager({ catalog, catalogError, onSaveConcept, onDeleteConcept, onResetCatalog, cajaConfig, onSaveCajaConfig }) {
  const [editing, setEditing] = useState(null); // null | 'new' | concept
  const [query, setQuery] = useState('');
  const [imageError, setImageError] = useState('');
  const [actionError, setActionError] = useState('');
  const [configForm, setConfigForm] = useState(cajaConfig);
  const [configStatus, setConfigStatus] = useState({ saving: false, message: '', error: '' });

  useEffect(() => { setConfigForm(cajaConfig); }, [cajaConfig]);

  const updateConfig = (field, value) => setConfigForm(prev => ({ ...prev, [field]: value }));
  const configDirty = JSON.stringify(configForm) !== JSON.stringify(cajaConfig);

  const handleSaveConfig = async () => {
    setConfigStatus({ saving: true, message: '', error: '' });
    try {
      await onSaveCajaConfig(configForm);
      setConfigStatus({ saving: false, message: 'Datos de cobro guardados en la base de datos.', error: '' });
    } catch (e) {
      setConfigStatus({ saving: false, message: '', error: e.message });
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return catalog.filter(c => !q || c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q) || c.categoria.toLowerCase().includes(q));
  }, [catalog, query]);

  const handleDelete = async (concept) => {
    if (!window.confirm(`¿Eliminar el concepto "${concept.codigo} · ${concept.nombre}" del tarifario?\n\nLos recibos ya emitidos con este concepto se conservan.`)) return;
    setActionError('');
    try {
      await onDeleteConcept(concept.id);
    } catch (e) {
      setActionError(e.message);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Restaurar el tarifario TUPA oficial? Se perderán los conceptos y precios personalizados.')) return;
    setActionError('');
    try {
      await onResetCatalog();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setImageError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) return setImageError('Selecciona una imagen (PNG o JPG).');
    if (file.size > 1024 * 1024) return setImageError('La imagen debe pesar menos de 1 MB.');
    const reader = new FileReader();
    reader.onload = () => updateConfig('yapeQrImagen', reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tarifario */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Tarifario TUPA 2026</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Agrega, edita precios o elimina conceptos. Los cambios se aplican de inmediato en la ventanilla de cobro.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar concepto..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              title="Restaurar tarifario oficial"
            >
              <RotateCcw size={14} /> Restaurar
            </button>
            <button
              onClick={() => setEditing('new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-800 transition cursor-pointer"
            >
              <Plus size={15} /> Nuevo concepto
            </button>
          </div>
        </div>

        {(actionError || catalogError) && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0" /> {actionError || `No se pudo cargar el tarifario: ${catalogError}`}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Tipo de precio</th>
                <th className="py-3 px-4">Reglas</th>
                <th className="py-3 px-4 text-right">Precio</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">No hay conceptos que coincidan.</td></tr>
              ) : filtered.map(c => {
                const pt = PRICE_TYPE_STYLE[c.tipoPrecio] || PRICE_TYPE_STYLE.fijo;
                const Icon = pt.icon;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-black text-primary-dark whitespace-nowrap">{c.codigo}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{c.nombre}</span>
                      <span className="text-[10.5px] text-slate-400">{c.categoria}{c.descripcion ? ` · ${c.descripcion}` : ''}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold whitespace-nowrap ${pt.cls}`}>
                        <Icon size={11} /> {PRICE_TYPES[c.tipoPrecio]?.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {c.liberaMatricula && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700"><ShieldCheck size={12} /> Habilita matrícula</span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500">
                          <Repeat size={12} /> {c.permiteRepetir ? 'Cobro repetible' : 'Pago único por alumno'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right"><PriceSummary concept={c} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditing(c)} className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-blue-50 transition cursor-pointer" title="Editar concepto y precios">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(c)} className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer" title="Eliminar concepto">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Datos de cobro */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2"><QrCode size={18} className="text-primary" /> Datos de cobro de la institución</h3>
            <p className="text-xs text-slate-500 mt-0.5">Se guardan en la base de datos y se usan en la ventanilla y en los QR de boletas y estados de cuenta.</p>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={!configDirty || configStatus.saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-md shadow-primary/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-default flex-shrink-0"
          >
            <Save size={14} /> {configStatus.saving ? 'Guardando...' : 'Guardar datos de cobro'}
          </button>
        </div>

        {configStatus.error && (
          <p className="mb-3 text-[11px] text-red-600 font-semibold flex items-center gap-1.5"><AlertCircle size={13} /> {configStatus.error}</p>
        )}
        {configStatus.message && !configDirty && (
          <p className="mb-3 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5"><CheckCircle2 size={13} /> {configStatus.message}</p>
        )}

        {/* El QR lleva la boleta escrita: se lee sin internet. El enlace web es opcional */}
        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-700 mb-3 flex items-start gap-1.5">
            <QrCode size={14} className="text-primary flex-shrink-0 mt-0.5" />
            <span>
              <b>El QR de cada boleta lleva la boleta completa</b> (recibo, fecha, alumno, DNI, programa, concepto, monto, medio de pago,
              cajero y código de verificación). Cualquier celular la muestra al escanear, <b>sin internet y en cualquier red</b>.
            </span>
          </p>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"><Globe size={13} /> Dominio público del sistema <span className="font-medium text-slate-400">(opcional)</span></label>
          <input
            value={configForm.urlPublica || ''}
            onChange={(e) => updateConfig('urlPublica', e.target.value)}
            placeholder="https://siga.iestpsuiza.edu.pe"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
            Solo cuando el sistema esté publicado en internet: el QR agrega al final un enlace “VER BOLETA” que abre la boleta
            en formato web para celular. Las direcciones locales (localhost o IP de la red interna) no se agregan, porque quien escanea no está en esa red.
          </p>
          {(configForm.urlPublica || '').trim() && !isPublicUrl(configForm.urlPublica.trim()) && (
            <p className="mt-2 text-[11px] text-amber-700 font-semibold flex items-start gap-1.5">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              Es una dirección local: no se agregará al QR (la boleta igual va escrita dentro del código).
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4 items-start">
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"><Smartphone size={13} /> Número Yape / Plin</label>
              <input
                value={configForm.yapeNumero}
                onChange={(e) => updateConfig('yapeNumero', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Titular de la cuenta</label>
              <input
                value={configForm.yapeTitular}
                onChange={(e) => updateConfig('yapeTitular', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1"><Building2 size={13} /> Cuenta corriente Banco de la Nación</label>
            <input
              value={configForm.bnCuenta}
              onChange={(e) => updateConfig('bnCuenta', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[10.5px] text-slate-500 mt-3 leading-relaxed">
              Sube el QR oficial de Yape/Plin de la institución (descárgalo desde la app). Si no lo subes, la ventanilla genera un QR con la orden de pago (DNI, concepto y monto).
            </p>
            {imageError && <p className="text-[11px] text-red-600 font-semibold mt-1">{imageError}</p>}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
              {configForm.yapeQrImagen
                ? <img src={configForm.yapeQrImagen} alt="QR oficial Yape/Plin" className="w-full h-full object-contain" />
                : <span className="text-[10.5px] text-slate-400 text-center px-3">Sin QR oficial cargado</span>}
            </div>
            <div className="flex gap-1.5">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition cursor-pointer">
                <Upload size={13} /> Subir QR
                <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
              </label>
              {configForm.yapeQrImagen && (
                <button
                  onClick={() => updateConfig('yapeQrImagen', '')}
                  className="p-1.5 rounded-xl border border-slate-300 text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="Quitar QR"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <ConceptFormModal
          concept={editing === 'new' ? null : editing}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onSave={async (concept, originalId) => { await onSaveConcept(concept, originalId); setEditing(null); }}
        />
      )}
    </div>
  );
}
