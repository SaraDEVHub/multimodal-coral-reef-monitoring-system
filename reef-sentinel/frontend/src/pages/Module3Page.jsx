import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ImageIcon, PlayCircle, ArrowRight, ScanEye } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import UploadDropzone from "../components/shared/UploadDropzone";
import LoadingIndicator from "../components/shared/LoadingIndicator";
import ErrorBanner from "../components/shared/ErrorBanner";
import Card from "../components/shared/Card";
import RiskBadge from "../components/shared/RiskBadge";
import { predictModule3 } from "../api/client";
import { useRisk } from "../context/RiskContext";
import { formatPercent } from "../utils/risk";

const CLASS_COLORS = {
  Live_coral: "var(--color-turquoise)",
  Algae: "var(--color-amber)",
  Substrate_degraded: "var(--color-coral)",
  Other_background: "var(--color-ink-soft)",
};

const CLASS_LABELS_FR = {
  Live_coral: "Corail vivant",
  Algae: "Algues",
  Substrate_degraded: "Substrat dégradé",
  Other_background: "Arrière-plan",
};

export default function Module3Page({ onNavigate }) {
  const { setModuleResult } = useRisk();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileSelected(selectedFile) {
    setFile(selectedFile);
    setResult(null);
    setStatus("idle");
    setError(null);
  }

  function handleClear() {
    setFile(null);
    setResult(null);
    setStatus("idle");
    setError(null);
  }

  async function handleAnalyze() {
    if (!file) return;
    setStatus("loading");
    setError(null);
    try {
      const data = await predictModule3(file);
      setResult(data);
      setModuleResult("module3", data);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  const chartData = result?.class_probabilities?.map((cp) => ({
    name: CLASS_LABELS_FR[cp.class_name] || cp.class_name,
    rawName: cp.class_name,
    probability: cp.probability,
  }));

  return (
    <div>
      <SectionHeader
        eyebrow="Module 03"
        title="Imagerie sous-marine — MobileNetV2"
        icon={ImageIcon}
        description="Importez un patch d'image sous-marine. Le modèle MobileNetV2 classe l'image parmi quatre catégories et une carte Grad-CAM met en évidence les régions ayant influencé la décision."
      />

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">1. Import de l'image</h3>
          <UploadDropzone
            accept=".png,.jpg,.jpeg"
            fileTypeLabel="image sous-marine"
            file={file}
            onFileSelected={handleFileSelected}
            onClear={handleClear}
            previewSlot={
              previewUrl && (
                <img src={previewUrl} alt="Aperçu" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              )
            }
          />

          {previewUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-line">
              <img src={previewUrl} alt="Image importée" className="w-full max-h-72 object-contain bg-mist" />
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!file || status === "loading"}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-navy text-white text-sm font-medium py-2.5 rounded-xl hover:bg-azure transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-4 h-4" />
            Analyser l'image
          </button>
        </Card>

        <div>
          <AnimatePresence mode="wait">
            {status === "loading" && (
              <Card key="loading" className="p-5">
                <LoadingIndicator
                  label="Classification MobileNetV2 et calcul Grad-CAM…"
                  hint="Le calcul du gradient peut prendre quelques secondes sur CPU."
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
                    <h3 className="text-sm font-semibold text-ink">
                      {CLASS_LABELS_FR[result.predicted_class] || result.predicted_class}
                    </h3>
                    <RiskBadge value={result.probability} customLabel={result.ecological_status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-ink-soft mb-1.5 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" /> Image originale
                      </p>
                      <img
                        src={`data:image/png;base64,${result.original_image_base64}`}
                        alt="Original"
                        className="rounded-lg border border-line w-full aspect-square object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-ink-soft mb-1.5 flex items-center gap-1">
                        <ScanEye className="w-3.5 h-3.5" /> Grad-CAM
                      </p>
                      <img
                        src={`data:image/png;base64,${result.gradcam_image_base64}`}
                        alt="Grad-CAM"
                        className="rounded-lg border border-line w-full aspect-square object-cover"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft text-center mt-2 italic">
                    Régions ayant influencé la prédiction du modèle.
                  </p>

                  <p className="text-sm text-ink-soft mt-4 leading-relaxed border-t border-line pt-4">
                    {result.interpretation}
                  </p>
                </Card>

                {chartData && (
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-ink mb-3">Probabilités par classe</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
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
                          width={110}
                          tick={{ fontSize: 12, fill: "var(--color-ink)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => [`${(v * 100).toFixed(1)}%`, "Probabilité"]}
                          contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", fontSize: 12 }}
                        />
                        <Bar dataKey="probability" radius={[0, 6, 6, 0]} barSize={18}>
                          {chartData.map((entry, idx) => (
                            <Cell key={idx} fill={CLASS_COLORS[entry.rawName] || "var(--color-azure)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                <button
                  onClick={() => onNavigate("fusion")}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-azure py-2.5 rounded-xl border border-line hover:bg-paper transition-colors"
                >
                  Continuer vers la fusion multimodale
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {status === "idle" && !file && (
              <Card key="empty" className="p-8 text-center text-sm text-ink-soft">
                Importez une image sous-marine pour démarrer la classification.
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
