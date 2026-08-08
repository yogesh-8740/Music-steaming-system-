import React, { createContext, useContext, useState, useCallback } from "react";
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle } from "react-icons/fi";

const ToastContext = createContext(null);

const ICONS = {
  success: <FiCheckCircle className="text-brand-green" size={18} />,
  error: <FiXCircle className="text-red-500" size={18} />,
  info: <FiInfo className="text-blue-400" size={18} />,
  warning: <FiAlertTriangle className="text-yellow-400" size={18} />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass animate-slideUp flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-glass min-w-[240px]"
          >
            {ICONS[t.type]}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
