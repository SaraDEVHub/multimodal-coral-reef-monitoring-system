import { motion } from "framer-motion";
import { FlaskConical, Waves, ImageIcon, GitMerge, ArrowRight, Microscope } from "lucide-react";
import Card from "../components/shared/Card";
import CoralMotif from "../components/shared/CoralMotif";
import { useRisk } from "../context/RiskContext";
import { getRiskLevel, formatPercent } from "../utils/risk";

const MODULES = [
  {
    key: "module1",
    page: "module1",
    number: "01",
    icon: FlaskConical,
    title: "Analyse FTIR",
    description:
      "Détection de microplastiques par signature spectrale infrarouge (XGBoost, 415 nombres d'onde, prétraitement SNV).",
  },
  {
    key: "module2",
    page: "module2",
    number: "02",
    icon: Waves,
    title: "Stress environnemental",
    description:
      "Prédiction d'efflorescence algale nuisible (HAB) à partir de 8 paramètres physico-chimiques de la colonne d'eau.",
  },
  {
    key: "module3",
    page: "module3",
    number: "03",
    icon: ImageIcon,
    title: "Imagerie sous-marine",
    description:
      "Classification de patches d'images (corail vivant, algues, substrat dégradé) par MobileNetV2, avec explicabilité Grad-CAM.",
  },
  {
    key: "fusion",
    page: "fusion",
    number: "04",
    icon: GitMerge,
    title: "Fusion multimodale",
    description:
      "Combinaison pondérée des trois scores de risque en une décision écologique globale unique.",
  },
];

export default function Dashboard({ onNavigate }) {
  const { results } = useRisk();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-navy text-white px-6 sm:px-10 py-10 sm:py-14"
      >
        <CoralMotif className="absolute right-4 sm:right-10 top-0 w-40 sm:w-56 h-full text-turquoise" opacity={0.1} />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase text-turquoise-light mb-3">
            Plateforme scientifique multimodale
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight text-balance">
            Alerte précoce de la dégradation des récifs coralliens
          </h1>
          <p className="text-white/70 mt-4 text-sm sm:text-base leading-relaxed text-balance">
            Trois pipelines d'inférence indépendants — spectroscopie FTIR,
            paramètres environnementaux et imagerie sous-marine — fusionnés
            au niveau décisionnel pour estimer un risque écologique global,
            à partir de modèles déjà entraînés et connectés en direct à ce
            tableau de bord.
          </p>
          <button
            onClick={() => onNavigate("module1")}
            className="mt-7 inline-flex items-center gap-2 bg-turquoise text-abyss font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-turquoise-light transition-colors"
          >
            Démarrer l'analyse
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Module cards */}
      <div>
        <h2 className="font-display text-lg font-semibold text-ink mb-4">Pipeline d'analyse</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {MODULES.map((mod, idx) => {
            const result = results[mod.key];
            const level = result ? getRiskLevel(result.probability) : null;
            return (
              <motion.div
                key={mod.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
              >
                <Card
                  as="button"
                  onClick={() => onNavigate(mod.page)}
                  className="text-left p-5 w-full h-full hover:border-azure-light hover:shadow-[var(--shadow-floating)] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <span className="inline-flex w-10 h-10 rounded-xl bg-navy items-center justify-center">
                      <mod.icon className="w-5 h-5 text-turquoise-light" />
                    </span>
                    <span className="font-mono text-xs text-ink-soft">{mod.number}</span>
                  </div>
                  <h3 className="font-display font-semibold text-ink mt-3.5">{mod.title}</h3>
                  <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{mod.description}</p>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                    {result ? (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: level.color, background: "var(--color-mist)" }}
                      >
                        {formatPercent(result.probability)} · {level.label}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-soft">En attente d'analyse</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-azure" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Methodology note */}
      <Card className="p-5 flex items-start gap-3">
        <span className="inline-flex w-9 h-9 rounded-lg bg-azure/10 items-center justify-center shrink-0">
          <Microscope className="w-4.5 h-4.5 text-azure" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Avertissement scientifique</p>
          <p className="text-sm text-ink-soft mt-1 leading-relaxed">
            Ce système reproduit un pipeline de recherche expérimental fondé
            sur des jeux de données limités (signatures FTIR, données HAB
            synthétiques, images ReefNet RSG réorganisées). Les scores
            produits sont des indicateurs de recherche et ne constituent pas
            un diagnostic écologique validé sur le terrain.
          </p>
        </div>
      </Card>
    </div>
  );
}
