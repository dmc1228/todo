import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import "./Toast.css";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 4000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />,
    info: <AlertCircle size={20} />,
  };

  return (
    <motion.div
      className={`toast toast-${toast.type}`}
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      layout
    >
      <div className="toast-icon">{icons[toast.type]}</div>
      <div className="toast-message">{toast.message}</div>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onClose(toast.id);
          }}
          className="toast-action"
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={() => onClose(toast.id)} className="toast-close">
        <X size={16} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}
