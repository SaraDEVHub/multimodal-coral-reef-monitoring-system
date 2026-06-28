import { getRiskLevel } from "../../utils/risk";

export default function RiskBadge({ value, customLabel, className = "" }) {
  const level = getRiskLevel(value);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${level.bgClass} ${level.textClass} ${level.borderClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: level.color }} />
      {customLabel || level.label}
    </span>
  );
}
