# Inventory Scanner PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Pages-hosted PWA in `/pwa` that mirrors the Express Luck Flutter inventory scanner app.

**Architecture:** Nuxt 3 static SPA with hash routing. Vue 3 Composition API for components. `@vite-pwa/nuxt` for service worker + manifest. `localforage` for IndexedDB offline storage. `html5-qrcode` for camera scanning.

**Tech Stack:** Nuxt 3, Vue 3, `@vite-pwa/nuxt`, `localforage`, `html5-qrcode`

---

## File Map

```
pwa/
├── package.json
├── nuxt.config.ts
├── tsconfig.json
├── app.vue
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── favicon.ico
├── pages/
│   ├── index.vue        # Profile page
│   ├── work.vue         # Work page
│   └── outbox.vue       # Outbox page
├── components/
│   ├── ProfileCard.vue
│   ├── WorkCard.vue
│   ├── OutboxCard.vue
│   └── QrScanner.vue
├── composables/
│   ├── useProfile.ts
│   ├── useOutbox.ts
│   └── useScanner.ts
└── utils/
    └── uuid.ts
.github/workflows/pwa-build.yml
```

---

## Task 1: Scaffold Nuxt 3 project

**Files:**
- Create: `pwa/package.json`
- Create: `pwa/nuxt.config.ts`
- Create: `pwa/tsconfig.json`

- [ ] **Step 1: Create `pwa/package.json`**

```json
{
  "name": "express-luck-inventory-pwa",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview"
  },
  "dependencies": {
    "html5-qrcode": "^2.3.8",
    "localforage": "^1.10.0",
    "nuxt": "^3.13.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vite-pwa/nuxt": "^0.10.5",
    "typescript": "^5.5.0",
    "vite-plugin-pwa": "^0.21.0"
  }
}
```

- [ ] **Step 2: Create `pwa/nuxt.config.ts`**

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  // Static output for GitHub Pages
  ssr: false,

  app: {
    head: {
      title: 'Inventory Scanner',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Offline inventory recording app for Express Luck Hungary' },
        { name: 'theme-color', content: '#3F51B5' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  // PWA module
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Inventory Scanner',
      short_name: 'Inventory',
      description: 'Offline inventory recording app for Express Luck Hungary',
      theme_color: '#3F51B5',
      background_color: '#FFFFFF',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
      ],
    },
    devOptions: { enabled: false },
  },

  // Use hash routing for GitHub Pages compatibility
  routeRules: {
    '/**': { ssr: false },
  },
})
```

- [ ] **Step 3: Create `pwa/tsconfig.json`**

```json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

- [ ] **Step 4: Commit**

```bash
git add pwa/package.json pwa/nuxt.config.ts pwa/tsconfig.json
git commit -m "feat(pwa): scaffold Nuxt 3 project with PWA config"
```

---

## Task 2: App shell + routing

**Files:**
- Create: `pwa/app.vue`
- Create: `pwa/pages/index.vue`
- Create: `pwa/pages/work.vue`
- Create: `pwa/pages/outbox.vue`

- [ ] **Step 1: Create `pwa/app.vue`** — SPA shell with hash-based tab navigation

```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-indigo-600 text-white shadow">
      <div class="max-w-2xl mx-auto px-4">
        <nav class="flex items-center gap-1 py-3">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.path"
            :to="tab.path"
            class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
            :class="isActive(tab.path)
              ? 'bg-indigo-700 text-white'
              : 'text-indigo-200 hover:text-white hover:bg-indigo-500'"
          >
            {{ tab.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-4 py-6">
      <NuxtPage />
    </main>

    <div v-if="$nuxt.isOffline" class="fixed bottom-4 left-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg text-center">
      You are offline — submissions will be queued
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const tabs = [
  { label: 'Profile', path: '/' },
  { label: 'Work', path: '/work' },
  { label: 'Outbox', path: '/outbox' },
]

// Hash-based active check
const isActive = (path: string) => {
  if (typeof window !== 'undefined') {
    return window.location.hash === `#${path}` || (path === '/' && window.location.hash === '')
  }
  return route.path === path
}
</script>
```

- [ ] **Step 2: Create `pwa/pages/index.vue`** — Profile page (placeholder)

```vue
<template>
  <ProfileCard />
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 3: Create `pwa/pages/work.vue`** — Work page (placeholder)

```vue
<template>
  <WorkCard />
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 4: Create `pwa/pages/outbox.vue`** — Outbox page (placeholder)

```vue
<template>
  <OutboxCard />
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 5: Commit**

