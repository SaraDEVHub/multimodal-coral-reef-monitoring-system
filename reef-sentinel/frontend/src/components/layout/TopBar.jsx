import { Menu } from "lucide-react";
import { useRisk } from "../../context/RiskContext";
import ProbabilityGauge from "../shared/ProbabilityGauge";
import { getRiskLevel } from "../../utils/risk";

const WEIGHTS = { module1: 0.35, module2: 0.3, module3: 0.35 };

export default function TopBar({ title, onMenuClick }) {
  const { results, completedCount } = useRisk();

  // Pouls du récif : moyenne pondérée des modules déjà complétés, renormalisée
  // sur les poids disponibles. Affiché en direct dans l'en-tête, avant même
  // d'atteindre la page de fusion — c'est l'aperçu vivant du score global.
  const activeWeights = Object.entries(WEIGHTS).filter(([key]) => results[key]);
  const weightSum = activeWeights.reduce((sum, [, w]) => sum + w, 0);
  const pulse =
    weightSum > 0
      ? activeWeights.reduce((sum, [key, w]) => sum + (results[key].probability ?? 0) * w, 0) / weightSum
      : 0;

  const level = getRiskLevel(pulse);

  return (
    <header className="no-print sticky top-0 z-20 bg-mist/80 backdrop-blur-md border-b border-line">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-line/60 shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5 text-ink" />
          </button>
          <h2 className="font-display text-base sm:text-lg font-semibold text-ink truncate">{title}</h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[11px] text-ink-soft">Pouls du récif</span>
            <span className="text-xs font-medium" style={{ color: level.color }}>
              {completedCount}/3 modules · {level.label}
            </span>
          </div>
          <ProbabilityGauge value={pulse} size={44} strokeWidth={5} showStatus={false} animateKey={`${completedCount}-${pulse}`} />
        </div>
      </div>
    </header>
  );
}
