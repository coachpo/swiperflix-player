import { ApiConfig, PlaylistResponse, VideoItem } from "./types";
import { resolveEndpoint } from "./config";

const DEFAULT_TIMEOUT = 10_000;
type ImpressionPayload = {
  watchedSeconds: number;
  completed: boolean;
};

type NotPlayablePayload = {
  reason?: string | null;
  timestamp?: string | null;
  sessionId?: string | null;
};

function sameOrigin(target: URL, base: URL) {
  return target.protocol === base.protocol && target.host === base.host;
}

function resolveMediaUrl(url: string, config: ApiConfig) {
  const baseUrl = new URL(config.baseUrl, config.baseUrl.startsWith("http") ? undefined : "http://localhost");

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    target = new URL(url, baseUrl);
  }

  return target.href;
}

async function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT) {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request timed out")), ms);
  });
  const result = await Promise.race([promise, timeout]);
  clearTimeout(timer!);
  return result;
}

function authHeaders(config: ApiConfig): Record<string, string> {
  return config.token ? { Authorization: `Bearer ${config.token}` } : {};
}

async function requestJson<T>(url: string, init: RequestInit = {}, config?: ApiConfig): Promise<T> {
  const resp = await withTimeout(
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        ...(config ? authHeaders(config) : {}),
      },
    }),
  );
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Request failed (${resp.status}): ${body || resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchPlaylist(config: ApiConfig, cursor?: string | null) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const url = `${config.baseUrl}${config.playlistPath}${qs}`;
  const resp = await requestJson<PlaylistResponse>(url, {}, config);
  return {
    ...resp,
    items: (resp.items || []).map((item) => ({
      ...item,
      url: resolveMediaUrl(item.url, config),
    })),
  };
}

export async function sendReaction(config: ApiConfig, id: string, action: "like" | "dislike") {
  const path = action === "like" ? config.likePath : config.dislikePath;
  const url = `${config.baseUrl}${resolveEndpoint(path, id)}`;
  await requestJson<{ ok: boolean; video?: VideoItem }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }, config);
}

export async function sendImpression(config: ApiConfig, id: string, payload: ImpressionPayload) {
  const url = `${config.baseUrl}${resolveEndpoint(config.impressionPath, id)}`;
  const resp = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(config),
      },
      body: JSON.stringify(payload),
    }),
  );

  if (resp.ok) return true;
  if (resp.status === 404) throw new Error("VIDEO_NOT_FOUND");
  const data = await resp.json().catch(() => undefined);
  throw new Error(data?.error?.message ?? "Impression failed");
}

export async function reportNotPlayable(config: ApiConfig, id: string, payload: NotPlayablePayload) {
  const url = `${config.baseUrl}${resolveEndpoint(config.notPlayablePath, id)}`;
  const resp = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(config),
      },
      body: JSON.stringify(payload),
    }),
  );

  if (resp.ok) return { ok: true, duplicate: false as const };
  if (resp.status === 409) return { ok: false, duplicate: true as const };
  if (resp.status === 404) throw new Error("VIDEO_NOT_FOUND");
  const data = await resp.json().catch(() => undefined);
  throw new Error(data?.error?.message ?? "Report failed");
}
