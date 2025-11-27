import { ApiConfig } from "./types";

export const defaultApiConfig: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "/api/mock",
  playlistPath: "/playlist",
  likePath: "/videos/{id}/like",
  dislikePath: "/videos/{id}/dislike",
};

export const SETTINGS_STORAGE_KEY = "douyin-player-settings";

export function hydrateConfig(): ApiConfig {
  if (typeof window === "undefined") return defaultApiConfig;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultApiConfig;
    const parsed = JSON.parse(raw) as Partial<ApiConfig>;
    return {
      ...defaultApiConfig,
      ...parsed,
    };
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
