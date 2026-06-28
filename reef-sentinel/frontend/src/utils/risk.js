// Seuils harmonisés avec models/fusion/fusion_metadata.json :
// Healthy/Stable < 33 %, At risk/Warning [33, 66), Degraded/Critical >= 66 %
export function getRiskLevel(value) {
  const v = Math.min(Math.max(value ?? 0, 0), 1);
  if (v < 0.33) {
    return {
      key: "stable",
      label: "Stable",
      color: "var(--color-turquoise)",
      textClass: "text-turquoise",
      bgClass: "bg-turquoise-soft",
      borderClass: "border-turquoise/30",
    };
  }
  if (v < 0.66) {
    return {
      key: "warning",
      label: "Warning",
      color: "var(--color-amber)",
      textClass: "text-amber",
      bgClass: "bg-amber-soft",
      borderClass: "border-amber/30",
    };
  }
  return {
    key: "critical",
    label: "Critical",
    color: "var(--color-coral)",
    textClass: "text-coral",
    bgClass: "bg-coral-soft",
    borderClass: "border-coral/30",
  };
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}
