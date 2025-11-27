"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/providers/settings-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function SettingsPanel() {
  const { config, updateConfig, reset } = useSettings();
  const { toast } = useToast();
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const handleSave = () => {
    updateConfig(draft);
    toast({ title: "Settings saved", description: "Backend endpoints updated." });
  };

  return (
    <Card className="glass border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-base uppercase tracking-[0.1em] text-muted-foreground">Backend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input
            id="baseUrl"
            value={draft.baseUrl}
            onChange={(e) => setDraft((prev) => ({ ...prev, baseUrl: e.target.value }))}
            placeholder="http://localhost:8000"
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="playlistPath">Playlist path</Label>
            <Input
              id="playlistPath"
              value={draft.playlistPath}
              onChange={(e) => setDraft((prev) => ({ ...prev, playlistPath: e.target.value }))}
              placeholder="/api/v1/playlist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="likePath">Like path</Label>
            <Input
              id="likePath"
              value={draft.likePath}
              onChange={(e) => setDraft((prev) => ({ ...prev, likePath: e.target.value }))}
              placeholder="/api/v1/videos/{id}/like"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dislikePath">Dislike path</Label>
            <Input
              id="dislikePath"
              value={draft.dislikePath}
              onChange={(e) => setDraft((prev) => ({ ...prev, dislikePath: e.target.value }))}
              placeholder="/api/v1/videos/{id}/dislike"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="token">Bearer token (optional)</Label>
          <Input
            id="token"
            type="password"
            value={draft.token ?? ""}
            onChange={(e) => setDraft((prev) => ({ ...prev, token: e.target.value }))}
            placeholder="sk-..."
          />
          <p className="text-xs text-muted-foreground">
            If provided, requests include Authorization: Bearer &lt;token&gt;.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preloadCount">Preload next videos (auto-adjusts on slow networks)</Label>
          <Input
            id="preloadCount"
            type="number"
            min={0}
            max={5}
            step={1}
            value={draft.preloadCount ?? 2}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                preloadCount: Math.max(0, Math.min(5, Number(e.target.value) || 0)),
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Defaults to 2; may be reduced automatically on slow connections or data saver.
          </p>
        </div>
        <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer gap-3">
          <div className="space-y-1">
            <span className="text-sm font-medium">Show debug overlay</span>
            <p className="text-xs text-muted-foreground">
              Enable first-frame and rebuffer counters (for debugging only).
            </p>
          </div>
          <Input
            type="checkbox"
            className="h-5 w-5"
            checked={!!draft.showDebugOverlay}
            onChange={(e) => setDraft((prev) => ({ ...prev, showDebugOverlay: e.target.checked }))}
          />
        </label>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Apply
          </Button>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
