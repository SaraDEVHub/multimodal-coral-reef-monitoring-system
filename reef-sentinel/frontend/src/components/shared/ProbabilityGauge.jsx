import { motion } from "framer-motion";
import { getRiskLevel } from "../../utils/risk";

/**
 * Jauge circulaire animée. Utilisée à la fois comme "pouls du récif" dans
 * l'en-tête (taille réduite) et comme indicateur principal sur la page de
 * fusion (grande taille).
 */
export default function ProbabilityGauge({
  value = 0,
  size = 96,
  strokeWidth = 10,
  label,
  sublabel,
  showStatus = true,
  animateKey,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 1);
  const dashOffset = circumference * (1 - clamped);
  const level = getRiskLevel(clamped);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            key={animateKey}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={level.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-semibold leading-none"
            style={{ fontSize: size * 0.22, color: level.color }}
          >
            {Math.round(clamped * 100)}%
          </span>
        </div>
      </div>
      {(label || sublabel) && (
        <div className="text-center">
          {label && <p className="text-sm font-medium text-ink">{label}</p>}
          {sublabel && <p className="text-xs text-ink-soft">{sublabel}</p>}
        </div>
      )}
      {showStatus && (
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${level.bgClass} ${level.textClass}`}
        >
          {level.label}
        </span>
      )}
    </div>
  );
}
