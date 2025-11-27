import { NextResponse } from "next/server";
import { PlaylistResponse } from "@/lib/types";

const demoPlaylist: PlaylistResponse = {
  items: [
    {
      id: "demo-1",
      title: "Portrait vibes",
      url: "/videos/哈哈.mp4",
      orientation: "portrait",
    },
    {
      id: "demo-2",
      title: "City night ride",
      url: "/videos/年年如意.mp4",
      orientation: "landscape",
    },
    {
      id: "demo-3",
      title: "Dance loop",
      url: "/videos/浅跳一下.mp4",
      orientation: "portrait",
    },
  ],
  nextCursor: null,
};

export async function GET() {
  return NextResponse.json(demoPlaylist);
}
