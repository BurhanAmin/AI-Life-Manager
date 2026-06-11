# AI Life Manager — Mobile (Phase 4)

React Native + Expo client against the existing Express + Supabase backend (Phases 1–3).
No backend rewrite — this is a new client hitting the same API.

## Setup

```bash
cd mobile
npm install
```

Edit `app.json` → `expo.extra`:
- `apiUrl` — your backend (LAN IP on a real device, e.g. `http://192.168.1.x:3001`, not `localhost`)
- `supabaseUrl`, `supabaseAnonKey` — same Supabase project the web app uses

```bash
npx expo start
```

Open in Expo Go (scan QR) or a simulator.

## What's wired now

- Supabase auth with session persisted in SecureStore; JWT carries over from the web project.
- `src/lib/api.js` attaches the live Supabase access token to every backend call.
- Auth gate routes signed-out users to `/login`, signed-in users to the dashboard.
- Dashboard reads three Phase 3 endpoints: `/api/burnout/status`, `/api/idle/check`, `/api/suggestions/stats`.
- Paper design system ported (Playfair Display + DM Sans, black-only accents, no emoji).

## Next (port screens one by one)

Chat → Habits → Calendar → Suggestions → Review, then:
- Voice via Expo AV (replaces web MediaRecorder/fetch-stream for Whisper + ElevenLabs).
- Push notifications via Expo Notifications (morning/evening prompts, deadline warnings) — needs a device push-token registration endpoint on the backend.
- Background calendar monitoring.
- TestFlight (iOS beta) deployment.

## Notes from the Phase 3 handoff that matter here

- Google OAuth callback is a browser redirect on the backend; on mobile use `expo-web-browser` + the `ailifemanager://` scheme when wiring the Calendar connect screen.
- Real `calendar_events` columns are `event_date` / `event_time` / `event_end_time`.
