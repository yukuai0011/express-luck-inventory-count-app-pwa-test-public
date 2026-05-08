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