```bash
git add pwa/app.vue pwa/pages/
git commit -m "feat(pwa): app shell with hash-based tab navigation"
```

---

## Task 3: Composables — useProfile, useOutbox, useScanner

**Files:**
- Create: `pwa/composables/useProfile.ts`
- Create: `pwa/composables/useOutbox.ts`
- Create: `pwa/composables/useScanner.ts`
- Create: `pwa/utils/uuid.ts`

- [ ] **Step 1: Create `pwa/utils/uuid.ts`**

```typescript
export function uuidv4(): string {
  const rand = (max: number) => (Date.now().microsecondsSinceEpoch + max * Math.random()) % max
  const hex = (n: number, width: number) => n.toString(16).padStart(width, '0')
  const p1 = hex(rand(0xffffffff), 8)
  const p2 = hex(rand(0xffff), 4)
  const p3 = hex((rand(0x0fff) & 0x0fff) | 0x4000, 4)
  const p4 = hex((rand(0x3fff) & 0x3fff) | 0x8000, 4)
  const p5 = hex(rand(0xffffffffffff), 12)
  return `${p1}-${p2}-${p3}-${p4}-${p5}`
}
```

- [ ] **Step 2: Create `pwa/composables/useProfile.ts`**

```typescript
import localforage from 'localforage'

export interface Profile {
  apiEndpoint: string
  orderNo: string
  recordingNo: number
  locationCode: string
  bearerToken?: string
}

const profileStore = localforage.createInstance({ name: 'inventory', storeName: 'settings' })

export function useProfile() {
  const profile = useState<Profile | null>('profile', () => null)
  const loaded = useState<boolean>('profileLoaded', () => false)

  async function loadProfile() {
    const p = await profileStore.getItem<Profile>('profile')
    profile.value = p ?? null
    loaded.value = true
  }

  async function saveProfile(data: Profile) {
    await profileStore.setItem('profile', data)
    profile.value = data
  }

  async function clearProfile() {
    await profileStore.removeItem('profile')
    profile.value = null
  }

  function sanitizeEndpoint(input: string): string {
    let s = input.trim()
    if (s.startsWith('<') && s.endsWith('>')) s = s.substring(1, s.length - 1)
    return s
  }

  return { profile, loaded, loadProfile, saveProfile, clearProfile, sanitizeEndpoint }
}
```

- [ ] **Step 3: Create `pwa/composables/useOutbox.ts`**

```typescript
import localforage from 'localforage'
import { uuidv4 } from '~/utils/uuid'

export interface OutboxPayload {
  orderNo: string
  recordingNo: number
  locationCode: string
  packageNo: string
  quantity: number
  packageIntact: boolean
}

export interface OutboxEntry {
  id: string
  url: string
  headers: Record<string, string>
  payload: OutboxPayload
  ts: string
}

const outboxStore = localforage.createInstance({ name: 'inventory', storeName: 'outbox' })

export function useOutbox() {
  const entries = useState<OutboxEntry[]>('outbox', () => [])

  async function loadOutbox() {
    const items = await outboxStore.getItem<OutboxEntry[]>('entries')
    entries.value = items ?? []
  }

  async function addEntry(entry: Omit<OutboxEntry, 'id' | 'ts'>) {
    const newEntry: OutboxEntry = {
      ...entry,
      id: uuidv4(),
      ts: new Date().toISOString(),
    }
    const updated = [...entries.value, newEntry]
    await outboxStore.setItem('entries', updated)
    entries.value = updated
    return newEntry
  }

  async function removeEntry(id: string) {
    const updated = entries.value.filter(e => e.id !== id)
    await outboxStore.setItem('entries', updated)
    entries.value = updated
  }

  async function clearOutbox() {
    await outboxStore.setItem('entries', [])
    entries.value = []
  }

  async function syncOutbox(bearerToken?: string): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 }
    for (const entry of entries.value) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-ms-client-tracking-id': uuidv4(),
          ...entry.headers,
        }
        if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`

        const resp = await fetch(entry.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(entry.payload),
        })
        if (resp.ok) {
          await removeEntry(entry.id)
          results.success++
        } else {
          results.failed++
        }
      } catch {
        results.failed++
      }
    }
    return results
  }

  return { entries, loadOutbox, addEntry, removeEntry, clearOutbox, syncOutbox }
}
```

- [ ] **Step 4: Create `pwa/composables/useScanner.ts`**

```typescript
import { Html5Qrcode } from 'html5-qrcode'

