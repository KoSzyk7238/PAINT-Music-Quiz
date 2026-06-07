import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const ICONS = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
};

const STYLES = {
    error: 'border-red-500/40 bg-red-950/90 text-red-100',
    success: 'border-green-500/40 bg-green-950/90 text-green-100',
    info: 'border-blue-500/40 bg-blue-950/90 text-blue-100',
};

export default function ToastContainer() {
    const { toasts, dismiss } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] flex flex-col gap-2 pointer-events-none"
            aria-live="polite"
            aria-relevant="additions"
        >
            {toasts.map((toast) => {
                const Icon = ICONS[toast.type] || Info;
                return (
                    <div
                        key={toast.id}
                        role="alert"
                        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-300 ${STYLES[toast.type] || STYLES.info}`}
                    >
                        <Icon size={20} className="shrink-0 mt-0.5" aria-hidden />
                        <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
                        <button
                            type="button"
                            onClick={() => dismiss(toast.id)}
                            aria-label="Zamknij powiadomienie"
                            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                        >
                            <X size={18} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
