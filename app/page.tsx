"use client";

import { useState } from "react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PlaylistProvider } from "@/providers/playlist-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Tab = "player" | "settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("player");

  return (
    <SettingsProvider>
      <PlaylistProvider>
        <main className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
          {/* Top Navigation */}
          <header className="absolute top-0 left-0 z-50 flex w-full items-center justify-center gap-6 pt-8 pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <div className="pointer-events-auto flex gap-6">
              <button
                onClick={() => setActiveTab("player")}
                className={cn(
                  "text-base font-medium transition-all drop-shadow-md",
                  activeTab === "player" 
                    ? "text-white scale-110 font-semibold" 
                    : "text-white/60 hover:text-white/80"
                )}
              >
                Player
              </button>
              <div className="h-6 w-[1px] bg-white/20 self-center" />
              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "text-base font-medium transition-all drop-shadow-md",
                  activeTab === "settings" 
                    ? "text-white scale-110 font-semibold" 
                    : "text-white/60 hover:text-white/80"
                )}
              >
                Settings
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className="h-full w-full">
            {activeTab === "player" && (
              <div className="h-full w-full">
                <VideoPlayer />
              </div>
            )}

            {activeTab === "settings" && (
              <div className="h-full w-full overflow-y-auto bg-black/90 pt-24 pb-10 px-4 md:px-6">
                 <div className="mx-auto max-w-md">
                    <SettingsPanel />
                 </div>
              </div>
            )}
          </div>
        </main>
        <Toaster />
      </PlaylistProvider>
    </SettingsProvider>
  );
}
