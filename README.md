# Express Luck Inventory (Web PWA)

Vue 3 + DaisyUI PWA that mirrors the Flutter inventory recording flow. It is GitHub Pages-friendly and stores data locally for offline-first use.

## Features

- Recording profile setup from two QR payloads (API endpoint + recording info)
- Paste JSON fallback for QR data
- Optional bearer token storage
- Work flow to submit package records
- Offline outbox with manual sync
- PWA install + offline caching (service worker)

## Requirements

- Bun (package manager)

## Local development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
bun run preview
```

The build step generates `.nojekyll` and `404.html` for GitHub Pages compatibility.

## GitHub Pages

Deploy the `dist/` folder to GitHub Pages. Because the app uses `base: "./"`, it works under both root and `/repo-name/` paths.

## Notes

- Camera scanning uses the `BarcodeDetector` API when available. If it is not supported, paste JSON or type the package number manually.