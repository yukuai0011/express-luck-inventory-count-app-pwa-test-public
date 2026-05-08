<script setup>
import { computed, onMounted, ref, watch } from 'vue';

const scannedApi = ref('');
const scannedInfo = ref(null);
const pasteJson = ref('');
const bearerToken = ref('');

const packageNo = ref('');
const intact = ref(true);
const quantity = ref(0);
const result = ref('');

const profile = ref(null);
const outbox = ref([]);

const toastMessage = ref('');
const toastTone = ref('info');
let toastTimer;

const scanDialog = ref(null);
const scanVideo = ref(null);
const scanError = ref('');
const scanMode = ref('qr');
const scanning = ref(false);
let stream = null;
let detector = null;
let rafId = null;

const hasBothScans = computed(() => Boolean(scannedApi.value) && Boolean(scannedInfo.value));
const cameraSupported = computed(() => {
  if (typeof globalThis === 'undefined') return false;
  return Boolean(
    'BarcodeDetector' in globalThis &&
      globalThis.navigator?.mediaDevices?.getUserMedia
  );
});

const profileSummary = computed(() => {
  if (!profile.value) return '(No profile saved)';
  const safe = {
    apiEndpoint: profile.value.apiEndpoint ?? '',
    orderNo: profile.value.orderNo ?? '',
    recordingNo: profile.value.recordingNo ?? '',
    locationCode: profile.value.locationCode ?? '',
    bearerToken: profile.value.bearerToken ? '(stored)' : '(none)'
  };
  return JSON.stringify(safe, null, 2);
});

watch(intact, (value) => {
  if (value) quantity.value = 0;
});

onMounted(() => {
  loadProfile();
  loadOutbox();
});

function loadProfile() {
  try {
    const raw = localStorage.getItem('profile');
    if (raw) profile.value = JSON.parse(raw);
  } catch {
    profile.value = null;
  }
}

function saveProfileToStorage(nextProfile) {
  profile.value = nextProfile;
  localStorage.setItem('profile', JSON.stringify(nextProfile));
}

function clearProfile() {
  localStorage.removeItem('profile');
  profile.value = null;
  showToast('Saved profile cleared', 'info');
}

function loadOutbox() {
  try {
    const raw = localStorage.getItem('outbox');
    outbox.value = raw ? JSON.parse(raw) : [];
  } catch {
    outbox.value = [];
  }
}

function saveOutbox() {
  localStorage.setItem('outbox', JSON.stringify(outbox.value));
}

function resetScans() {
  scannedApi.value = '';
  scannedInfo.value = null;
}

function detectPastedJson() {
  const ok = handleQrText(pasteJson.value.trim());
  if (ok) {
    showToast('QR data detected', 'success');
  } else {
    showToast('Not valid JSON or unexpected format', 'warning');
  }
}

function handleQrText(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return false;
  }
  if (!obj || typeof obj !== 'object') return false;

  if (typeof obj.apiEndpoint === 'string') {
    scannedApi.value = sanitizeEndpoint(obj.apiEndpoint);
    return true;
  }

  const orderNo = `${obj.orderNo ?? ''}`.trim();
  const locationCode = `${obj.locationCode ?? ''}`.trim();
  const recNo = Number(obj.recordingNo);
  if (orderNo && locationCode && Number.isFinite(recNo)) {
    scannedInfo.value = {
      orderNo,
      recordingNo: recNo,
      locationCode
    };
    return true;
  }

  return false;
}

function saveProfile() {
  if (!hasBothScans.value) return;
  const nextProfile = {
    apiEndpoint: scannedApi.value,
    orderNo: scannedInfo.value.orderNo,
    recordingNo: scannedInfo.value.recordingNo,
    locationCode: scannedInfo.value.locationCode,
    bearerToken: bearerToken.value.trim() || null
  };
  saveProfileToStorage(nextProfile);
  showToast('Profile saved', 'success');
}

