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
            placeholder="https://api.example.com"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="playlistPath">Playlist path</Label>
            <Input
              id="playlistPath"
              value={draft.playlistPath}
              onChange={(e) => setDraft((prev) => ({ ...prev, playlistPath: e.target.value }))}
              placeholder="/playlist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="likePath">Like path</Label>
            <Input
              id="likePath"
              value={draft.likePath}
              onChange={(e) => setDraft((prev) => ({ ...prev, likePath: e.target.value }))}
              placeholder="/videos/{id}/like"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dislikePath">Dislike path</Label>
            <Input
              id="dislikePath"
              value={draft.dislikePath}
              onChange={(e) => setDraft((prev) => ({ ...prev, dislikePath: e.target.value }))}
              placeholder="/videos/{id}/dislike"
            />
          </div>
        </div>
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
