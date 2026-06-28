import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { GitMerge, ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import ErrorBanner from "../components/shared/ErrorBanner";
import LoadingIndicator from "../components/shared/LoadingIndicator";
import ProbabilityGauge from "../components/shared/ProbabilityGauge";
import { computeFusion } from "../api/client";
import { useRisk } from "../context/RiskContext";
import { formatPercent, getRiskLevel } from "../utils/risk";

const STEPS = [
  { key: "module1", label: "Microplastiques (FTIR)", page: "module1" },
  { key: "module2", label: "Stress environnemental (HAB)", page: "module2" },
  { key: "module3", label: "Imagerie sous-marine", page: "module3" },
];

export default function FusionPage({ onNavigate }) {
  const { results } = useRisk();
  const [status, setStatus] = useState("idle");
  const [fusion, setFusion] = useState(null);
  const [error, setError] = useState(null);

  const allComplete = STEPS.every((s) => results[s.key]);

  useEffect(() => {
    if (!allComplete) return;
    let mounted = true;
    setStatus("loading");
    computeFusion(
      results.module1.probability,
      results.module2.probability,
      results.module3.probability
    )
      .then((data) => {
        if (!mounted) return;
        setFusion(data);
        setStatus("done");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComplete, results.module1, results.module2, results.module3]);

  const chartData = fusion?.contributions?.map((c) => ({
    name: c.module,
    contribution: c.contribution,
    risk: c.risk,
    weight: c.weight,
  }));

  return (
    <div>
      <SectionHeader
        eyebrow="Module 04"
        title="Fusion multimodale"
        icon={GitMerge}
        description="
Agrégation pondérée des prédictions FTIR, HAB et imagerie basée sur les performances des modèles pour générer une évaluation globale du risque.
"
      />

      {!allComplete && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-semibold text-ink mb-3">Étapes requises avant la fusion</h3>
          <div className="space-y-2">
            {STEPS.map((step) => {
              const done = Boolean(results[step.key]);
              return (
                <button
                  key={step.key}
                  onClick={() => onNavigate(step.page)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-line hover:bg-mist transition-colors text-left"
                >
                  <span className="flex items-center gap-2.5 text-sm text-ink">
                    {done ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-turquoise" />
                    ) : (
                      <CircleDashed className="w-4.5 h-4.5 text-ink-soft" />
                    )}
                    {step.label}
                  </span>
                  {done ? (
                    <span className="font-mono text-xs text-ink-soft">
                      {formatPercent(results[step.key].probability)}
                    </span>
                  ) : (
                    <span className="text-xs text-azure">Compléter →</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {error && <ErrorBanner message={error} onDismiss={() => setStatus("idle")} />}

      {allComplete && status === "loading" && (
        <Card className="p-5">
          <LoadingIndicator label="Calcul de la fusion décisionnelle…" />
        </Card>
      )}

      {allComplete && status === "done" && fusion && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <ProbabilityGauge
                value={fusion.global_risk}
                size={180}
                strokeWidth={14}
                label="Risque écologique global"
                showStatus={false}
                animateKey={fusion.global_risk}
              />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-soft mb-2">
                  Décision finale
                </p>
                <h3
                  className="font-display text-3xl font-semibold mb-2"
                  style={{ color: getRiskLevel(fusion.global_risk).color }}
                >
                  {fusion.status}
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed max-w-md">{fusion.interpretation}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-1">Contribution pondérée par module</h3>
            <p className="text-xs text-ink-soft mb-3">
              Contribution = risque du module × poids normalisé.
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 40 }}>
                <CartesianGrid stroke="var(--color-line)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  tick={{ fontSize: 12, fill: "var(--color-ink)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, key, item) => [
                    `${(v * 100).toFixed(1)}% (risque ${(item.payload.risk * 100).toFixed(0)}% × poids ${(item.payload.weight * 100).toFixed(0)}%)`,
                    "Contribution",
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", fontSize: 12 }}
                />
                <Bar dataKey="contribution" radius={[0, 6, 6, 0]} barSize={22} fill="var(--color-azure)">
                  <LabelList
                    dataKey="contribution"
                    position="right"
                    formatter={(v) => `${(v * 100).toFixed(1)}%`}
                    style={{ fontSize: 11, fill: "var(--color-ink-soft)", fontFamily: "var(--font-mono)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <button
            onClick={() => onNavigate("report")}
            className="w-full inline-flex items-center justify-center gap-2 bg-navy text-white text-sm font-medium py-3 rounded-xl hover:bg-azure transition-colors"
          >
            Générer le rapport final
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
