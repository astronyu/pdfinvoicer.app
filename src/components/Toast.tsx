import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircledIcon, CrossCircledIcon, InfoCircledIcon, Cross2Icon } from '@radix-ui/react-icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now() + Math.random();
    setToasts(currentToasts => [...currentToasts, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000); // Auto-dismiss after 5 seconds
  }, [removeToast]);

  const icons: Record<ToastType, React.ElementType> = {
    success: CheckCircledIcon,
    error: CrossCircledIcon,
    info: InfoCircledIcon,
  };
  
  const colors: Record<ToastType, string> = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-blue-600',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div 
        aria-live="assertive"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-[100] space-y-3 w-full max-w-sm"
      >
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          const bgColor = colors[toast.type];
          return (
            <div
              key={toast.id}
              className={`${bgColor} text-white p-4 rounded-lg shadow-lg flex items-start space-x-3 transition-all duration-300`}
              role="alert"
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} className="p-1 -m-1 rounded-full hover:bg-white/20">
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
