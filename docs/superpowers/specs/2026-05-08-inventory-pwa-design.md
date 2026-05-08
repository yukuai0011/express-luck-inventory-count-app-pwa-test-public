# Inventory Scanner PWA — Design Spec

## Overview

A GitHub Pages-hosted Progressive Web App that ports the Express Luck Flutter inventory scanner app to the web. The PWA mirrors the Flutter app's functionality (profile setup via QR, package recording, offline outbox) using Nuxt 3 + Vue 3.

## Stack

| Concern | Solution |
|---|---|
| Framework | Nuxt 3 (static output via `nuxt generate`) |
| UI | Vue 3 Composition API |
| PWA | `@vite-pwa/nuxt` module |
| Offline storage | `localforage` (IndexedDB) |
| QR/barcode scanning | `html5-qrcode` |
| Output directory | `/pwa` (static files) |
| Deployment | GitHub Pages serving `/pwa` |

## Project Structure

```
pwa/
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── public/
│   └── icons/           # PWA icons (192x192, 512x512)
├── app.vue
├── pages/
│   ├── index.vue        # Profile page (/)
│   ├── work.vue         # Work page (#/work)
│   └── outbox.vue       # Outbox page (#/outbox)
├── components/
│   ├── ProfileCard.vue
│   ├── WorkCard.vue
│   ├── OutboxCard.vue
│   └── QrScanner.vue
├── composables/
│   ├── useProfile.ts    # Profile state + localforage
│   ├── useOutbox.ts     # Outbox state + localforage
│   └── useScanner.ts    # html5-qrcode wrapper
└── utils/
    └── uuid.ts          # Client-side UUID v4

docs/superpowers/specs/2026-05-08-inventory-pwa-design.md  (this file)
```

## Data Model

### Profile (localforage key: `profile`)
```typescript
interface Profile {
  apiEndpoint: string;
  orderNo: string;
  recordingNo: number;
  locationCode: string;
  bearerToken?: string;
}
```

### Outbox Entry (localforage key: `outbox`)
```typescript
interface OutboxEntry {
  id: string;
  url: string;
  headers: Record<string, string>;
  payload: {
    orderNo: string;
    recordingNo: number;
    locationCode: string;
    packageNo: string;
    quantity: number;
    packageIntact: boolean;
  };
  ts: string; // ISO 8601
}
```

## Pages

### Profile Page (`/`)
- Two-pane layout (desktop) / stacked cards (mobile)
- **API Endpoint QR scan**: scans `{"apiEndpoint":"<url>"}` JSON
- **Recording Info QR scan**: scans `{"orderNo":"...","recordingNo":1,"locationCode":"..."}` JSON
- Pill indicators showing scan readiness
- Paste JSON fallback for desktop/manual input
- Optional Bearer token field (collapsible)
- **Save Profile** button — persists to localforage
- **Clear Saved Profile** button — removes from localforage
- Current profile display (read-only summary)

### Work Page (`#/work`)
- Package number input (text field + barcode scan button)
- Camera-based barcode scanning via `html5-qrcode`
- **Package Intact** checkbox — when checked, quantity is 0 and quantity input is disabled
- **Quantity** stepper — +/- buttons, only active when intact is unchecked
- **Submit** button — POSTs to profile's apiEndpoint
  - On success: shows response, clears package field
  - On failure: queues to outbox, shows queued message
- Result display area showing last POST response or queued status

### Outbox Page (`#/outbox`)
- Pending count display
- **Sync Now** button — attempts POST for each outbox entry, removes on success
- **Clear All** button — with confirmation dialog
- List of pending entries (url, payload summary, timestamp)
- Empty state when no pending entries

## Global Layout

- Top navigation bar with 3 tabs: Profile, Work, Outbox
- Active tab highlighted (indigo accent)
- Responsive: bottom tabs on mobile, top tabs on desktop
- App title: "Inventory Scanner"

## PWA Manifest

```json
{
  "name": "Inventory Scanner",
  "short_name": "Inventory",
  "description": "Offline inventory recording app for Express Luck Hungary",
  "theme_color": "#3F51B5",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Service Worker Strategy

- **App shell (HTML/CSS/JS)**: Cache-first with `StaleWhileRevalidate` for updates
- **API POST requests**: Network-only with offline fallback (queue to outbox)
- **Static assets**: Cache-first, 1-day expiration

## Offline Behavior

1. User submits package record while offline → request fails → saved to outbox
2. `navigator.onLine` change detected → auto-sync attempted
3. Manual "Sync Now" available on Outbox page
4. Successful sync → entry removed from outbox

## Build & Deploy

```bash
# Development
npm run dev

# Static generation
npm run generate

# Output goes to .output/public/
# Copy or configure output to /pwa folder
```

GitHub Actions workflow builds and deploys the `/pwa` folder to GitHub Pages.

## Testing Checklist

- [ ] Profile save/load persists across page reload
- [ ] QR scanning works on HTTPS (required for camera)
- [ ] Offline submit queues to outbox
- [ ] "Sync Now" sends queued items
- [ ] PWA installs on mobile (Add to Home Screen)
- [ ] App works offline after first load
