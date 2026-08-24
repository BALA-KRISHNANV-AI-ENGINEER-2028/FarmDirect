import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import Icon from "./Icon";
import { cn } from "../../utils/cn";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-lg border transition-all duration-300 bg-surface-bright text-on-surface",
              t.type === "success" && "border-primary/30 bg-surface-bright text-on-surface",
              t.type === "error" && "border-error/30 bg-surface-bright text-on-surface",
              t.type === "info" && "border-surface-variant bg-surface-bright"
            )}
          >
            <Icon
              name={t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
              size={20}
              className={cn(
                t.type === "success" && "text-primary",
                t.type === "error" && "text-error",
                t.type === "info" && "text-on-surface-variant"
              )}
            />
            <span className="text-label-md font-medium flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg: string) => {
        // eslint-disable-next-line no-console
        console.log(msg);
      },
    };
  }
  return ctx;
}
