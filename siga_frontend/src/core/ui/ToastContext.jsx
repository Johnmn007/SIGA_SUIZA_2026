import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, HelpCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

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

  const toast = useMemo(() => ({
    success: (message, title = 'Éxito') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Aviso del Sistema') => addToast({ type: 'error', title, message }),
    warning: (message, title = 'Atención') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Información') => addToast({ type: 'info', title, message }),
  }), [addToast]);

  // Modal de confirmación institucional asíncrono
  const confirm = useCallback(({
    title = '¿Confirmar acción?',
    message = '¿Está seguro de realizar esta operación?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger' // 'danger' | 'warning' | 'info'
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve: (val) => {
          setConfirmState(null);
          resolve(val);
        }
      });
    });
  }, []);

  // INTERCEPTOR GLOBAL: Erradicar al 100% las ventanas emergentes nativas del navegador (window.alert y window.confirm)
  useEffect(() => {
    const originalAlert = window.alert;
    const originalPrompt = window.prompt;

    window.prompt = (message) => {
      console.warn('Native window.prompt was intercepted and blocked:', message);
      addToast({ type: 'warning', title: 'Aviso del Sistema', message: typeof message === 'string' ? message : 'Entrada bloqueada' });
      return null;
    };

    window.alert = (message) => {
      try {
        const text = typeof message === 'object' ? JSON.stringify(message) : String(message ?? '');
        const lower = text.toLowerCase();
        if (
          lower.includes('error') || 
          lower.includes('falló') || 
          lower.includes('no se pudo') || 
          text.includes('❌') || 
          lower.includes('bloquead') ||
          lower.includes('inválid')
        ) {
          addToast({ type: 'error', title: 'Aviso del Sistema', message: text });
        } else if (
          lower.includes('éxito') || 
          lower.includes('correctamente') || 
          lower.includes('exitos') || 
          text.includes('✅') || 
          lower.includes('guardad') ||
          lower.includes('actualizad')
        ) {
          addToast({ type: 'success', title: 'Operación Exitosa', message: text });
        } else if (
          lower.includes('advertencia') || 
          lower.includes('atención') || 
          text.includes('⚠️')
        ) {
          addToast({ type: 'warning', title: 'Atención', message: text });
        } else {
          addToast({ type: 'info', title: 'Notificación', message: text });
        }
      } catch (err) {
        console.warn('Error intercepting window.alert:', err);
      }
    };

    return () => {
      window.alert = originalAlert;
      window.prompt = originalPrompt;
    };
  }, [addToast]);

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

  const contextValue = {
    ...toast,
    confirm
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Contenedor flotante de toasts del sistema */}
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

      {/* Modal interactivo de confirmación institucional */}
      {confirmState && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-6 text-center space-y-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                confirmState.type === 'danger' ? 'bg-rose-100 text-rose-600' :
                confirmState.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {confirmState.type === 'danger' ? <AlertCircle size={26} /> :
                 confirmState.type === 'warning' ? <AlertTriangle size={26} /> :
                 <HelpCircle size={26} />}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 tracking-tight">
                  {confirmState.title}
                </h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => confirmState.resolve(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => confirmState.resolve(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${
                  confirmState.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' :
                  confirmState.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg) => console.log('[Toast SUCCESS]', msg),
      error: (msg) => console.error('[Toast ERROR]', msg),
      warning: (msg) => console.warn('[Toast WARNING]', msg),
      info: (msg) => console.info('[Toast INFO]', msg),
      confirm: async () => false
    };
  }
  return context;
}
