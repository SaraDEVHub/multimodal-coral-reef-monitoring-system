import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { FlaskConical, PlayCircle, Percent, Gauge, ListChecks, ArrowRight } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import UploadDropzone from "../components/shared/UploadDropzone";
import LoadingIndicator from "../components/shared/LoadingIndicator";
import ErrorBanner from "../components/shared/ErrorBanner";
import Card from "../components/shared/Card";
import StatCard from "../components/shared/StatCard";
import RiskBadge from "../components/shared/RiskBadge";
import ProbabilityGauge from "../components/shared/ProbabilityGauge";
import { predictModule1 } from "../api/client";
import { parseCsvPreview } from "../utils/csvPreview";
import { useRisk } from "../context/RiskContext";
import { formatPercent } from "../utils/risk";

export default function Module1Page({ onNavigate }) {
  const { setModuleResult } = useRisk();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleFileSelected(selectedFile) {
    setFile(selectedFile);
    setResult(null);
    setStatus("idle");
    setError(null);
    try {
      const parsed = await parseCsvPreview(selectedFile);
      setPreview(parsed);
    } catch {
      setPreview(null);
    }
  }

  function handleClear() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setStatus("idle");
    setError(null);
  }

  async function handleAnalyze() {
    if (!file) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await predictModule1(file);
      setResult(data);
      setModuleResult("module1", data);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  const chartData = result?.row_probabilities?.map((p, idx) => ({
    index: idx + 1,
    probability: p,
  }));

  return (
    <div>
      <SectionHeader
        eyebrow="Module 01"
        title="Analyse FTIR — Microplastiques"
        icon={FlaskConical}
        description="Importez un fichier CSV de spectres FTIR. Le modèle XGBoost sélectionne automatiquement les 415 nombres d'onde pertinents, applique une normalisation SNV par spectre, puis calcule une probabilité moyenne de présence de polymère plastique."
      />

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">1. Import du fichier</h3>
            <UploadDropzone
              accept=".csv"
              fileTypeLabel="fichier CSV spectral"
              file={file}
              onFileSelected={handleFileSelected}
              onClear={handleClear}
            />

            <button
              onClick={handleAnalyze}
              disabled={!file || status === "loading"}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-navy text-white text-sm font-medium py-2.5 rounded-xl hover:bg-azure transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4" />
              Analyser la signature spectrale
            </button>
          </Card>

          {preview && (
            <Card className="p-5 overflow-hidden">
              <h3 className="text-sm font-semibold text-ink mb-3">
                Aperçu du jeu de données
                <span className="text-ink-soft font-normal">
                  {" "}
                  · {preview.totalRows} lignes × {preview.totalColumns} colonnes
                </span>
              </h3>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-line">
                      {preview.header.map((h, i) => (
                        <th key={i} className="text-left px-2 py-1.5 text-ink-soft font-medium truncate max-w-[80px]">
                          {h}
                        </th>
                      ))}
                      {preview.truncatedCols && <th className="px-2 py-1.5 text-ink-soft">…</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-line/60 last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1.5 text-ink truncate max-w-[80px]">
                            {cell}
                          </td>
                        ))}
                        {preview.truncatedCols && <td className="px-2 py-1.5 text-ink-soft">…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div>
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <Card key="loading" className="p-5">
                <LoadingIndicator
                  label="Sélection spectrale, normalisation SNV et inférence XGBoost…"
                  hint="L'analyse s'exécute sur le serveur d'inférence et n'utilise aucune valeur simulée."
                />
              </Card>
            )}

            {status === "error" && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ErrorBanner message={error} onDismiss={() => setStatus("idle")} />
              </motion.div>
            )}

            {status === "done" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-ink">Résultat de l'analyse</h3>
                    <RiskBadge value={result.probability} />
                  </div>
                  <div className="flex items-center gap-6">
                    <ProbabilityGauge
                      value={result.probability}
                      size={110}
                      label="P_micro"
                      sublabel="Probabilité de polymère"
                      showStatus={false}
                    />
                    <div className="flex-1 grid grid-cols-1 gap-2.5">
                      <StatCard
                        icon={Percent}
                        accent="azure"
                        label="Probabilité moyenne"
                        value={formatPercent(result.probability)}
                      />
                      <StatCard
                        icon={Gauge}
                        accent="turquoise"
                        label="Confiance du modèle"
                        value={formatPercent(result.confidence)}
                      />
                      <StatCard
                        icon={ListChecks}
                        accent="navy"
                        label="Spectres analysés"
                        value={`${result.n_rows_analyzed}`}
                        sublabel={
                          result.n_rows_rejected
                            ? `${result.n_rows_rejected} ligne(s) ignorée(s)`
                            : `${result.wavenumbers_matched} nombres d'onde appariés`
                        }
                      />
                    </div>
                  </div>
                  <p className="text-sm text-ink-soft mt-4 leading-relaxed border-t border-line pt-4">
                    {result.interpretation}
                  </p>
                </Card>

                {chartData && chartData.length > 1 && (
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-ink mb-1">Probabilité par spectre</h3>
                    <p className="text-xs text-ink-soft mb-3">
                      Progression ligne par ligne avant agrégation par moyenne (P_micro).
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="m1Gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-turquoise)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--color-turquoise)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--color-line)" vertical={false} />
                        <XAxis
                          dataKey="index"
                          tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
                          tickLine={false}
                          axisLine={{ stroke: "var(--color-line)" }}
                          label={{ value: "Ligne du fichier", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--color-ink-soft)" }}
                        />
                        <YAxis
                          domain={[0, 1]}
                          tickFormatter={(v) => `${Math.round(v * 100)}%`}
                          tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
                          tickLine={false}
                          axisLine={false}
                          width={42}
                        />
                        <ReferenceLine y={0.5} stroke="var(--color-coral)" strokeDasharray="4 4" />
                        <Tooltip
                          formatter={(v) => [`${(v * 100).toFixed(1)}%`, "Probabilité"]}
                          labelFormatter={(l) => `Ligne ${l}`}
                          contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", fontSize: 12 }}
                        />
                        <Area type="monotone" dataKey="probability" stroke="var(--color-turquoise)" strokeWidth={2} fill="url(#m1Gradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                <button
                  onClick={() => onNavigate("module2")}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-azure py-2.5 rounded-xl border border-line hover:bg-paper transition-colors"
                >
                  Continuer vers le module stress environnemental
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {status === "idle" && !file && (
              <Card key="empty" className="p-8 text-center text-sm text-ink-soft">
                Importez un fichier CSV spectral pour démarrer l'analyse.
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
