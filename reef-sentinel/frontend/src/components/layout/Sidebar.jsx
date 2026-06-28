import { FlaskConical, Waves, ImageIcon, GitMerge, FileText, LayoutDashboard, Check } from "lucide-react";
import CoralMotif from "../shared/CoralMotif";
import { useRisk } from "../../context/RiskContext";

const NAV_ITEMS = [
  { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, module: null },
  { key: "module1", label: "Microplastiques", number: "01", icon: FlaskConical, module: "module1" },
  { key: "module2", label: "Stress environnemental", number: "02", icon: Waves, module: "module2" },
  { key: "module3", label: "Imagerie sous-marine", number: "03", icon: ImageIcon, module: "module3" },
  { key: "fusion", label: "Fusion multimodale", number: "04", icon: GitMerge, module: "fusion" },
  { key: "report", label: "Rapport final", icon: FileText, module: null },
];

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
  const { results } = useRisk();

  return (
    <>
      {isOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={onClose}
          className="fixed inset-0 bg-abyss/50 z-30 lg:hidden"
        />
      )}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 h-screen w-72 bg-navy text-white z-40 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="relative px-6 pt-7 pb-6 border-b border-white/10 overflow-hidden">
          <CoralMotif className="absolute -right-4 -top-6 w-28 h-32 text-turquoise" opacity={0.12} />
          <div className="relative flex items-center gap-2.5">
            <span className="inline-flex w-8 h-8 rounded-lg bg-turquoise/20 items-center justify-center">
              <Waves className="w-4.5 h-4.5 text-turquoise-light" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Reef Sentinel</span>
          </div>
          <p className="relative text-[11px] text-white/50 mt-2 leading-relaxed">
            Système d'IA multimodal pour l'alerte précoce de la dégradation
            des récifs coralliens
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.key;
            const isDone = item.module && results[item.module];
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors group ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`inline-flex w-8 h-8 rounded-lg items-center justify-center shrink-0 transition-colors ${
                    isActive ? "bg-turquoise text-abyss" : "bg-white/5 text-white/70 group-hover:bg-white/10"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : <item.icon className="w-4 h-4" />}
                </span>
                <span className="flex-1 text-left">
                  {item.number && (
                    <span className="font-mono text-[10px] text-white/40 mr-1.5">{item.number}</span>
                  )}
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
          Pipeline expérimental — résultats à but de recherche, non
          validés pour un diagnostic écologique de terrain.
        </div>
      </aside>
    </>
  );
}
