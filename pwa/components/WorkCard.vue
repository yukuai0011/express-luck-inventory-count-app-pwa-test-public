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