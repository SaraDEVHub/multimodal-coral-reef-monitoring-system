import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Module1Page from "./pages/Module1Page";
import Module2Page from "./pages/Module2Page";
import Module3Page from "./pages/Module3Page";
import FusionPage from "./pages/FusionPage";
import ReportPage from "./pages/ReportPage";
import { RiskProvider } from "./context/RiskContext";

const PAGE_TITLES = {
  dashboard: "Vue d'ensemble",
  module1: "Module 01 — Analyse FTIR",
  module2: "Module 02 — Stress environnemental",
  module3: "Module 03 — Imagerie sous-marine",
  fusion: "Module 04 — Fusion multimodale",
  report: "Rapport final",
};

function PageContent({ page, onNavigate }) {
  switch (page) {
    case "module1":
      return <Module1Page onNavigate={onNavigate} />;
    case "module2":
      return <Module2Page onNavigate={onNavigate} />;
    case "module3":
      return <Module3Page onNavigate={onNavigate} />;
    case "fusion":
      return <FusionPage onNavigate={onNavigate} />;
    case "report":
      return <ReportPage onNavigate={onNavigate} />;
    default:
      return <Dashboard onNavigate={onNavigate} />;
  }
}

export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <RiskProvider>
      <AppShell activePage={page} onNavigate={setPage} title={PAGE_TITLES[page]}>
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <PageContent page={page} onNavigate={setPage} />
          </motion.div>
        </AnimatePresence>
      </AppShell>
    </RiskProvider>
  );
}
