import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

const TOAST_TYPES = {
  success: { bg: 'bg-emerald-500/90', icon: '\u2705', border: 'border-emerald-400/30' },
  xp: { bg: 'bg-amber-500/90', icon: '\u2b50', border: 'border-amber-400/30' },
  streak: { bg: 'bg-orange-500/90', icon: '\ud83d\udd25', border: 'border-orange-400/30' },
  levelup: { bg: 'bg-violet-500/90', icon: '\ud83c\udf89', border: 'border-violet-400/30' },
  info: { bg: 'bg-sky-500/90', icon: '\ud83d\udca1', border: 'border-sky-400/30' },
  heart: { bg: 'bg-pink-500/90', icon: '\ud83d\udc96', border: 'border-pink-400/30' },
  warning: { bg: 'bg-red-500/90', icon: '\u26a0\ufe0f', border: 'border-red-400/30' },
};

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
      width: '90%',
      maxWidth: '400px',
    }}>
      <style>{`
        @keyframes toast-in {
          0% { transform: translateY(-20px) scale(0.9); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes toast-out {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-20px) scale(0.9); opacity: 0; }
        }
      `}</style>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.success;

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), toast.duration - 300);
    const removeTimer = setTimeout(onDismiss, toast.duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.duration, onDismiss]);

  return (
    <div
      className={`${config.bg} backdrop-blur-sm border ${config.border} rounded-xl px-4 py-3 shadow-lg`}
      style={{
        animation: exiting ? 'toast-out 0.3s ease-in forwards' : 'toast-in 0.3s ease-out forwards',
        pointerEvents: 'auto',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{config.icon}</span>
        <p className="text-white text-sm font-medium flex-1">{toast.message}</p>
      </div>
    </div>
  );
}

function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { addToast: () => console.warn('ToastProvider not found') };
  }
  return context;
}

export { ToastProvider, useToast };
export default ToastProvider;
