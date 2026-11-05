import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4500 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (message, title = 'Éxito') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message }),
    warning: (message, title = 'Atención') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Información') => addToast({ type: 'info', title, message }),
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-white border-emerald-500 text-emerald-950 shadow-emerald-950/10',
          iconBg: 'bg-emerald-100 text-emerald-600',
          title: 'text-emerald-900',
          icon: <CheckCircle2 size={18} />
        };
      case 'error':
        return {
          container: 'bg-white border-rose-500 text-rose-950 shadow-rose-950/10',
          iconBg: 'bg-rose-100 text-rose-600',
          title: 'text-rose-900',
          icon: <AlertCircle size={18} />
        };
      case 'warning':
        return {
          container: 'bg-white border-amber-500 text-amber-950 shadow-amber-950/10',
          iconBg: 'bg-amber-100 text-amber-600',
          title: 'text-amber-900',
          icon: <AlertTriangle size={18} />
        };
      case 'info':
      default:
        return {
          container: 'bg-white border-blue-500 text-blue-950 shadow-blue-950/10',
          iconBg: 'bg-blue-100 text-blue-600',
          title: 'text-blue-900',
          icon: <Info size={18} />
        };
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Contenedor flotante de toasts */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((item) => {
          const styles = getToastStyles(item.type);
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-xl border border-slate-200/80 transition-all duration-300 transform translate-y-0 ${styles.container}`}
            >
              <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${styles.iconBg}`}>
                {styles.icon}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                {item.title && (
                  <h5 className={`text-xs font-bold leading-tight ${styles.title}`}>
                    {item.title}
                  </h5>
                )}
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback defensivo si se usa fuera de ToastProvider
    return {
      success: (msg) => console.log('[Toast SUCCESS]', msg),
      error: (msg) => console.error('[Toast ERROR]', msg),
      warning: (msg) => console.warn('[Toast WARNING]', msg),
      info: (msg) => console.info('[Toast INFO]', msg),
    };
  }
  return context;
}
