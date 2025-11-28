import { ApiConfig } from "./types";

const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const envBearerToken =
  process.env.NEXT_PUBLIC_API_BEARER_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN || undefined;

export const apiConfig: ApiConfig = {
  baseUrl: envBaseUrl,
  playlistPath: "/api/v1/playlist",
  likePath: "/api/v1/videos/{id}/like",
  dislikePath: "/api/v1/videos/{id}/dislike",
  impressionPath: "/api/v1/videos/{id}/impression",
  notPlayablePath: "/api/v1/videos/{id}/not-playable",
  token: envBearerToken,
  preloadCount: 3,
};

export function resolveEndpoint(template: string, id?: string) {
  return template.replace("{id}", id ?? "");
}
