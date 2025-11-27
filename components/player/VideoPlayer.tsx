"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  RotateCw,
  Gauge,
  Heart,
  HeartCrack,
  MoreHorizontal,
  Play,
  Pause,
  Zap,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoSlider } from "@/components/ui/video-slider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn, formatTime } from "@/lib/utils";
import { usePlaylist } from "@/providers/playlist-provider";
import { useToast } from "@/components/ui/use-toast";
import { useSettings } from "@/providers/settings-provider";

const SCROLL_THRESHOLD = 25;
const SWIPE_THRESHOLD = 45;
const LONG_PRESS_DELAY = 250;
const REWIND_STEP = 0.4;
const REWIND_INTERVAL = 200;
const CACHE_LIMIT = 8;
export function VideoPlayer() {
  const {
    current,
    currentIndex,
    videos,
    loading,
    goNext,
    goPrev,
    likeCurrent,
    dislikeCurrent,
    refresh,
  } = usePlaylist();
  const { config } = useSettings();
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [rotation, setRotation] = useState(0);
  const [outgoingRotation, setOutgoingRotation] = useState(0);
  const [reaction, setReaction] = useState<"liked" | "disliked" | null>(null);
  const [pressMode, setPressMode] = useState<"rewind" | "fast" | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const [outgoing, setOutgoing] = useState<typeof current | null>(null);
  const [animating, setAnimating] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [activeEl, setActiveEl] = useState<HTMLVideoElement | null>(null);
  const [outgoingEl, setOutgoingEl] = useState<HTMLVideoElement | null>(null);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const rewindInterval = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastIndexRef = useRef(currentIndex);
  const prevVideoRef = useRef<typeof current>(current);
  const preloadControllers = useRef<Map<string, AbortController>>(new Map());
  const preloadedUrls = useRef<Set<string>>(new Set());
  const preloadedEls = useRef<Map<string, HTMLVideoElement>>(new Map());
  const cachedEls = useRef<Map<string, HTMLVideoElement>>(new Map());
  const objectUrlMap = useRef<Map<string, string>>(new Map());
  const pendingPlayRef = useRef(false);
  const videoHostRef = useRef<HTMLDivElement | null>(null);
  const outgoingHostRef = useRef<HTMLDivElement | null>(null);
  const preloadBudget = useMemo(() => {
    let desired = config.preloadCount ?? 2;
    if (typeof navigator !== "undefined" && (navigator as any).connection) {
      const conn = (navigator as any).connection;
      const type = conn.effectiveType as string | undefined;
      const saveData = !!conn.saveData;
      const downlink = typeof conn.downlink === "number" ? conn.downlink : undefined;
      if (saveData || type === "slow-2g" || type === "2g") desired = 0;
      else if (type === "3g") desired = Math.min(desired, 1);
      else if (type === "4g" && typeof downlink === "number" && downlink < 1.5) desired = Math.min(desired, 1);
    }
    return Math.max(0, Math.min(5, desired));
  }, [config.preloadCount]);

  const ANIMATION_CLASSES = [
    "animate-slide-in-up",
    "animate-slide-in-down",
    "animate-slide-out-up",
    "animate-slide-out-down",
  ];

  const applyVideoStyles = useCallback(
    (
      el: HTMLVideoElement,
      opts: { outgoing?: boolean; orientationOverride?: "portrait" | "landscape" },
    ) => {
      const orient = opts.orientationOverride ?? orientation;
      el.playsInline = true;
      el.loop = true;
      el.muted = !!opts.outgoing;
      el.className = cn(
        "absolute inset-0 h-full w-full object-contain object-center mx-auto block",
        orient === "landscape"
          ? "bg-gradient-to-b from-black/40 to-black/60"
          : "bg-black",
      );
      el.style.transform = `rotate(${opts.outgoing ? outgoingRotation : rotation}deg)`;
      el.style.transformOrigin = "center center";
      el.style.transition = "transform 200ms ease";
    },
    [orientation, rotation, outgoingRotation],
  );

  const applyHostAnimation = useCallback(
    (host: HTMLDivElement | null, opts: { outgoing?: boolean }) => {
      if (!host) return;
      host.classList.remove(...ANIMATION_CLASSES);
      if (!animating) return;

      const cls = opts.outgoing
        ? direction === "prev"
          ? "animate-slide-out-down"
          : "animate-slide-out-up"
        : direction === "prev"
          ? "animate-slide-in-down"
          : "animate-slide-in-up";

      host.classList.add(cls);
    },
    [animating, direction],
  );

  const isUsableCache = useCallback((el: HTMLVideoElement | null | undefined, url: string) => {
    if (!el || !url) return false;
    const matchesUrl = el.src === url || el.dataset.originalUrl === url;
    const hasData = el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    const hasDuration = Number.isFinite(el.duration) && el.duration > 0;
    const networkOk = el.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE;
    return matchesUrl && hasData && hasDuration && networkOk;
  }, []);

  const suspendVideoFetch = useCallback((el: HTMLVideoElement | null | undefined) => {
    if (!el) return;
    el.pause();
    el.autoplay = false;
    el.preload = "metadata";
    el.dataset.suspended = "true";
  }, []);

  const cacheVideoElement = useCallback(
    (url: string, el: HTMLVideoElement | null) => {
      if (!el || !url) return;
      el.dataset.originalUrl = url;
      if (!isUsableCache(el, url)) {
        cachedEls.current.delete(url);
        const existing = objectUrlMap.current.get(url);
        if (existing) {
          URL.revokeObjectURL(existing);
          objectUrlMap.current.delete(url);
        }
        return;
      }
      if (cachedEls.current.has(url)) {
        cachedEls.current.delete(url);
      }
      cachedEls.current.set(url, el);
      while (cachedEls.current.size > CACHE_LIMIT) {
        const oldest = cachedEls.current.keys().next().value as string | undefined;
        if (!oldest) break;
        cachedEls.current.delete(oldest);
        preloadedEls.current.delete(oldest);
        preloadedUrls.current.delete(oldest);
        const existing = objectUrlMap.current.get(oldest);
        if (existing) {
          URL.revokeObjectURL(existing);
          objectUrlMap.current.delete(oldest);
        }
      }
    },
    [isUsableCache],
  );

  const fetchVideoWithAuth = useCallback(
    async (url: string) => {
      if (!config.loadingVideoToken) {
        throw new Error("Missing loadingVideoToken");
      }
      const resp = await fetch(url, { headers: { Authorization: config.loadingVideoToken } });
      if (!resp.ok) throw new Error(`Video request failed (${resp.status})`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const existing = objectUrlMap.current.get(url);
      if (existing) URL.revokeObjectURL(existing);
      objectUrlMap.current.set(url, objectUrl);
      return objectUrl;
    },
    [config.loadingVideoToken],
  );

  // Sync video source for the active video, reusing preloaded element when available
  useEffect(() => {
    if (!current) return;

    const preloadCtrl = preloadControllers.current.get(current.url);
    if (preloadCtrl) {
      preloadCtrl.abort();
      preloadControllers.current.delete(current.url);
    }

    const fromCache = cachedEls.current.get(current.url);
    if (fromCache) {
      cachedEls.current.delete(current.url);
      fromCache.preload = "auto";
      delete fromCache.dataset.suspended;
    }

    const fromPreload = fromCache ?? preloadedEls.current.get(current.url);
    if (fromPreload && preloadedEls.current.has(current.url)) {
      preloadedEls.current.delete(current.url);
    }

    const video = fromPreload ?? document.createElement("video");
    videoRef.current = video;
    setActiveEl(video);

    pendingPlayRef.current = false;
    setPendingPlay(false);
    setIsPlaying(false);
    setIsBuffering(true);

    const onTime = () => setTime(video.currentTime);
    const onLoaded = () => {
      setDuration(video.duration || 0);
      setOrientation(video.videoWidth >= video.videoHeight ? "landscape" : "portrait");
      setTime(0);
      setIsBuffering(false);
      setBuffered(0);
    };
    const onProgress = () => {
      try {
        if (!video.duration || video.buffered.length === 0) {
          setBuffered(0);
          return;
        }
        const end = video.buffered.end(video.buffered.length - 1);
        setBuffered(Math.min(end, video.duration));
      } catch {
        setBuffered(0);
      }
    };
    const onEnded = () => {
      if (autoPlayNext) {
        setDirection("next");
        goNext();
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => {
      setIsBuffering(false);
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        setPendingPlay(false);
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("canplaythrough", onCanPlay);
    video.addEventListener("progress", onProgress);

    const hasUsableCache = isUsableCache(video, current.url);
    const needsLoad = !hasUsableCache || (video.dataset.originalUrl ?? video.src) !== current.url;
    if (needsLoad) {
      const loadWithAuth = async () => {
        try {
          video.preload = "auto";
          const src = await fetchVideoWithAuth(current.url);
          if (videoRef.current !== video) return;
          video.dataset.originalUrl = current.url;
          video.src = src;
          video.load();
        } catch (err) {
          setIsBuffering(false);
          console.error(err);
        }
      };
      loadWithAuth();
    } else if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      // Preloaded element already has metadata; update UI immediately.
      onLoaded();
    }

    const attemptPlay = () => {
      video
        .play()
        .then(() => {
          setIsBuffering(false);
          setIsPlaying(true);
          setPendingPlay(false);
          pendingPlayRef.current = false;
        })
        .catch(() => {
          setIsPlaying(false);
          setPendingPlay(true);
          pendingPlayRef.current = true;
        });
    };

    if (needsLoad) {
      setPendingPlay(true);
      pendingPlayRef.current = true;
      fetchVideoWithAuth(current.url)
        .then((src) => {
          if (videoRef.current !== video) return;
          video.dataset.originalUrl = current.url;
          video.src = src;
          video.load();
          attemptPlay();
        })
        .catch((err) => {
          console.error(err);
          setIsBuffering(false);
        });
    } else {
      attemptPlay();
    }

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlay);
      video.removeEventListener("progress", onProgress);
      suspendVideoFetch(video);
      cacheVideoElement(current.url, video);
    };
  }, [current, goNext, autoPlayNext, cacheVideoElement, isUsableCache, suspendVideoFetch, fetchVideoWithAuth]);

  // Track direction and animate in/out
  useEffect(() => {
    if (!current) return;
    const prev = prevVideoRef.current;
    if (prev && prev.id !== current.id) {
      const dir = currentIndex > lastIndexRef.current ? "next" : "prev";
      setOutgoing(prev);
      setOutgoingEl(activeEl);
      setOutgoingRotation(rotation);
      setDirection(dir);
      setAnimating(true);
      const timer = setTimeout(() => {
        setOutgoing(null);
        setOutgoingEl(null);
        setAnimating(false);
      }, 320);
      lastIndexRef.current = currentIndex;
      prevVideoRef.current = current;
      return () => clearTimeout(timer);
    }
    prevVideoRef.current = current;
    lastIndexRef.current = currentIndex;
  }, [current, currentIndex, rotation, activeEl]);

  // Preload next few videos sequentially (up to PRELOAD_COUNT)
  useEffect(() => {
    if (preloadBudget <= 0 || videos.length === 0) return;

    const urls = videos
      .slice(currentIndex + 1, currentIndex + 1 + preloadBudget)
      .map((v) => v.url)
      .filter(Boolean);

    const desired = new Set(urls);
    preloadControllers.current.forEach((controller, url) => {
      if (!desired.has(url)) {
        controller.abort();
        preloadControllers.current.delete(url);
        preloadedUrls.current.delete(url);
        preloadedEls.current.delete(url);
      }
    });

    const preloadSequential = async () => {
      for (const url of urls) {
        if (preloadedUrls.current.has(url) || preloadControllers.current.has(url)) continue;

        const controller = new AbortController();
        preloadControllers.current.set(url, controller);

        const videoEl = document.createElement("video");
        videoEl.preload = "auto";
        videoEl.playsInline = true;
        videoEl.loop = true;
        preloadedEls.current.set(url, videoEl);

        await new Promise<void>((resolve) => {
          const cleanup = () => {
            videoEl.removeEventListener("canplaythrough", onReady);
            videoEl.removeEventListener("loadeddata", onReady);
            videoEl.removeEventListener("error", onError);
            preloadControllers.current.delete(url);
            if (controller.signal.aborted) {
              preloadedEls.current.delete(url);
              const existing = objectUrlMap.current.get(url);
              if (existing) {
                URL.revokeObjectURL(existing);
                objectUrlMap.current.delete(url);
              }
            }
          };
          const onReady = () => {
            cleanup();
            preloadedUrls.current.add(url);
            cacheVideoElement(url, videoEl);
            resolve();
          };
          const onError = () => {
            cleanup();
            resolve();
          };
          videoEl.addEventListener("canplaythrough", onReady, { once: true });
          videoEl.addEventListener("loadeddata", onReady, { once: true });
          videoEl.addEventListener("error", onError, { once: true });
          fetchVideoWithAuth(url)
            .then((src) => {
              if (controller.signal.aborted) {
                URL.revokeObjectURL(src);
                return;
              }
              videoEl.dataset.originalUrl = url;
              videoEl.src = src;
              videoEl.load();
            })
            .catch(() => {
              onError();
            });
        });
      }
    };

    preloadSequential();

    return () => {
      // Do not abort in-flight on index change to preserve benefit; cleanup happens on unmount below.
    };
  }, [videos, currentIndex, preloadBudget, cacheVideoElement, fetchVideoWithAuth]);

  useEffect(() => {
    const controllers = preloadControllers.current;
    const els = preloadedEls.current;
    const urls = preloadedUrls.current;
    const cache = cachedEls.current;
    const objectUrls = objectUrlMap.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      els.clear();
      urls.clear();
      cache.clear();
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    setRotation(0);
  }, [current?.id]);

  useEffect(() => {
    const host = videoHostRef.current;
    if (!host || !activeEl) return;
    applyVideoStyles(activeEl, { outgoing: false, orientationOverride: orientation });
    applyHostAnimation(host, { outgoing: false });
    host.innerHTML = "";
    host.appendChild(activeEl);
  }, [activeEl, applyVideoStyles, applyHostAnimation, orientation, rotation]);

  useEffect(() => {
    const host = outgoingHostRef.current;
    if (!host) return;
    if (!outgoingEl) {
      host.classList.remove(...ANIMATION_CLASSES);
      host.innerHTML = "";
      return;
    }
    const orient = outgoing?.orientation ?? orientation;
    applyVideoStyles(outgoingEl, { outgoing: true, orientationOverride: orient });
    applyHostAnimation(host, { outgoing: true });
    host.innerHTML = "";
    host.appendChild(outgoingEl);
  }, [
    outgoingEl,
    applyVideoStyles,
    applyHostAnimation,
    outgoing?.orientation,
    orientation,
    outgoingRotation,
  ]);

  // Handle Playback Rate & Press Modes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = pressMode === "fast" ? 2 : playbackRate;
    }
  }, [playbackRate, pressMode]);

  const handleWheel = (event: React.WheelEvent) => {
    const { deltaX, deltaY } = event;
    // Vertical scroll -> Next/Prev
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > SCROLL_THRESHOLD) {
      event.preventDefault();
      if (deltaY < 0) {
         // Scroll down (finger up) -> Next content
         setDirection("next");
         goNext(); 
      } else {
         setDirection("prev");
         goPrev();
      }
      return;
    }
    // Horizontal scroll -> Like/Dislike
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
      if (dy < 0) {
        setDirection("next");
        goNext();
      } else {
        setDirection("prev");
        goPrev();
      }
    }
    touchStart.current = null;
  };

  const handleLike = useCallback(async () => {
    try {
      await likeCurrent();
      setReaction("liked");
      toast({ title: "Liked", description: "Like this video" });
    } catch {
      toast({ title: "Error", description: "Failed to like video" });
    } finally {
      setTimeout(() => setReaction(null), 900);
    }
  }, [likeCurrent, toast]);

  const handleDislike = useCallback(async () => {
    try {
      await dislikeCurrent();
      setReaction("disliked");
      toast({ title: "Disliked", description: "Dislike this video" });
    } catch {
      toast({ title: "Error", description: "Failed to process dislike" });
    } finally {
      setTimeout(() => setReaction(null), 900);
    }
  }, [dislikeCurrent, toast]);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.src) return;

    if (
      video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      setPendingPlay(true);
      pendingPlayRef.current = true;
      setIsBuffering(true);
      video.load();
      return;
    }

    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setPendingPlay(true);
          pendingPlayRef.current = true;
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setDirection("next");
          goNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          setDirection("prev");
          goPrev();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleDislike();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleLike();
          break;
        case " ":
          e.preventDefault();
          handleTogglePlay();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, handleLike, handleDislike, handleTogglePlay]);

  const handleRotate = () => {
    setRotation((prev) => prev + 90);
  };

  const handleSeekCommit = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setTime(value[0]);
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
          videoRef.current.play().catch(() => {});
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
  const friendlyTitle = useMemo(() => current?.title || `Video ${currentIndex + 1}`, [current, currentIndex]);

  if (!current) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">
            {loading ? "Loading playlist..." : "No videos available"}
          </p>
          {!loading && (
            <Button onClick={refresh} variant="secondary">
              Reload
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black select-none touch-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 overflow-hidden">
        {outgoing && <div ref={outgoingHostRef} className="absolute inset-0" />}
        <div ref={videoHostRef} className="absolute inset-0" />
      </div>

      {/* Gesture Zones (Invisible) */}
      <div className="absolute inset-0 grid grid-cols-3 z-10">
        <div
          className="h-full w-full touch-none select-none"
          onPointerDown={() => startPress("rewind")}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(e) => e.preventDefault()}
        />
        <div
          className="h-full w-full touch-none select-none"
          onClick={handleTogglePlay}
          onPointerDown={endPress} // cancel existing press
          onContextMenu={(e) => e.preventDefault()}
        />
        <div
          className="h-full w-full touch-none select-none"
          onPointerDown={() => startPress("fast")}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Overlay UI Layer (Pointer events pass through except on buttons) */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 pb-12">
        
        {/* Top Right: Speed Control (Removed) */}
        <div className="flex justify-end pt-16 pr-2 pointer-events-auto" />

        {/* Main HUD Area */}
        <div className="flex items-end gap-4">
            {/* Bottom Info & Progress */}
            <div className="flex-1 flex flex-col gap-3 pointer-events-auto pb-2">
                {/* Metadata */}
                <div className="space-y-1">
                  <h2 className="font-semibold text-white drop-shadow-md">{friendlyTitle}</h2>
                </div>

        {/* Full Width Scrub Bar */}
        <div 
          className="w-full pointer-events-auto absolute bottom-8 left-0 z-10 px-8 pr-24 sm:pr-32"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="relative h-6 w-full">
            <div
              className="absolute inset-y-2 left-0 rounded-full bg-white/20 pointer-events-none"
              style={{
                width: duration ? `${Math.min(buffered / duration, 1) * 100}%` : "0%",
              }}
            />
            <VideoSlider
              value={[isScrubbing ? time : progress]}
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.05}
              onValueChange={(v) => {
                setIsScrubbing(true);
                setTime(v[0]);
              }}
              onValueCommit={handleSeekCommit}
              className="cursor-pointer h-6 w-full relative"
            />
          </div>
        </div>
            </div>

            {/* Right Action Bar (Vertical Stack) */}
            <div className="flex flex-col gap-4 pointer-events-auto items-center pb-10">
                {/* Profile / Follow placeholder (optional, kept simple) */}
                
                {/* Like */}
                <div className="flex flex-col items-center gap-1">
                   <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-12 w-12 p-0 bg-transparent hover:bg-transparent text-white transition-all active:scale-90 shadow-none"
                      onClick={handleRotate}
                   >
                      <RotateCw className="h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                   </Button>
                   <span className="text-[10px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Rotate</span>
                </div>

                {/* Like */}
                <div className="flex flex-col items-center gap-1">
                   <Button 
                      size="icon" 
                      variant="ghost" 
                      className={cn(
                        "h-12 w-12 p-0 bg-transparent hover:bg-transparent text-white transition-all active:scale-90 shadow-none",
                        reaction === 'liked' && "text-red-500"
                      )}
                      onClick={handleLike}
                   >
                      <Heart className={cn("h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]", reaction === 'liked' && "fill-current")} />
                   </Button>
                   <span className="text-[10px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Like</span>
                </div>

                {/* Dislike */}
                <div className="flex flex-col items-center gap-1">
                   <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-12 w-12 p-0 bg-transparent hover:bg-transparent text-white transition-all active:scale-90 shadow-none"
                      onClick={handleDislike}
                   >
                      <HeartCrack className="h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                   </Button>
                   <span className="text-[10px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Dislike</span>
                </div>

                 {/* More / Options */}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-10 w-10 p-0 bg-transparent hover:bg-transparent text-white/80 shadow-none"
                       >
                          <MoreHorizontal className="h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="left" className="w-56 bg-black/90 border-white/10 text-white mr-2">
                       <DropdownMenuLabel className="text-xs text-white/50 uppercase tracking-wider">Playback Settings</DropdownMenuLabel>
                       
                       <DropdownMenuCheckboxItem
                          checked={autoPlayNext}
                          onCheckedChange={setAutoPlayNext}
                          className="text-sm focus:bg-white/20 focus:text-white cursor-pointer data-[state=checked]:bg-white/10"
                       >
                          Auto-play next video
                       </DropdownMenuCheckboxItem>
                       
                       <DropdownMenuSeparator className="bg-white/10" />
                       
                       <DropdownMenuLabel className="text-xs text-white/50 uppercase tracking-wider mt-1">Speed</DropdownMenuLabel>
                       {[0.5, 0.75, 1, 1.5, 2, 3].map((speed) => (
                         <DropdownMenuItem 
                            key={speed} 
                            onClick={() => setPlaybackRate(speed)}
                            className={cn(
                                "justify-between text-sm focus:bg-white/20 focus:text-white cursor-pointer",
                                playbackRate === speed && "bg-white/10 text-white"
                            )}
                         >
                           <span>{speed}x</span>
                           {playbackRate === speed && <Zap className="h-3 w-3 fill-current" />}
                         </DropdownMenuItem>
                       ))}
                    </DropdownMenuContent>
                 </DropdownMenu>
            </div>
        </div>

        {/* Central Status Badges (Toast-like overlays) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col gap-2 items-center">
           {isBuffering && (
              <div className="flex flex-col items-center gap-3 bg-black/50 px-5 py-4 rounded-2xl backdrop-blur-sm animate-in fade-in">
                <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-xs uppercase tracking-[0.2em] text-white/80">Loading</span>
              </div>
           )}
           {!isPlaying && !loading && (
              <div className="bg-black/40 rounded-full p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                 <Play className="h-8 w-8 text-white/90 fill-white/90" />
              </div>
           )}
           
           {pressMode === "fast" && (
              <Badge className="bg-black/40 text-white/80 backdrop-blur-sm px-3 py-1.5 text-xs animate-pulse border-none">
                 <Zap className="mr-2 h-3 w-3 fill-white/80 text-white/80" />
                 2x Speed
              </Badge>
           )}
           
           {pressMode === "rewind" && (
              <Badge className="bg-black/60 text-white backdrop-blur-md px-4 py-2 text-sm animate-pulse border-none">
                 <ArrowLeft className="mr-2 h-4 w-4" />
                 Rewinding...
              </Badge>
           )}
        </div>
      </div>
    </div>
  );
}