export function useScanner() {
  const isScanning = useState<boolean>('isScanning', () => false)
  let scanner: Html5Qrcode | null = null

  async function startScan(
    elementId: string,
    onDetect: (text: string) => void,
    onError?: (err: string) => void,
  ) {
    if (isScanning.value) return
    scanner = new Html5Qrcode(elementId)
    isScanning.value = true
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onDetect(decodedText)
          stopScan()
        },
        () => {},
      )
    } catch (err: unknown) {
      isScanning.value = false
      onError?.(err instanceof Error ? err.message : String(err))
    }
  }

  async function stopScan() {
    if (scanner && isScanning.value) {
      try {
        await scanner.stop()
      } catch {}
    }
    isScanning.value = false
    scanner = null
  }

  return { isScanning, startScan, stopScan }
}
```

- [ ] **Step 5: Commit**

```bash
git add pwa/utils/uuid.ts pwa/composables/useProfile.ts pwa/composables/useOutbox.ts pwa/composables/useScanner.ts
git commit -m "feat(pwa): composables for profile, outbox, and scanner"
```

---

## Task 4: Components — ProfileCard, QrScanner

**Files:**
- Create: `pwa/components/QrScanner.vue`
- Create: `pwa/components/ProfileCard.vue`

- [ ] **Step 1: Create `pwa/components/QrScanner.vue`**

```vue
<template>
  <div class="relative">
    <div :id="elementId" class="w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-black" />

    <button
      v-if="isScanning"
      type="button"
      class="mt-2 w-full px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"
      @click="handleStop"
    >
      Stop Scanning
    </button>

    <button
      v-else
      type="button"
      class="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
      :disabled="disabled"
      @click="handleStart"
    >
      {{ disabled ? 'Camera not available' : 'Start Camera' }}
    </button>

    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  elementId?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  detect: [text: string]
  error: [message: string]
}>()

const { isScanning, startScan, stopScan } = useScanner()
const scannerId = computed(() => props.elementId ?? `scanner-${Math.random().toString(36).slice(2)}`)
const error = ref('')

async function handleStart() {
  error.value = ''
  await startScan(
    scannerId.value,
    (text) => emit('detect', text),
    (err) => { error.value = err; emit('error', err) },
  )
}

async function handleStop() {
  await stopScan()
}

onUnmounted(() => stopScan())
</script>
```

- [ ] **Step 2: Create `pwa/components/ProfileCard.vue`**

```vue
<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
    <h2 class="text-lg font-semibold text-gray-900 mb-1">1) Recording Profile</h2>
    <p class="text-sm text-gray-500 mb-4">
      Scan two QR codes in any order to establish a profile. Then save.
    </p>

    <div class="flex gap-2 mb-4">
      <span
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
        :class="scannedApi ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
      >
        API Endpoint: {{ scannedApi ? 'ready' : 'missing' }}
      </span>
      <span
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
        :class="scannedInfo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
      >
        Recording Info: {{ scannedInfo ? 'ready' : 'missing' }}
      </span>
    </div>

    <div class="flex gap-2 mb-4">
      <button
        type="button"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        @click="showScanner = true"
      >
        Scan QR
      </button>
      <button
        type="button"
        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        @click="reset"
      >
        Reset
      </button>
    </div>

    <details class="mb-4">
      <summary class="text-sm text-indigo-600 cursor-pointer hover:text-indigo-800">Paste JSON instead</summary>
      <div class="mt-2">
        <textarea
          v-model="pasteText"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          rows="3"
          placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
        />
        <button
          type="button"
          class="mt-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          @click="handlePaste"
        >
          Detect
        </button>
      </div>
    </details>

    <details class="mb-4">
      <summary class="text-sm text-indigo-600 cursor-pointer hover:text-indigo-800">Advanced: Optional Bearer Token</summary>
      <div class="mt-2">
        <input
          v-model="bearerToken"
          type="password"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="Bearer token (optional)"
        />
      </div>
    </details>

    <div class="flex gap-2 mb-4">
      <button
        type="button"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        :disabled="!canSave"
        @click="handleSave"
      >
        Save Profile
      </button>
      <button
        type="button"
        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        @click="handleClear"
      >
        Clear Saved Profile
      </button>
    </div>

    <div>
      <p class="text-sm font-medium text-gray-700 mb-1">Current Profile</p>
      <div class="bg-gray-50 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
        {{ profileSummary }}
      </div>
    </div>

    <!-- Scanner Modal -->
    <div v-if="showScanner" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-4 max-w-sm w-full mx-4">
        <h3 class="text-base font-semibold mb-3">Scan QR Code</h3>
        <QrScanner @detect="handleQrDetect" @error="handleScanError" />
        <button
          type="button"
          class="mt-3 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          @click="showScanner = false"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { profile, loadProfile, saveProfile, clearProfile, sanitizeEndpoint } = useProfile()

