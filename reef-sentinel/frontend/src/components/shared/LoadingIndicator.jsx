import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function LoadingIndicator({ label = "Analyse en cours…", hint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
    >
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-turquoise/20"
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative w-12 h-12 rounded-full bg-turquoise-soft flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-turquoise animate-spin" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-ink-soft mt-1 max-w-xs">{hint}</p>}
      </div>
    </motion.div>
  );
}
