"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
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

const SCROLL_THRESHOLD = 25;
const SWIPE_THRESHOLD = 45;
const LONG_PRESS_DELAY = 250;
const REWIND_STEP = 0.4;
const REWIND_INTERVAL = 200;

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
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const rewindInterval = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Sync video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return;

    const onTime = () => setTime(video.currentTime);
    const onLoaded = () => {
      setDuration(video.duration || 0);
      setOrientation(video.videoWidth >= video.videoHeight ? "landscape" : "portrait");
      setTime(0);
    };
    const onEnded = () => {
      if (autoPlayNext) goNext();
    };
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
      if (deltaY < 0) goNext(); // Standard scroll down (finger up) -> Next content
      else goPrev();
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
      dy < 0 ? goNext() : goPrev();
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
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
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
          goNext();
          break;
        case "ArrowUp":
          e.preventDefault();
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
      <video
        ref={videoRef}
        playsInline
        loop
        className={cn(
          "h-full w-full object-contain transition-all duration-500",
          orientation === "landscape" ? "bg-gradient-to-b from-black/40 to-black/60" : "bg-black"
        )}
      />

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
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 pb-8">
        
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

                {/* Scrub Bar */}
                <div className="w-full flex items-center gap-3">
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
                      className="flex-1 cursor-pointer h-4 py-2"
                   />
                   <span className="text-[10px] tabular-nums text-white/80 w-16 text-right">
                     {formatTime(progress)} / {formatTime(duration)}
                   </span>
                </div>
            </div>

            {/* Right Action Bar (Vertical Stack) */}
            <div className="flex flex-col gap-4 pointer-events-auto items-center pb-6">
                {/* Profile / Follow placeholder (optional, kept simple) */}
                
                {/* Like */}
                <div className="flex flex-col items-center gap-1">
                   <Button 
                      size="icon" 
                      variant="ghost" 
                      className={cn(
                        "h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all active:scale-90",
                        reaction === 'liked' && "text-red-500 bg-white/10"
                      )}
                      onClick={handleLike}
                   >
                      <Heart className={cn("h-6 w-6", reaction === 'liked' && "fill-current")} />
                   </Button>
                   <span className="text-[10px] font-medium text-white shadow-black drop-shadow-md">Like</span>
                </div>

                {/* Dislike */}
                <div className="flex flex-col items-center gap-1">
                   <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all active:scale-90"
                      onClick={handleDislike}
                   >
                      <HeartCrack className="h-6 w-6" />
                   </Button>
                   <span className="text-[10px] font-medium text-white shadow-black drop-shadow-md">Dislike</span>
                </div>

                 {/* More / Options */}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-10 w-10 rounded-full bg-black/20 hover:bg-black/40 text-white/80"
                       >
                          <MoreHorizontal className="h-5 w-5" />
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