const scannedApi = ref<string | null>(null)
const scannedInfo = ref<{ orderNo: string; recordingNo: number; locationCode: string } | null>(null)
const pasteText = ref('')
const bearerToken = ref('')
const showScanner = ref(false)

const canSave = computed(() => scannedApi.value && scannedInfo.value)

const profileSummary = computed(() => {
  if (!profile.value) return '(No profile saved)'
  return JSON.stringify({
    apiEndpoint: profile.value.apiEndpoint || '',
    orderNo: profile.value.orderNo || '',
    recordingNo: profile.value.recordingNo || '',
    locationCode: profile.value.locationCode || '',
    bearerToken: profile.value.bearerToken ? '(stored)' : '(none)',
  }, null, 2)
})

onMounted(() => loadProfile())

function reset() {
  scannedApi.value = null
  scannedInfo.value = null
  pasteText.value = ''
}

function handleQrDetect(text: string) {
  showScanner.value = false
  handleQrText(text)
}

function handlePaste() {
  handleQrText(pasteText.value.trim())
  pasteText.value = ''
}

function handleQrText(text: string): boolean {
  let obj: Record<string, unknown>
  try { obj = JSON.parse(text) } catch { return false }

  if (typeof obj.apiEndpoint === 'string') {
    scannedApi.value = sanitizeEndpoint(obj.apiEndpoint)
    return true
  }

  const orderNo = String(obj.orderNo ?? '').trim()
  const recNo = obj.recordingNo
  const location = String(obj.locationCode ?? '').trim()
  if (orderNo && location && typeof recNo === 'number') {
    scannedInfo.value = { orderNo, recordingNo: recNo, locationCode: location }
    return true
  }
  return false
}

function handleScanError(msg: string) {
  alert(`Scanner error: ${msg}`)
}

async function handleSave() {
  if (!canSave.value) return
  await saveProfile({
    apiEndpoint: scannedApi.value!,
    orderNo: scannedInfo.value!.orderNo,
    recordingNo: scannedInfo.value!.recordingNo,
    locationCode: scannedInfo.value!.locationCode,
    bearerToken: bearerToken.value.trim() || undefined,
  })
  alert('Profile saved')
}

async function handleClear() {
  await clearProfile()
  scannedApi.value = null
  scannedInfo.value = null
  bearerToken.value = ''
}
</script>
```

- [ ] **Step 3: Commit**

```bash
git add pwa/components/QrScanner.vue pwa/components/ProfileCard.vue
git commit -m "feat(pwa): add QrScanner and ProfileCard components"
```

---

## Task 5: Components — WorkCard

**Files:**
- Create: `pwa/components/WorkCard.vue`

- [ ] **Step 1: Create `pwa/components/WorkCard.vue`**

```vue
<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
    <h2 class="text-lg font-semibold text-gray-900 mb-1">2) Work</h2>
    <p class="text-sm text-gray-500 mb-4">Use your saved profile to submit package records.</p>

    <div class="flex gap-2 mb-4">
      <input
        v-model="packageNo"
        type="text"
        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        placeholder="Package number (scan or type)"
      />
      <button
        type="button"
        class="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        @click="showScanner = true"
      >
        Scan
      </button>
    </div>

    <label class="flex items-center gap-2 mb-4 cursor-pointer">
      <input v-model="isIntact" type="checkbox" class="w-4 h-4 text-indigo-600 rounded" />
      <span class="text-sm font-medium text-gray-700">Package intact</span>
    </label>

    <div class="flex items-center gap-2 mb-4" :class="{ 'opacity-50': isIntact }">
      <button
        type="button"
        class="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        :disabled="isIntact"
        @click="adjustQty(-1)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
      </button>
      <input
        :value="quantity"
        type="text"
        readonly
        class="w-20 text-center px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
      />
      <button
        type="button"
        class="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        :disabled="isIntact"
        @click="adjustQty(1)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>

    <button
      type="button"
      class="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      :disabled="!canSubmit"
      @click="handleSubmit"
    >
      Submit
    </button>

    <div v-if="result" class="mt-4 bg-gray-50 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
      {{ result }}
    </div>

    <!-- Scanner Modal -->
    <div v-if="showScanner" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-4 max-w-sm w-full mx-4">
        <h3 class="text-base font-semibold mb-3">Scan Package Barcode</h3>
        <QrScanner @detect="handleBarcodeDetect" @error="handleScanError" />
        <button
          type="button"
          class="mt-3 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          @click="showScanner = false"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { uuidv4 } from '~/utils/uuid'

