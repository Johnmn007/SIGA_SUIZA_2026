import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle, FileText, X } from 'lucide-react';

const ConfirmContext = createContext(null);

/**
 * Contenido interno del modal cuando está activo.
 */
function ConfirmDialogContent({ config, onClose, onConfirm }) {
  const {
    isPrompt = false,
    title = 'Confirmación requerida',
    message = '',
    confirmText = isPrompt ? 'Aceptar' : 'Confirmar',
    cancelText = 'Cancelar',
    isDestructive = false,
    type = 'default',
    placeholder = '',
    defaultValue = '',
    isTextarea = false,
    required = false,
  } = config;

  const [inputValue, setInputValue] = useState(defaultValue || '');
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (isPrompt && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPrompt]);

  const isDanger = isDestructive || type === 'danger';
  const isWarning = type === 'warning';
  const isSubmitDisabled = isPrompt && required && !inputValue.trim();

  const handleConfirmAction = () => {
    if (isSubmitDisabled) return;
    if (isPrompt) {
      onConfirm(inputValue);
    } else {
      onConfirm(true);
    }
  };

  const renderIcon = () => {
    if (isDanger) {
      return (
        <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
      );
    }
    if (isWarning) {
      return (
        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
      );
    }
    if (isPrompt) {
      return (
        <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
          <FileText className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
        <HelpCircle className="w-6 h-6" />
      </div>
    );
  };

  return createPortal(
    <div
      data-testid="confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {renderIcon()}
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">{title}</h3>
              {message && (
                <div className="text-sm text-slate-600 mt-1.5 leading-relaxed break-words whitespace-pre-line">
                  {message}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            data-testid="confirm-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isPrompt && (
          <div className="mt-4">
            {isTextarea ? (
              <textarea
                ref={inputRef}
                data-testid="prompt-input"
                rows={4}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            ) : (
              <input
                ref={inputRef}
                type="text"
                data-testid="prompt-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmAction();
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            )}
            {required && !inputValue.trim() && (
              <p className="text-xs text-rose-600 mt-1 font-medium">Este campo es requerido.</p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            data-testid="confirm-modal-cancel"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition focus:outline-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            data-testid="confirm-modal-ok"
            onClick={handleConfirmAction}
            disabled={isSubmitDisabled}
            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-primary hover:bg-primary-dark shadow-primary/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Componente contenedor que renderiza el modal cuando config está activo.
 */
function ConfirmDialog({ config, onClose, onConfirm }) {
  if (!config || !config.isOpen) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  return (
    <ConfirmDialogContent
      key={config.id || 'active-dialog'}
      config={config}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

/**
 * Proveedor de Diálogos Modales Interactivos (ConfirmProvider).
 */
export function ConfirmProvider({ children }) {
  const [modalConfig, setModalConfig] = useState(null);

  const openConfirm = useCallback((options = {}) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    return new Promise((resolve) => {
      setModalConfig({
        ...opts,
        id,
        isOpen: true,
        isPrompt: false,
        resolve,
      });
    });
  }, []);

  const openPrompt = useCallback((options = {}) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    return new Promise((resolve) => {
      setModalConfig({
        ...opts,
        id,
        isOpen: true,
        isPrompt: true,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (modalConfig?.resolve) {
      modalConfig.resolve(modalConfig.isPrompt ? null : false);
    }
    setModalConfig(null);
  }, [modalConfig]);

  const handleConfirm = useCallback((val) => {
    if (modalConfig?.resolve) {
      modalConfig.resolve(val);
    }
    setModalConfig(null);
  }, [modalConfig]);

  const contextApi = useMemo(() => {
    const fn = (opts) => openConfirm(opts);
    return Object.assign(fn, {
      confirm: openConfirm,
      promptModal: openPrompt,
      prompt: openPrompt,
    });
  }, [openConfirm, openPrompt]);

  return (
    <ConfirmContext.Provider value={contextApi}>
      {children}
      <ConfirmDialog
        config={modalConfig}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Hook para invocar modales de confirmación y captura de datos (prompt).
 * Soporta:
 * - const confirm = useConfirm(); const ok = await confirm({ message: '...' });
 * - const { confirm, promptModal } = useConfirm();
 * - const { prompt } = useConfirm();
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm debe ser utilizado dentro de un ConfirmProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrompt() {
  const confirmApi = useConfirm();
  return confirmApi.promptModal || confirmApi.prompt;
}

export default ConfirmProvider;
