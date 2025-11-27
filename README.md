# Swiperflix

Gesture-first short video player built with Next.js 16, React 19, TypeScript, Tailwind CSS, and shadcn/ui. Scroll, swipe, and long-press through clips while sending like/dislike events to your backend.

## Features

- Wheel or swipe to move: vertical for next/previous, horizontal for like/dislike (dislike also advances).
- Playback controls: tap to pause/resume, drag progress bar, speeds 0.75/1/1.5/2x, optional auto-play next.
- Long-press edges: left third rewinds in small steps; right third fast-forwards at 2x.
- Backend configurable in-app (base URL, playlist/like/dislike paths, optional bearer token) and persisted to localStorage with a reset button.
- Auto-refreshes the playlist when the current batch ends and prefetches near the tail.

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
Ensure your backend API is reachable at http://localhost:8000 (matching the defaults) or update the Settings tab.

## Configuration

- Environment: `NEXT_PUBLIC_API_BASE_URL` (optional) sets the default backend base URL. Defaults to `http://localhost:8000`.
- Runtime settings (Settings tab): `baseUrl`, `playlistPath`, `likePath`, `dislikePath`, `token` (Bearer). Changes persist to `localStorage`; Reset restores defaults from `lib/config.ts`.
- Default paths: `baseUrl=http://localhost:8000`, `playlistPath=/api/v1/playlist`, `likePath=/api/v1/videos/{id}/like`, `dislikePath=/api/v1/videos/{id}/dislike`.
- Streaming auth: clients fetch video URLs directly; ensure your backend supports `Authorization: Bearer <token>` when you provide relative URLs or same-origin resources.
- Preloading: default is to preload the next 2 videos; the app automatically reduces preloads on slow/data-saver connections.

## Expected Backend Contract

- `GET {baseUrl}{playlistPath}?cursor=<cursor>` -> `{ items: VideoItem[]; nextCursor: string | null }`
- `POST {baseUrl}{likePath.replace("{id}", id)}`
- `POST {baseUrl}{dislikePath.replace("{id}", id)}`
- `VideoItem`: `{ id: string; url: string; cover?: string; title?: string; duration?: number; orientation?: "portrait" | "landscape" }`

See `docs/api.md` for a fuller proposal, including pagination notes and an optional impression endpoint.

## Gestures and Controls

- Scroll or swipe up/down: next / previous video.
- Scroll or swipe left/right: like / dislike, then advance.
- Long-press left third: rewind in ~0.4s steps.
- Long-press right third: fast-forward at 2x.
- Tap center: pause/resume. Buttons for play/pause and navigation are also available.
- Drag the progress bar to seek; choose playback speed from the dropdown.

## Project Structure

- `app/` - App Router entry, styles, PWA manifest.
- `components/` - Player, settings panel, and shared UI primitives.
- `providers/` - React contexts for playlist state and backend settings.
- `lib/` - Types, config helpers, and API client.
- `public/` - Static assets.
- `docs/api.md` - Proposed backend contract.

## Scripts

- `pnpm dev` - start dev server
- `pnpm build` - production build
- `pnpm start` - serve built app
- `pnpm lint` - run eslint with max-warnings=0

## Deployment

1. Configure `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`).
2. `pnpm install && pnpm build`
3. `pnpm start` to serve the built output.

## License

MIT — see `LICENSE`.