const { profile } = useProfile()
const { addEntry } = useOutbox()

const packageNo = ref('')
const isIntact = ref(true)
const quantity = ref(0)
const result = ref('')
const showScanner = ref(false)

const canSubmit = computed(() => {
  return profile.value && packageNo.value.trim().length > 0
})

function adjustQty(delta: number) {
  if (isIntact.value) return
  quantity.value = Math.max(0, quantity.value + delta)
}

function handleBarcodeDetect(text: string) {
  showScanner.value = false
  packageNo.value = text.trim()
}

function handleScanError(msg: string) {
  alert(`Scanner error: ${msg}`)
}

async function handleSubmit() {
  result.value = ''
  const p = profile.value
  if (!p) {
    result.value = 'No profile saved. Please create and save a profile first.'
    return
  }

  const pkg = packageNo.value.trim()
  if (!pkg) {
    result.value = 'Package number is required.'
    return
  }

  const qty = isIntact.value ? 0 : quantity.value
  const url = p.apiEndpoint
  const payload = {
    orderNo: p.orderNo,
    recordingNo: p.recordingNo,
    locationCode: p.locationCode,
    packageNo: pkg,
    quantity: qty,
    packageIntact: isIntact.value,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-ms-client-tracking-id': uuidv4(),
  }
  if (p.bearerToken) headers['Authorization'] = `Bearer ${p.bearerToken}`

  try {
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) })
    const ct = resp.headers.get('content-type') ?? ''
    let bodyOut: string
    if (ct.includes('application/json')) {
      bodyOut = JSON.stringify(await resp.json(), null, 2)
    } else {
      bodyOut = await resp.text()
    }
    result.value = `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n{\n  "status": ${resp.status},\n  "ok": ${resp.ok},\n  "body": ${bodyOut}\n}`
    packageNo.value = ''
    quantity.value = 0
    isIntact.value = true
  } catch (err: unknown) {
    // Offline or error → queue to outbox
    await addEntry({ url, headers, payload })
    result.value = `Request failed (likely offline). Saved to queue.\n${err instanceof Error ? err.message : String(err)}`
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add pwa/components/WorkCard.vue
git commit -m "feat(pwa): add WorkCard component"
```

---

## Task 6: Components — OutboxCard

**Files:**
- Create: `pwa/components/OutboxCard.vue`

- [ ] **Step 1: Create `pwa/components/OutboxCard.vue`**

```vue
<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
    <h2 class="text-lg font-semibold text-gray-900 mb-1">Offline Queue</h2>
    <p class="text-sm text-gray-500 mb-4">Pending submissions: {{ entries.length }}</p>

    <div class="flex gap-2 mb-4">
      <button
        type="button"
        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        :disabled="entries.length === 0"
        @click="handleSync"
      >
        Sync Now
      </button>
      <button
        type="button"
        class="px-4 py-2 border border-gray-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
        :disabled="entries.length === 0"
        @click="confirmClear"
      >
        Clear All
      </button>
    </div>

    <div v-if="syncResult" class="mb-4 text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
      {{ syncResult }}
    </div>

    <div v-if="entries.length === 0" class="text-center py-8 text-gray-400 text-sm">
      No pending submissions
    </div>

    <ul v-else class="divide-y divide-gray-100">
      <li v-for="entry in entries" :key="entry.id" class="py-3">
        <div class="text-xs font-mono text-gray-500 mb-1">{{ entry.url }}</div>
        <div class="text-sm font-medium text-gray-800">{{ entry.payload.packageNo }}</div>
        <div class="text-xs text-gray-400 mt-0.5">
          {{ new Date(entry.ts).toLocaleString() }}
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const { entries, loadOutbox, clearOutbox, syncOutbox } = useOutbox()
const { profile } = useProfile()

const syncResult = ref('')

onMounted(() => loadOutbox())

async function handleSync() {
  syncResult.value = ''
  const { success, failed } = await syncOutbox(profile.value?.bearerToken)
  syncResult.value = `Synced ${success} item(s)${failed > 0 ? `, ${failed} failed` : ''}`
  setTimeout(() => { syncResult.value = '' }, 3000)
}

async function confirmClear() {
  if (!confirm('Clear all pending submissions?')) return
  await clearOutbox()
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add pwa/components/OutboxCard.vue
git commit -m "feat(pwa): add OutboxCard component"
```

---

## Task 7: PWA icons + GitHub Actions

**Files:**
- Create: `pwa/public/icons/icon-192.png` (placeholder SVG converted to PNG)
- Create: `pwa/public/icons/icon-512.png` (placeholder SVG converted to PNG)
- Create: `pwa/public/favicon.ico`
- Create: `.github/workflows/pwa-build.yml`

- [ ] **Step 1: Create `pwa/public/icons/icon-192.svg`** (inline SVG, will be served as PNG via build)

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="24" fill="#3F51B5"/>
  <text x="96" y="120" font-family="Arial" font-size="80" font-weight="bold" text-anchor="middle" fill="white">I</text>
</svg>
```

- [ ] **Step 2: Create `pwa/public/icons/icon-512.svg`** (same pattern, 512x512)

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#3F51B5"/>
  <text x="256" y="320" font-family="Arial" font-size="220" font-weight="bold" text-anchor="middle" fill="white">I</text>
</svg>
```

Note: GitHub Pages needs PNG files for PWA icons. Convert SVGs to PNGs using any tool, or use an online converter. Place the resulting PNGs at the same paths with `.png` extension.

- [ ] **Step 3: Create `pwa/public/favicon.ico`** (minimal 1x1 placeholder — replace with proper icon)

This should be a valid ICO file. A minimal placeholder can be created, but for production, generate a proper favicon.

- [ ] **Step 4: Create `.github/workflows/pwa-build.yml`**

```yaml
name: Build and Deploy PWA

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'pwa/package-lock.json'

      - name: Install dependencies
        run: npm ci
        working-directory: pwa

      - name: Generate static site
        run: npm run generate
        working-directory: pwa

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: pwa-dist
          path: pwa/.output/public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: pwa-dist
          path: pwa-dist

      - name: Configure GitHub Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: pwa-dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Commit**

```bash
git add pwa/public/icons/ pwa/public/favicon.ico .github/workflows/pwa-build.yml
git commit -m "feat(pwa): add PWA icons and GitHub Actions workflow"
```

---

## Task 8: Install deps + verify dev server

**Files:**
- Modify: `pwa/package.json` (add `.npmrc` for Nuxt)

- [ ] **Step 1: Verify Node.js and npm are available**

```bash
node --version && npm --version
```

Expected: Node 18+ and npm 9+

- [ ] **Step 2: Install dependencies**

```bash
npm install
cd pwa && npm install
```

- [ ] **Step 3: Start dev server**

```bash
cd pwa && npm run dev
```

Expected: Dev server starts on `http://localhost:3000`. Navigate to it and verify:
- Tab navigation works (Profile/Work/Outbox)
- No console errors
- Profile page shows "Scan QR" button

- [ ] **Step 4: Stop dev server, commit**

Ctrl+C to stop. Commit any necessary config adjustments.

```bash
git add -A
git commit -m "chore(pwa): verify dev server runs correctly"
```

---

## Self-Review Checklist

- [ ] All spec requirements covered: Profile page (QR scan/paste, save/load), Work page (package input, intact, quantity, submit), Outbox page (sync, clear)
- [ ] Offline queue implemented with localforage
- [ ] PWA manifest and service worker configured via @vite-pwa/nuxt
- [ ] GitHub Actions workflow builds and deploys to GitHub Pages
- [ ] Hash routing works for GitHub Pages compatibility
- [ ] All composables return consistent types (Profile, OutboxEntry)
- [ ] No placeholder code — all steps have complete implementations

---

## Spec Coverage

| Spec Section | Tasks |
|---|---|
| Profile Page | Task 4 (ProfileCard) |
| Work Page | Task 5 (WorkCard) |
| Outbox Page | Task 6 (OutboxCard) |
| QR Scanning | Task 3 (useScanner) + Task 4 (QrScanner) |
| Offline Storage | Task 3 (useProfile, useOutbox) |
| PWA Manifest + SW | Task 1 (nuxt.config.ts) |
| Build/Deploy | Task 7 (GitHub Actions) + Task 8 (verify) |
