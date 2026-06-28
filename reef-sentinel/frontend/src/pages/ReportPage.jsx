import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Printer,
  FlaskConical,
  Waves,
  ImageIcon,
  GitMerge,
  CircleDashed,
} from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import RiskBadge from "../components/shared/RiskBadge";
import ProbabilityGauge from "../components/shared/ProbabilityGauge";
import { computeFusion } from "../api/client";
import { useRisk } from "../context/RiskContext";
import { formatPercent, getRiskLevel } from "../utils/risk";

const CLASS_LABELS_FR = {
  Live_coral: "Corail vivant",
  Algae: "Algues",
  Substrate_degraded: "Substrat dégradé",
  Other_background: "Arrière-plan",
};

export default function ReportPage() {
  const { results } = useRisk();
  const [fusion, setFusion] = useState(null);
  const allComplete = results.module1 && results.module2 && results.module3;

  useEffect(() => {
    if (!allComplete) return;
    let mounted = true;
    computeFusion(results.module1.probability, results.module2.probability, results.module3.probability)
      .then((data) => mounted && setFusion(data))
      .catch(() => {});
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComplete]);

  function handleExportJson() {
    const payload = {
      generated_at: new Date().toISOString(),
      project: "Système d'IA multimodal pour l'alerte précoce de la dégradation des récifs coralliens",
      module1_ftir: results.module1,
      module2_hab: results.module2,
      module3_image: results.module3
        ? { ...results.module3, gradcam_image_base64: undefined, original_image_base64: undefined }
        : null,
      fusion,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_recif_corallien_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!allComplete) {
    return (
      <div>
        <SectionHeader eyebrow="Rapport" title="Rapport final" icon={FileText} />
        <Card className="p-8 text-center">
          <CircleDashed className="w-8 h-8 text-ink-soft mx-auto mb-3" />
          <p className="text-sm text-ink-soft">
            Complétez les trois modules d'analyse (FTIR, HAB, imagerie) pour
            générer le rapport final consolidé.
          </p>
        </Card>
      </div>
    );
  }

  const level = fusion ? getRiskLevel(fusion.global_risk) : null;

  return (
    <div>
      <div className="no-print">
        <SectionHeader
          eyebrow="Rapport"
          title="Rapport final consolidé"
          icon={FileText}
          description="Synthèse des quatre modules d'analyse, prête à être exportée."
          action={
            <div className="flex gap-2">
              <button
                onClick={handleExportJson}
                className="inline-flex items-center gap-2 text-sm font-medium text-ink border border-line bg-paper px-4 py-2 rounded-xl hover:bg-mist transition-colors"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 text-sm font-medium text-white bg-navy px-4 py-2 rounded-xl hover:bg-azure transition-colors"
              >
                <Printer className="w-4 h-4" />
                Exporter en PDF
              </button>
            </div>
          }
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Print-only header */}
        <div className="hidden print:block mb-6">
          <h1 className="font-display text-2xl font-semibold">
            Système d'IA multimodal — Alerte précoce de la dégradation des récifs coralliens
          </h1>
          <p className="text-sm text-ink-soft mt-1">Rapport généré le {new Date().toLocaleString("fr-FR")}</p>
        </div>

        {/* Global decision */}
        {fusion && (
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <ProbabilityGauge value={fusion.global_risk} size={150} strokeWidth={12} showStatus={false} />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-ink-soft mb-2">
                  Décision écologique globale
                </p>
                <h3 className="font-display text-3xl font-semibold mb-2" style={{ color: level.color }}>
                  {fusion.status}
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">{fusion.interpretation}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Summary cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-azure" />
              <span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">FTIR</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ink">{formatPercent(results.module1.probability)}</p>
            <RiskBadge value={results.module1.probability} className="mt-2" />
            <p className="text-xs text-ink-soft mt-2">{results.module1.predicted_label === "polymer_plastic" ? "Polymère plastique détecté" : "Aucun polymère dominant"}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="w-4 h-4 text-azure" />
              <span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">HAB</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ink">{formatPercent(results.module2.probability)}</p>
            <RiskBadge value={results.module2.probability} className="mt-2" />
            <p className="text-xs text-ink-soft mt-2">{results.module2.status}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-azure" />
              <span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Imagerie</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ink">{formatPercent(results.module3.probability)}</p>
            <RiskBadge value={results.module3.probability} className="mt-2" />
            <p className="text-xs text-ink-soft mt-2">
              {CLASS_LABELS_FR[results.module3.predicted_class] || results.module3.predicted_class} ({formatPercent(results.module3.confidence)} confiance)
            </p>
          </Card>
        </div>

        {/* Detailed module breakdown */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-azure" /> Module 01 — Analyse FTIR
          </h3>
          <p className="text-sm text-ink-soft leading-relaxed">{results.module1.interpretation}</p>
          <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
            <div><span className="text-ink-soft">Spectres analysés</span><p className="font-mono text-ink">{results.module1.n_rows_analyzed}</p></div>
            <div><span className="text-ink-soft">Confiance</span><p className="font-mono text-ink">{formatPercent(results.module1.confidence)}</p></div>
            <div><span className="text-ink-soft">Modèle</span><p className="font-mono text-ink truncate">{results.module1.model_used}</p></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
            <Waves className="w-4 h-4 text-azure" /> Module 02 — Stress environnemental
          </h3>
          <p className="text-sm text-ink-soft leading-relaxed">{results.module2.interpretation}</p>
          <div className="text-xs mt-3">
            <span className="text-ink-soft">Modèle</span>
            <p className="font-mono text-ink">{results.module2.model_used}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-azure" /> Module 03 — Imagerie sous-marine & explicabilité
          </h3>
          <p className="text-sm text-ink-soft leading-relaxed mb-3">{results.module3.interpretation}</p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <p className="text-xs text-ink-soft mb-1">Image originale</p>
              <img
                src={`data:image/png;base64,${results.module3.original_image_base64}`}
                alt="Original"
                className="rounded-lg border border-line w-full aspect-square object-cover"
              />
            </div>
            <div>
              <p className="text-xs text-ink-soft mb-1">Grad-CAM</p>
              <img
                src={`data:image/png;base64,${results.module3.gradcam_image_base64}`}
                alt="Grad-CAM"
                className="rounded-lg border border-line w-full aspect-square object-cover"
              />
            </div>
          </div>
        </Card>

        {fusion && (
  <Card className="p-5">
    <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
      <GitMerge className="w-4 h-4 text-azure" />
      Module 04 — Multimodal Fusion
    </h3>

    <div className="space-y-2">
      {fusion.contributions.map((c) => (
        <div
          key={c.module}
          className="flex items-center justify-between text-sm"
        >
          <span className="text-ink-soft">{c.module}</span>

          <span className="font-mono text-ink">
            {formatPercent(c.contribution)}
          </span>
        </div>
      ))}
    </div>
  </Card>
)}

        <p className="no-print text-xs text-ink-soft text-center pt-2">
          Pipeline expérimental — résultats à but de recherche, non validés
          pour un diagnostic écologique de terrain.
        </p>
      </motion.div>
    </div>
  );
}
