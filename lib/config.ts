import { ApiConfig } from "./types";

export const defaultApiConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  playlistPath: "/api/v1/playlist",
  likePath: "/api/v1/videos/{id}/like",
  dislikePath: "/api/v1/videos/{id}/dislike",
  loadingVideoToken: undefined,
  preloadCount: 2,
};

export const SETTINGS_STORAGE_KEY = "swiperflix-settings";

export function hydrateConfig(): ApiConfig {
  if (typeof window === "undefined") return defaultApiConfig;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultApiConfig;
    const parsed = JSON.parse(raw) as Partial<ApiConfig>;
    const merged: ApiConfig = {
      ...defaultApiConfig,
      ...parsed,
      loadingVideoToken: parsed.loadingVideoToken ?? parsed.token ?? defaultApiConfig.loadingVideoToken,
    };
    return merged;
  } catch (error) {
    console.error("Failed to read stored config", error);
    return defaultApiConfig;
  }
}

export function persistConfig(config: ApiConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config));
}

export function resolveEndpoint(template: string, id?: string) {
  return template.replace("{id}", id ?? "");
}
