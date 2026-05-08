# Express Luck Inventory PWA — Design Specification

## Overview

A standalone, installable PWA that mirrors the Flutter app's core workflow — profile setup via QR codes, package recording with intact/quantity tracking, and offline-capable submission queue — rebuilt as a modern web app with native browser capabilities.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18 (Vite) | Component-based, strong ecosystem |
| PWA | Workbox | Service Worker caching, offline support |
| Storage | IndexedDB via `idb` | Robust structured storage, async API |
| Scanning | BarcodeDetector API | Native browser API, manual fallback |
| Styling | CSS custom properties | Web-native, Material-inspired |

## Project Structure

```
/
├── index.html
├── vite.config.js
├── package.json
├── manifest.json          # PWA manifest
├── public/
│   └── sw.js              # Service Worker (Workbox generated)
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── db.js              # IndexedDB wrapper
│   ├── scanner.js         # BarcodeDetector wrapper
│   ├── api.js             # HTTP client + offline queue
│   └── components/
│       ├── Header.jsx
│       ├── ProfileSection.jsx
│       ├── WorkSection.jsx
│       └── OutboxSection.jsx
```

## Features

### 1. Profile Setup

- **QR Scanning**: Use `BarcodeDetector` API to scan `apiEndpoint` and `orderNo/recordingNo/locationCode` QR codes in any order
- **Paste JSON**: Fallback text area for manual JSON paste
- **Bearer Token**: Optional advanced field for authenticated endpoints
- **Persistence**: Saved to IndexedDB `"profile"` store under key `"current"`
- **Actions**: Save Profile, Clear Saved Profile (with confirmation)

### 2. Work Section

- **Package Input**: Text field for package number, with camera scan button
- **Package Intact Toggle**: Checkbox — when checked, quantity is locked to 0 and disabled
- **Quantity Stepper**: +/- buttons for adjusting quantity (disabled when intact)
- **Submit**: POST to profile's API endpoint with payload

### 3. Offline Outbox

- **Storage**: Failed/offline submissions stored in IndexedDB `"outbox"` store
- **Sync**: Manual "Sync Now" button attempts to re-submit pending items
- **Clear**: "Clear All" with confirmation dialog
- **Display**: Count of pending submissions shown in section header

### 4. PWA Capabilities

- **Installable**: `manifest.json` with icons and install prompt
- **Offline**: Service Worker caches app shell and assets
- **Responsive**: Mobile-first, single-column layout up to 1024px

## Data Schemas

### IndexedDB: `"inventory-db"`

**Store: `"profile"`** (keyPath: key)
```javascript
{
  key: "current",
  apiEndpoint: string,
  orderNo: string,
  recordingNo: number,
  locationCode: string,
  bearerToken?: string
}
```

**Store: `"outbox"`** (keyPath: id, autoIncrement: true)
```javascript
{
  url: string,
  payload: {
    orderNo: string,
    recordingNo: number,
    locationCode: string,
    packageNo: string,
    quantity: number,
    packageIntact: boolean
  },
  headers: object,
  timestamp: string  // ISO 8601
}
```

## Submission Payload

```json
{
  "orderNo": "1234",
  "recordingNo": 1,
  "locationCode": "FG HU",
  "packageNo": "PKG-001",
  "quantity": 0,
  "packageIntact": true
}
```

**Headers sent:**
- `Content-Type: application/json`
- `Accept: application/json`
- `x-ms-client-tracking-id: <uuidv4>`
- `Authorization: Bearer <token>` (if profile has bearerToken)

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Camera unavailable | Show manual entry option, explain HTTPS requirement |
| Invalid QR JSON | Toast "Invalid QR format", continue scanning |
| No profile on submit | Block submission, toast "Please set up profile first" |
| Empty package number | Validation error on submit |
| API success (2xx) | Show success toast with response |
| API error (4xx/5xx) | Show error toast with response body |
| Network error | Queue to outbox, toast "Saved to queue" |

## UI Layout

### Page Structure
Single-page accordion layout with collapsible sections:

```
┌─────────────────────────────────────────────┐
│  [Logo] Express Luck Inventory    [🌙] [📥] │
├─────────────────────────────────────────────┤
│ ▼ Recording Profile                   [●]   │
│   [Scan QR] [Reset]    [▾ Paste JSON]       │
│   [▾ Bearer Token]                           │
│   [Save Profile]  [Clear Saved Profile]      │
│   Current: { ... }                          │
├─────────────────────────────────────────────┤
│ ▶ Work                                      │
├─────────────────────────────────────────────┤
│ ▶ Offline Queue (n pending)                  │
└─────────────────────────────────────────────┘
```

### Visual Design

| Element | Value |
|--------|-------|
| Primary color | Indigo #4F46E5 |
| Success | Green #22C55E |
| Error | Red #EF4444 |
| Dark mode | Toggle via header button |
| Typography | System font stack |
| Spacing | 8px base unit |
| Border radius | 8px cards, 4px inputs |
| Status pills | Green (ready), Gray (missing) |

### Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 640px | Single column, full-width cards |
| 640px+ | Max-width 640px, centered |

## Browser Compatibility

| Feature | Minimum Browser |
|---------|----------------|
| BarcodeDetector API | Chrome 83+, Edge 83+, Safari 14+ |
| IndexedDB | All modern browsers |
| Service Worker | Chrome 40+, Edge 17+, Safari 11.1+ |

Fallbacks: Manual entry for unsupported camera API, full offline when SW unsupported.
