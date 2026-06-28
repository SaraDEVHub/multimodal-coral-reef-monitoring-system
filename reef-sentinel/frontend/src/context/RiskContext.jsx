import { createContext, useCallback, useContext, useMemo, useState } from "react";

const RiskContext = createContext(null);

const initialState = {
  module1: null, // { probability, ... }
  module2: null,
  module3: null,
};

export function RiskProvider({ children }) {
  const [results, setResults] = useState(initialState);

  const setModuleResult = useCallback((moduleKey, result) => {
    setResults((prev) => ({ ...prev, [moduleKey]: result }));
  }, []);

  const resetAll = useCallback(() => setResults(initialState), []);

  const completedCount = useMemo(
    () => Object.values(results).filter(Boolean).length,
    [results]
  );

  const value = useMemo(
    () => ({ results, setModuleResult, resetAll, completedCount }),
    [results, setModuleResult, resetAll, completedCount]
  );

  return <RiskContext.Provider value={value}>{children}</RiskContext.Provider>;
}

export function useRisk() {
  const ctx = useContext(RiskContext);
  if (!ctx) throw new Error("useRisk doit être utilisé à l'intérieur de <RiskProvider>");
  return ctx;
}
