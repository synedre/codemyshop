

<template>
  <component
    v-for="(entry, idx) in slotEntries"
    :key="`${entry.moduleId}-${idx}`"
    :is="entry.component"
    v-bind="{ ...$attrs, context }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDisplaySlot } from '~/composables/useDisplaySlot'

const props = defineProps<{
  name: string
  context?: any
}>()

const { getSlotEntries } = useDisplaySlot()
const slotEntries = computed(() => getSlotEntries(props.name))
</script>
