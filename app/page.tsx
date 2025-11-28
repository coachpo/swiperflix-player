"use client";

import { VideoPlayer } from "@/components/player/VideoPlayer";
import { PlaylistProvider } from "@/providers/playlist-provider";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <PlaylistProvider>
      <main className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
        <VideoPlayer />
      </main>
      <Toaster />
    </PlaylistProvider>
  );
}
