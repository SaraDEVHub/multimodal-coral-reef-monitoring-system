import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Waves, PlayCircle, ArrowRight, Loader2 } from "lucide-react";
import SectionHeader from "../components/shared/SectionHeader";
import Card from "../components/shared/Card";
import ErrorBanner from "../components/shared/ErrorBanner";
import RiskBadge from "../components/shared/RiskBadge";
import ProbabilityGauge from "../components/shared/ProbabilityGauge";
import { getModule2Features, predictModule2 } from "../api/client";
import { useRisk } from "../context/RiskContext";
import { formatPercent } from "../utils/risk";

export default function Module2Page({ onNavigate }) {
  const { setModuleResult } = useRisk();
  const [schema, setSchema] = useState(null);
  const [values, setValues] = useState({});
  const [schemaError, setSchemaError] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    getModule2Features()
      .then((data) => {
        if (!mounted) return;
        setSchema(data);
        const defaults = {};
        data.features.forEach((f) => {
          defaults[f.name] = f.default;
        });
        setValues(defaults);
      })
      .catch((err) => mounted && setSchemaError(err.message));
    return () => {
      mounted = false;
    };
  }, []);

  function updateValue(name, raw) {
    const num = raw === "" ? "" : Number(raw);
    setValues((prev) => ({ ...prev, [name]: num }));
  }

  async function handlePredict() {
    setStatus("loading");
    setError(null);
    try {
      const data = await predictModule2(values);
      setResult(data);
      setModuleResult("module2", data);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  function rangeFraction(feature) {
    const min = feature.min ?? 0;
    const max = feature.max ?? 1;
    const v = values[feature.name];
    if (v === "" || v === undefined || max === min) return 0;
    return Math.min(Math.max((v - min) / (max - min), 0), 1);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Module 02"
        title="Stress environnemental — HAB"
        icon={Waves}
        description="Renseignez les paramètres physico-chimiques de la colonne d'eau. Le modèle (XGBoost ou MLP selon disponibilité) estime la probabilité de présence d'une efflorescence algale nuisible."
      />

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink mb-1">Paramètres environnementaux</h3>
          {schema && (
            <p className="text-xs text-ink-soft mb-4">
              Champs générés automatiquement depuis les métadonnées du modèle ({schema.model_used}).
            </p>
          )}

          {schemaError && <ErrorBanner message={schemaError} />}

          {!schema && !schemaError && (
            <div className="flex items-center gap-2 text-sm text-ink-soft py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement des variables du modèle…
            </div>
          )}

          {schema && (
            <div className="space-y-4">
              {schema.features.map((feature) => (
                <div key={feature.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor={feature.name} className="text-sm text-ink font-medium">
                      {feature.label}
                      {feature.unit && <span className="text-ink-soft font-normal"> ({feature.unit})</span>}
                    </label>
                    <input
                      id={feature.name}
                      type="number"
                      step={feature.step ?? "any"}
                      value={values[feature.name] ?? ""}
                      onChange={(e) => updateValue(feature.name, e.target.value)}
                      className="font-mono text-sm w-24 text-right border border-line rounded-lg px-2 py-1 bg-mist focus:bg-paper"
                    />
                  </div>
                  {feature.min !== null && feature.max !== null && (
                    <>
                      <input
                        type="range"
                        min={feature.min}
                        max={feature.max}
                        step={feature.step ?? 0.1}
                        value={values[feature.name] ?? feature.default}
                        onChange={(e) => updateValue(feature.name, e.target.value)}
                        className="w-full accent-azure h-1.5"
                      />
                      <div className="flex justify-between text-[10px] text-ink-soft font-mono">
                        <span>{feature.min}</span>
                        <span>{feature.max}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <button
                onClick={handlePredict}
                disabled={status === "loading"}
                className="w-full inline-flex items-center justify-center gap-2 bg-navy text-white text-sm font-medium py-2.5 rounded-xl hover:bg-azure transition-colors disabled:opacity-40"
              >
                <PlayCircle className="w-4 h-4" />
                Prédire le risque HAB
              </button>
            </div>
          )}
        </Card>

        <div>
          <AnimatePresence mode="wait">
            {status === "error" && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ErrorBanner message={error} onDismiss={() => setStatus("idle")} />
              </motion.div>
            )}

            {status === "done" && result && schema && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-ink">Résultat de l'analyse</h3>
                    <RiskBadge value={result.probability} customLabel={result.status} />
                  </div>
                  <div className="flex justify-center">
                    <ProbabilityGauge
                      value={result.probability}
                      size={140}
                      label="P_HAB"
                      sublabel="Probabilité d'efflorescence"
                      animateKey={result.probability}
                    />
                  </div>
                  <p className="text-sm text-ink-soft mt-5 leading-relaxed border-t border-line pt-4">
                    {result.interpretation}
                  </p>
                </Card>

                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-ink mb-3">Position des variables saisies</h3>
                  <div className="space-y-3">
                    {schema.features.map((feature) => (
                      <div key={feature.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-ink-soft">{feature.label}</span>
                          <span className="font-mono text-ink">{values[feature.name]}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-line overflow-hidden">
                          <motion.div
                            className="h-full bg-azure"
                            initial={{ width: 0 }}
                            animate={{ width: `${rangeFraction(feature) * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <button
                  onClick={() => onNavigate("module3")}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-azure py-2.5 rounded-xl border border-line hover:bg-paper transition-colors"
                >
                  Continuer vers le module imagerie sous-marine
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {status !== "done" && status !== "error" && (
              <Card key="empty" className="p-8 text-center text-sm text-ink-soft">
                Renseignez les paramètres puis lancez la prédiction pour voir
                apparaître le risque HAB ici.
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
