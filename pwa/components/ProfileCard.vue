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