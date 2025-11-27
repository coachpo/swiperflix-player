"use client";

import { VideoPlayer } from "@/components/player/VideoPlayer";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PlaylistProvider } from "@/providers/playlist-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { Toaster } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <SettingsProvider>
      <PlaylistProvider>
        <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Douyin Slider Player</p>
              <h1 className="text-2xl font-semibold">Gesture-first short-video experience</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="glass">
                Scroll: up/down next/prev · left/right like/dislike
              </Badge>
              <Badge variant="secondary" className="glass">
                Long-press edges to 2x seek
              </Badge>
            </div>
          </header>

          <VideoPlayer />
          <SettingsPanel />
        </main>
        <Toaster />
      </PlaylistProvider>
    </SettingsProvider>
  );
}
