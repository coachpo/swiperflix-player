# Swiperflix

Gesture-first short‑video player rebuilt with Next.js 16 + shadcn/ui. Scroll, swipe, and long‑press to fly through clips, send like/dislike to your backend, and auto-refresh playlists when they run dry.

## Highlights
- Scroll/swipe navigation: up → next, down → previous, left → dislike & next, right → like & next.
- Like/dislike hits your backend and shows an on-player badge + toast.
- Progress bar seeking, 0.75×/1×/1.5×/2× speed, center tap to pause/resume.
- Long‑press edges: left third rewinds ~2×, right third fast‑forwards 2×.
- Auto-refreshes playlist when the current batch is exhausted.
- Backend base URL and endpoint templates are configurable in-app (persisted locally).
- Supports portrait and landscape videos with responsive fitting.
- Mock APIs included (`/api/mock`) so it works out of the box.

## Getting Started
```bash
pnpm install
pnpm dev
```
App runs at http://localhost:3000.

### Environment
- `NEXT_PUBLIC_API_BASE_URL` (optional): overrides the base URL for all API calls. Defaults to `/api/mock`.

## Backend endpoints (frontend expects)
- `GET {baseUrl}{playlistPath}?cursor=<cursor>` → `{ items: VideoItem[], nextCursor: string|null }`
- `POST {baseUrl}{likePath.replace("{id}", id)}`
- `POST {baseUrl}{dislikePath.replace("{id}", id)}`

`VideoItem`: `{ id: string; url: string; cover?: string; title?: string; duration?: number; orientation?: "portrait"|"landscape" }`

The Settings panel in the UI lets you edit `baseUrl`, `playlistPath`, `likePath`, `dislikePath` at runtime and saves them to `localStorage`.

## Gestures & Controls
- Scroll up/down (or swipe): next / previous video.
- Scroll left/right (or horizontal swipe): dislike / like, then advance.
- Long‑press left third: rewind in small steps (~0.4s every 200ms).
- Long‑press right third: fast‑forward at 2×.
- Tap center: pause/resume. Buttons for play/pause and navigation are also available.
- Drag progress bar to seek; change playback speed via selector.

## Mock API (for local demo)
- `GET /api/mock/playlist`
- `POST /api/mock/videos/:id/like`
- `POST /api/mock/videos/:id/dislike`

Edit `app/api/mock/...` or point the app to a real backend via Settings or `NEXT_PUBLIC_API_BASE_URL`.

## Project Structure
- `app/` – App Router pages and route handlers (mock API).
- `components/` – Player, settings panel, and shadcn/ui primitives.
- `providers/` – React contexts: playlist state and backend settings.
- `lib/` – Types, API client, config helpers, utilities.
- `public/` – Demo videos and assets.

## Scripts
- `pnpm dev` – start dev server
- `pnpm build` – production build (Turbopack)
- `pnpm start` – run built app
- `pnpm lint` – eslint

## Roadmap ideas
1. Persist like/dislike state locally to avoid duplicate sends.
2. Offline fallback playlist and better error surfaces.
3. Optional telemetry endpoint for impressions / watch completion.
4. Theming toggle (light/dark) and accessibility passes for gestures.

## License
MIT
