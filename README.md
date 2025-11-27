# Swiperflix

Gesture-first short video player built with Next.js 16, React 19, TypeScript, Tailwind CSS, and shadcn/ui. Scroll, swipe, and long-press through clips while sending like/dislike events to your backend or the included mock API.

## Features

- Wheel or swipe to move: vertical for next/previous, horizontal for like/dislike (dislike also advances).
- Playback controls: tap to pause/resume, drag progress bar, speeds 0.75/1/1.5/2x, optional auto-play next.
- Long-press edges: left third rewinds in small steps; right third fast-forwards at 2x.
- Backend configurable in-app (base URL, playlist/like/dislike paths, optional bearer token) and persisted to localStorage with a reset button.
- Auto-refreshes the playlist when the current batch ends and prefetches near the tail.
- Mock playlist API at `/api/mock/playlist` plus bundled demo clips in `public/videos` so it works immediately.

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS + shadcn/ui + Radix primitives

## Quick Start

Prerequisites: Node.js 18.18+ (Node 20 recommended) and pnpm.

```bash
pnpm install
pnpm dev
```

The app runs at http://localhost:3000.

## Configuration

- Environment: `NEXT_PUBLIC_API_BASE_URL` (optional) sets the default backend base URL. Defaults to `/api/mock`.
- Runtime settings (Settings tab): `baseUrl`, `playlistPath`, `likePath`, `dislikePath`, `token` (Bearer). Changes persist to `localStorage`; Reset restores defaults from `lib/config.ts`.
- Default paths: `playlistPath=/playlist`, `likePath=/videos/{id}/like`, `dislikePath=/videos/{id}/dislike`.

## Expected Backend Contract

- `GET {baseUrl}{playlistPath}?cursor=<cursor>` -> `{ items: VideoItem[]; nextCursor: string | null }`
- `POST {baseUrl}{likePath.replace("{id}", id)}`
- `POST {baseUrl}{dislikePath.replace("{id}", id)}`
- `VideoItem`: `{ id: string; url: string; cover?: string; title?: string; duration?: number; orientation?: "portrait" | "landscape" }`

See `docs/api.md` for a fuller proposal, including pagination notes and an optional impression endpoint.

## Mock API for Local Demo

- `GET /api/mock/playlist` returns a small demo playlist (see `app/api/mock/playlist/route.ts`).
- Demo clips live in `public/videos`; swap them or point the app to your own backend via the Settings tab or `NEXT_PUBLIC_API_BASE_URL`.

## Gestures and Controls

- Scroll or swipe up/down: next / previous video.
- Scroll or swipe left/right: like / dislike, then advance.
- Long-press left third: rewind in ~0.4s steps.
- Long-press right third: fast-forward at 2x.
- Tap center: pause/resume. Buttons for play/pause and navigation are also available.
- Drag the progress bar to seek; choose playback speed from the dropdown.

## Project Structure

- `app/` - App Router entry, styles, PWA manifest, mock API route.
- `components/` - Player, settings panel, and shared UI primitives.
- `providers/` - React contexts for playlist state and backend settings.
- `lib/` - Types, config helpers, and API client.
- `public/` - Demo videos and static assets.
- `docs/api.md` - Proposed backend contract.

## Scripts

- `pnpm dev` - start dev server
- `pnpm build` - production build
- `pnpm start` - serve built app
- `pnpm lint` - run eslint with max-warnings=0

## Deployment

1. Configure `NEXT_PUBLIC_API_BASE_URL` (or rely on `/api/mock`).
2. `pnpm install && pnpm build`
3. `pnpm start` to serve the built output.

## License

MIT — see `LICENSE`.
