"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Gauge,
  Pause,
  Play,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatTime } from "@/lib/utils";
import { usePlaylist } from "@/providers/playlist-provider";
import { useToast } from "@/components/ui/use-toast";

const SCROLL_THRESHOLD = 25;
const SWIPE_THRESHOLD = 45;
const LONG_PRESS_DELAY = 250;
const REWIND_STEP = 0.4; // seconds per tick
const REWIND_INTERVAL = 200; // ms

export function VideoPlayer() {
  const {
    current,
    currentIndex,
    videos,
    loading,
    error,
    goNext,
    goPrev,
    likeCurrent,
    dislikeCurrent,
    refresh,
  } = usePlaylist();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [reaction, setReaction] = useState<"liked" | "disliked" | null>(null);
  const [pressMode, setPressMode] = useState<"rewind" | "fast" | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const rewindInterval = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Load / reset video whenever the current item changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return;

    const onTime = () => setTime(video.currentTime);
    const onLoaded = () => {
      setDuration(video.duration || 0);
      setOrientation(video.videoWidth >= video.videoHeight ? "landscape" : "portrait");
      setTime(0);
    };
    const onEnded = () => goNext();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    video.src = current.url;
    video.load();
    video.play().catch(() => setIsPlaying(false));

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [current, goNext]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = pressMode === "fast" ? 2 : playbackRate;
    }
  }, [playbackRate, pressMode]);

  const handleWheel = (event: React.WheelEvent) => {
    const { deltaX, deltaY } = event;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > SCROLL_THRESHOLD) {
      event.preventDefault();
      if (deltaY < 0) goNext();
      else goPrev();
      return;
    }
    if (Math.abs(deltaX) > SCROLL_THRESHOLD) {
      event.preventDefault();
      if (deltaX > 0) handleLike();
      else handleDislike();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      dx > 0 ? handleLike() : handleDislike();
    } else if (Math.abs(dy) > SWIPE_THRESHOLD) {
      dy < 0 ? goNext() : goPrev();
    }
    touchStart.current = null;
  };

  const handleLike = async () => {
    try {
      await likeCurrent();
      setReaction("liked");
      toast({ title: "Liked", description: "Sent to backend." });
    } catch (err) {
      toast({ title: "Failed to like", description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setTimeout(() => setReaction(null), 900);
    }
  };

  const handleDislike = async () => {
    try {
      await dislikeCurrent();
      setReaction("disliked");
      toast({ title: "Disliked", description: "Sent to backend." });
    } catch (err) {
      toast({ title: "Failed to dislike", description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setTimeout(() => setReaction(null), 900);
    }
  };

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeekCommit = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const nextTime = value[0];
    video.currentTime = nextTime;
    setTime(nextTime);
    setIsScrubbing(false);
  };

  const startPress = (mode: "rewind" | "fast") => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (rewindInterval.current) clearInterval(rewindInterval.current);
    pressTimer.current = setTimeout(() => {
      setPressMode(mode);
      if (mode === "fast") {
        if (videoRef.current) {
          videoRef.current.playbackRate = 2;
          void videoRef.current.play().catch(() => undefined);
        }
      } else {
        rewindInterval.current = setInterval(() => {
          const video = videoRef.current;
          if (!video) return;
          video.currentTime = Math.max(0, video.currentTime - REWIND_STEP);
        }, REWIND_INTERVAL);
      }
    }, LONG_PRESS_DELAY);
  };

  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (rewindInterval.current) clearInterval(rewindInterval.current);
    pressTimer.current = null;
    rewindInterval.current = null;
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
    setPressMode(null);
  };

  const progress = duration ? Math.min(time, duration) : 0;
  const friendlyTitle = useMemo(() => current?.title || `Video ${currentIndex + 1}`, [current?.title, currentIndex]);

  if (!current) {
    return (
      <div className="grid gap-4 md:grid-cols-[1fr,320px]">
        <div className="aspect-[9/16] w-full animate-pulse rounded-3xl bg-white/5" />
        <Card className="glass border-white/10 bg-white/5">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading playlist…" : "No videos available. Check backend settings and reload."}
            </p>
            <Button onClick={refresh} variant="secondary" className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col gap-4"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid gap-4 md:grid-cols-[1fr,320px]">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl border border-white/10 bg-black/70 video-shadow">
          <video
            ref={videoRef}
            playsInline
            className={cn(
              "h-full w-full object-contain transition-all duration-500",
              orientation === "landscape" ? "bg-gradient-to-b from-black/40 to-black/60" : "bg-black",
            )}
          />

          {/* Overlay controls zones */}
          <div className="absolute inset-0 grid grid-cols-3">
            <button
              aria-label="rewind"
              className="h-full w-full"
              onPointerDown={() => startPress("rewind")}
              onPointerUp={endPress}
              onPointerLeave={endPress}
            />
            <button
              aria-label="toggle"
              className="h-full w-full"
              onClick={handleTogglePlay}
              onPointerDown={endPress}
            />
            <button
              aria-label="fast-forward"
              className="h-full w-full"
              onPointerDown={() => startPress("fast")}
              onPointerUp={endPress}
              onPointerLeave={endPress}
            />
          </div>

          {/* HUD */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/70">
              <span className="glass rounded-full px-3 py-1 text-[10px]">{friendlyTitle}</span>
              <span className="glass rounded-full px-3 py-1 text-[10px]">
                {currentIndex + 1}/{videos.length || "…"}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Slider
                value={[isScrubbing ? time : progress]}
                min={0}
                max={Math.max(duration, time + 0.1)}
                step={0.05}
                onValueChange={(v) => {
                  setIsScrubbing(true);
                  setTime(v[0]);
                }}
                onValueCommit={handleSeekCommit}
              />
              <div className="flex items-center justify-between text-xs text-white/70">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="glass">
                    <Gauge className="mr-1 h-3 w-3" />
                    {orientation === "landscape" ? "Landscape" : "Portrait"}
                  </Badge>
                  {pressMode === "fast" && (
                    <Badge variant="success" className="glass animate-pulse">
                      <Zap className="mr-1 h-3 w-3" />
                      2x Fast
                    </Badge>
                  )}
                  {pressMode === "rewind" && (
                    <Badge variant="danger" className="glass animate-pulse">
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      Rewinding
                    </Badge>
                  )}
                  {reaction === "liked" && (
                    <Badge variant="success" className="glass">
                      <ThumbsUp className="mr-1 h-3 w-3" />
                      Liked
                    </Badge>
                  )}
                  {reaction === "disliked" && (
                    <Badge variant="danger" className="glass">
                      <ThumbsDown className="mr-1 h-3 w-3" />
                      Disliked
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-right tabular-nums">
                  <span>{formatTime(progress)}</span>
                  <span className="opacity-60">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="glass border-white/10 bg-white/5">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Playback</p>
                <p className="text-lg font-semibold">{friendlyTitle}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={refresh} title="Reload playlist">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={goPrev} variant="secondary" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button onClick={goNext} className="flex-1">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex-1" onClick={handleTogglePlay}>
                {isPlaying ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Play
                  </>
                )}
              </Button>
              <Select
                value={String(playbackRate)}
                onValueChange={(value) => {
                  const rate = Number(value);
                  setPlaybackRate(rate);
                  if (videoRef.current) videoRef.current.playbackRate = rate;
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Speed" />
                </SelectTrigger>
                <SelectContent>
                  {[0.75, 1, 1.5, 2].map((speed) => (
                    <SelectItem key={speed} value={String(speed)}>
                      {speed}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={handleDislike} className="border border-white/10 bg-destructive/10">
                <ThumbsDown className="mr-2 h-4 w-4" /> Dislike & Next
              </Button>
              <Button variant="ghost" onClick={handleLike} className="border border-white/10 bg-emerald-500/10">
                <ThumbsUp className="mr-2 h-4 w-4" /> Like & Next
              </Button>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Loading playlist…</p>}
            {error && (
              <p className="text-sm text-red-400">
                {error} — check backend settings or reload.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
