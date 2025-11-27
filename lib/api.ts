import { ApiConfig, PlaylistResponse, VideoItem } from "./types";
import { resolveEndpoint } from "./config";

const DEFAULT_TIMEOUT = 10_000;

async function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT) {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request timed out")), ms);
  });
  const result = await Promise.race([promise, timeout]);
  clearTimeout(timer!);
  return result;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await withTimeout(fetch(url, init));
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Request failed (${resp.status}): ${body || resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchPlaylist(config: ApiConfig, cursor?: string | null) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const url = `${config.baseUrl}${config.playlistPath}${qs}`;
  return requestJson<PlaylistResponse>(url);
}

export async function sendReaction(config: ApiConfig, id: string, action: "like" | "dislike") {
  const path = action === "like" ? config.likePath : config.dislikePath;
  const url = `${config.baseUrl}${resolveEndpoint(path, id)}`;
  await requestJson<{ ok: boolean; video?: VideoItem }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
