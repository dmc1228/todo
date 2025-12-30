import { useState, useCallback } from "react";
import { Toast, ToastType } from "../components/common/Toast";

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      duration?: number,
      action?: { label: string; onClick: () => void },
    ) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = { id, message, type, duration, action };
      setToasts((prev) => [...prev, toast]);
      return id;
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => {
      return addToast(message, "success", duration);
    },
    [addToast],
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      return addToast(message, "error", duration);
    },
    [addToast],
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      return addToast(message, "info", duration);
    },
    [addToast],
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
  };
}
