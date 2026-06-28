export default function StatCard({ label, value, sublabel, accent = "azure", icon: Icon }) {
  const accentClasses = {
    azure: "bg-azure/10 text-azure",
    turquoise: "bg-turquoise-soft text-turquoise",
    coral: "bg-coral-soft text-coral",
    amber: "bg-amber-soft text-amber",
    navy: "bg-navy/10 text-navy",
  };

  return (
    <div className="rounded-xl border border-line bg-paper p-4 flex items-start gap-3">
      {Icon && (
        <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center shrink-0 ${accentClasses[accent]}`}>
          <Icon className="w-4.5 h-4.5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-soft">{label}</p>
        <p className="font-mono text-xl font-semibold text-ink mt-0.5 truncate">{value}</p>
        {sublabel && <p className="text-xs text-ink-soft mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
