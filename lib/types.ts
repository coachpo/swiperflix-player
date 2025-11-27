export type VideoItem = {
  id: string;
  url: string;
  cover?: string;
  title?: string;
  duration?: number;
  orientation?: "portrait" | "landscape";
};

export type PlaylistResponse = {
  items: VideoItem[];
  nextCursor?: string | null;
};

export type ApiConfig = {
  baseUrl: string;
  playlistPath: string;
  likePath: string;
  dislikePath: string;
  impressionPath: string;
  notPlayablePath: string;
  token?: string;
  preloadCount?: number;
  showDebugOverlay?: boolean;
};
