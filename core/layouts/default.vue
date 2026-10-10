<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <LayoutTheHeader />
    
    <HookSlot name="displayHeader" />

    <main class="max-w-5xl mx-auto px-4 pt-8 pb-10">
      <slot />
    </main>

    <LayoutTheFooter />
    
    <HookSlot name="displayFooterAfter" />
  </div>
</template>

<script setup lang="ts">
const { fetchMe } = useAuth()
onMounted(fetchMe)

const i18nAlternatesOverride = useState<Record<string, string> | null>('i18nAlternatesOverride', () => null)
useI18nHead(i18nAlternatesOverride)
</script>
