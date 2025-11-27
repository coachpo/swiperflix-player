"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchPlaylist, sendReaction } from "@/lib/api";
import { VideoItem } from "@/lib/types";
import { useSettings } from "./settings-provider";

type PlaylistContextValue = {
  videos: VideoItem[];
  currentIndex: number;
  current?: VideoItem;
  loading: boolean;
  error?: string;
  goNext: () => void;
  goPrev: () => void;
  likeCurrent: () => Promise<void>;
  dislikeCurrent: () => Promise<void>;
  refresh: () => Promise<void>;
};

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const { config } = useSettings();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const pendingMore = useRef(false);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const resp = await fetchPlaylist(config, null);
      setVideos(resp.items || []);
      setCursor(resp.nextCursor ?? null);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playlist");
    } finally {
      setLoading(false);
    }
  }, [config]);

  const loadMore = useCallback(async () => {
    if (loadingMore || pendingMore.current) return;
    pendingMore.current = true;
    setLoadingMore(true);
    try {
      const resp = await fetchPlaylist(config, cursor);
      setVideos((prev) => [...prev, ...(resp.items || [])]);
      setCursor(resp.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      pendingMore.current = false;
      setLoadingMore(false);
    }
  }, [config, cursor, loadingMore]);

  const ensureFuture = useCallback(
    (targetIndex: number) => {
      if (videos.length === 0) {
        void bootstrap();
        return;
      }
      const nearEnd = targetIndex >= videos.length - 1;
      if (nearEnd) {
        if (cursor !== null) {
          void loadMore();
        } else if (!loadingMore) {
          // playlist exhausted — request a new one
          void bootstrap();
        }
      }
    },
    [videos.length, bootstrap, cursor, loadMore, loadingMore],
  );

  const goNext = useCallback(() => {
    setCurrentIndex((idx) => {
      const nextIndex = Math.min(idx + 1, Math.max(videos.length - 1, 0));
      ensureFuture(nextIndex);
      return nextIndex;
    });
  }, [ensureFuture, videos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((idx) => Math.max(idx - 1, 0));
  }, []);

  const likeCurrent = useCallback(async () => {
    const video = videos[currentIndex];
    if (!video) return;
    await sendReaction(config, video.id, "like");
    goNext();
  }, [config, currentIndex, goNext, videos]);

  const dislikeCurrent = useCallback(async () => {
    const video = videos[currentIndex];
    if (!video) return;
    await sendReaction(config, video.id, "dislike");
    goNext();
  }, [config, currentIndex, goNext, videos]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const value = useMemo(
    () => ({
      videos,
      currentIndex,
      current: videos[currentIndex],
      loading,
      error,
      goNext,
      goPrev,
      likeCurrent,
      dislikeCurrent,
      refresh: bootstrap,
    }),
    [videos, currentIndex, loading, error, goNext, goPrev, likeCurrent, dislikeCurrent, bootstrap],
  );

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used inside PlaylistProvider");
  return ctx;
}