async function submit() {
  result.value = '';
  if (!profile.value) {
    showToast('No profile saved. Please create and save a profile first.', 'warning');
    return;
  }

  const pkg = packageNo.value.trim();
  if (!pkg) {
    showToast('Package number is required.', 'warning');
    return;
  }

  const url = sanitizeEndpoint(profile.value.apiEndpoint ?? '');
  if (!url.startsWith('http')) {
    showToast('Profile API endpoint is invalid.', 'warning');
    return;
  }

  const payload = {
    orderNo: profile.value.orderNo,
    recordingNo: profile.value.recordingNo,
    locationCode: profile.value.locationCode,
    packageNo: pkg,
    quantity: intact.value ? 0 : quantity.value,
    packageIntact: intact.value
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-ms-client-tracking-id': uuidv4()
    };
    if (profile.value.bearerToken) {
      headers.Authorization = `Bearer ${profile.value.bearerToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();

    result.value = [
      `POST ${url}`,
      `Payload:\n${JSON.stringify(payload, null, 2)}`,
      `Response:\n${JSON.stringify({ status: response.status, ok: response.ok, body }, null, 2)}`
    ].join('\n\n');
  } catch (error) {
    const entry = {
      url,
      headers: {
        Authorization: profile.value.bearerToken ? `Bearer ${profile.value.bearerToken}` : null
      },
      payload,
      ts: new Date().toISOString()
    };
    outbox.value.push(entry);
    saveOutbox();
    result.value = `Request failed (likely offline). Saved to queue.\n${error}`;
  }
}

async function syncNow() {
  if (!outbox.value.length) {
    showToast('Nothing synced', 'info');
    return;
  }

  let success = 0;
  const remaining = [];

  for (const entry of outbox.value) {
    const url = entry.url || '';
    if (!url.startsWith('http')) {
      remaining.push(entry);
      continue;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-ms-client-tracking-id': uuidv4()
      };
      if (entry.headers?.Authorization) {
        headers.Authorization = entry.headers.Authorization;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(entry.payload ?? {})
      });

      if (response.ok) {
        success += 1;
      } else {
        remaining.push(entry);
      }
    } catch {
      remaining.push(entry);
    }
  }

  outbox.value = remaining;
  saveOutbox();
  showToast(success ? `Synced ${success} item(s)` : 'Nothing synced', success ? 'success' : 'info');
}

function clearOutbox() {
  if (!globalThis.confirm('Clear all pending submissions?')) return;
  outbox.value = [];
  saveOutbox();
  showToast('Outbox cleared', 'info');
}

function sanitizeEndpoint(input) {
  let value = (input || '').trim();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1);
  }
  return value;
}

function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return Array.from(template, (char) => {
    if (char === 'x' || char === 'y') {
      const r = Math.trunc(Math.random() * 16);
      const v = char === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
    return char;
  }).join('');
}

function showToast(message, tone = 'info') {
  toastMessage.value = message;
  toastTone.value = tone;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 3500);
}

function openScan(mode) {
  if (!cameraSupported.value) {
    showToast('Camera scanning needs BarcodeDetector support. Please paste JSON or type the package number.', 'info');
    return;
  }
  scanMode.value = mode;
  scanError.value = '';
  scanDialog.value?.showModal();
  startScan();
}

async function startScan() {
  try {
    scanning.value = true;
    const formats = scanMode.value === 'qr'
      ? ['qr_code']
      : ['code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar'];

    detector = new BarcodeDetector({ formats });
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });

    if (scanVideo.value) {
      scanVideo.value.srcObject = stream;
      await scanVideo.value.play();
    }

    await detectLoop();
  } catch (error) {
    scanError.value = `Unable to access camera. ${error}`;
    stopScan();
  }
}

async function detectLoop() {
  if (!scanning.value || !scanVideo.value) return;
  try {
    const barcodes = await detector.detect(scanVideo.value);
    if (barcodes.length) {
      const raw = barcodes[0].rawValue;
      if (raw) {
        handleScanResult(raw);
        return;
      }
    }
  } catch (error) {
    scanError.value = `Scanning error: ${error}`;
  }
  rafId = requestAnimationFrame(detectLoop);
}

function handleScanResult(value) {
  stopScan();
  scanDialog.value?.close();
  if (scanMode.value === 'qr') {
    const ok = handleQrText(value);
    if (ok) {
      showToast('QR captured', 'success');
    } else {
      showToast('Not JSON or unexpected structure; keep scanning…', 'warning');
    }
  } else {
    packageNo.value = value.trim();
    showToast('Package barcode captured', 'success');
  }
}

function stopScan() {
  scanning.value = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <div class="navbar bg-base-100 shadow-sm">
      <div class="flex-1">
        <span class="text-lg font-semibold">Inventory Scanner PoC</span>
      </div>
      <div class="flex-none text-xs opacity-70">PWA ready</div>
    </div>

    <main class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">1) Recording Profile</h2>
          <p class="text-sm opacity-80">Scan two QR codes in any order to establish a profile: API Endpoint and Recording Info. Then save.</p>

          <div class="flex flex-wrap gap-2">
            <span class="badge" :class="scannedApi ? 'badge-success' : 'badge-ghost'">
              API Endpoint: {{ scannedApi ? 'ready' : 'missing' }}
            </span>
            <span class="badge" :class="scannedInfo ? 'badge-success' : 'badge-ghost'">
              Recording Info: {{ scannedInfo ? 'ready' : 'missing' }}
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <button class="btn btn-primary" :disabled="!cameraSupported" @click="openScan('qr')">Scan QR</button>
            <button class="btn btn-ghost" @click="resetScans">Reset</button>
          </div>

          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">Paste JSON instead</div>
            <div class="collapse-content space-y-3">
              <textarea
                v-model="pasteJson"
                class="textarea textarea-bordered w-full"
                rows="4"
                placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
              ></textarea>
              <button class="btn btn-outline btn-sm" @click="detectPastedJson">Detect</button>
            </div>
          </div>

          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">Advanced: Optional Bearer Token</div>
            <div class="collapse-content">
              <input v-model="bearerToken" type="password" class="input input-bordered w-full" placeholder="Bearer token (optional)" />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button class="btn btn-primary" :disabled="!hasBothScans" @click="saveProfile">Save Profile</button>
            <button class="btn btn-outline" @click="clearProfile">Clear Saved Profile</button>
          </div>

          <div>
            <p class="text-sm font-medium">Current Profile</p>
            <pre class="mt-2 whitespace-pre-wrap rounded-lg border border-base-300 bg-base-200 p-3 text-xs">{{ profileSummary }}</pre>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">2) Work</h2>
          <p class="text-sm opacity-80">Use your saved profile to submit package records.</p>

          <div class="flex flex-col gap-3 md:flex-row">
            <input
              v-model="packageNo"
              class="input input-bordered w-full"
              placeholder="Scan or type package number"
            />
            <button class="btn btn-outline" :disabled="!cameraSupported" @click="openScan('barcode')">Scan</button>
          </div>

          <label class="label cursor-pointer justify-start gap-3">
            <input v-model="intact" type="checkbox" class="toggle toggle-primary" />
            <span class="label-text">Package intact</span>
          </label>

          <div class="flex items-center gap-3" :class="intact ? 'opacity-60' : ''">
            <button class="btn btn-circle btn-ghost" :disabled="intact" @click="quantity = Math.max(0, quantity - 1)">-</button>
            <input class="input input-bordered w-28 text-center" :value="quantity" readonly />
            <button class="btn btn-circle btn-ghost" :disabled="intact" @click="quantity = quantity + 1">+</button>
          </div>

          <button class="btn btn-primary" @click="submit">Submit</button>

          <pre v-if="result" class="mt-2 whitespace-pre-wrap rounded-lg border border-base-300 bg-base-200 p-3 text-xs">{{ result }}</pre>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">Offline queue</h2>
          <p class="text-sm opacity-80">Pending submissions: {{ outbox.length }}</p>

          <div class="flex flex-wrap gap-2">
            <button class="btn btn-outline" @click="syncNow">Sync now</button>
            <button class="btn btn-outline" @click="clearOutbox">Clear</button>
          </div>
        </div>
      </div>
    </main>

    <dialog ref="scanDialog" class="modal" @close="stopScan">
      <div class="modal-box space-y-4">
        <h3 class="font-bold text-lg">{{ scanMode === 'qr' ? 'Scan QR' : 'Scan Package Barcode' }}</h3>
        <video ref="scanVideo" class="aspect-video w-full rounded-lg bg-base-300" playsinline></video>
        <p v-if="scanError" class="text-sm text-error">{{ scanError }}</p>
        <p v-else class="text-xs opacity-70">
          Tip: Use HTTPS (GitHub Pages is OK) and allow camera permission in your browser.
        </p>
        <div class="modal-action">
          <button class="btn" @click="stopScan(); scanDialog.close()">Stop</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <div v-if="toastMessage" class="toast toast-bottom toast-end">
      <div class="alert" :class="{
        'alert-info': toastTone === 'info',
        'alert-success': toastTone === 'success',
        'alert-warning': toastTone === 'warning'
      }">
        <span>{{ toastMessage }}</span>
      </div>
    </div>
  </div>
</template>
