import { AlertTriangle } from "lucide-react";

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-coral/30 bg-coral-soft p-4">
      <AlertTriangle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">Une erreur est survenue</p>
        <p className="text-sm text-ink-soft mt-0.5">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-xs text-ink-soft hover:text-ink underline shrink-0"
        >
          Fermer
        </button>
      )}
    </div>
  );
}
