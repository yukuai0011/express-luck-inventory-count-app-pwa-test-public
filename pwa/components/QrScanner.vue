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