"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiConfig } from "@/lib/types";
import { defaultApiConfig, hydrateConfig, persistConfig } from "@/lib/config";

type SettingsContextValue = {
  config: ApiConfig;
  updateConfig: (next: Partial<ApiConfig>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ApiConfig>(() => hydrateConfig());

  const updateConfig = (next: Partial<ApiConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...next };
      persistConfig(merged);
      return merged;
    });
  };

  const reset = () => {
    setConfig(defaultApiConfig);
    persistConfig(defaultApiConfig);
  };

  const value = useMemo(
    () => ({
      config,
      updateConfig,
      reset,
    }),
    [config],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
