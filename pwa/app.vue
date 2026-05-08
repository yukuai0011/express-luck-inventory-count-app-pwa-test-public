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
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const tabs = [
  { label: 'Profile', path: '/' },
  { label: 'Work', path: '/work' },
  { label: 'Outbox', path: '/outbox' },
]

// Hash-based active check for GitHub Pages compatibility
const isActive = (path: string) => {
  if (typeof window !== 'undefined') {
    return window.location.hash === `#${path}` || (path === '/' && window.location.hash === '')
  }
  return route.path === path
}
</script>