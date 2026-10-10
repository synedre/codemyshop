
<script setup lang="ts">
import { resolveLogoInitial } from '~/utils/logo-initial'

const props = withDefaults(defineProps<{
  size?: number
  color?: string
}>(), {
  size: 40,
  color: '',
})

const { config } = useClientDetection()

const cfg = useRuntimeConfig()

const resolvedColor = computed(() => {
  if (props.color) return props.color
  const brand = (cfg.public as any)?.brandColor as string | undefined
  return brand || '#64748b' 
})

const initial = computed(() => resolveLogoInitial([
  config.value?.clientId as string | undefined,
  (cfg.public as any)?.clientId as string | undefined,
]))

const gradientId = `logo-grad-${useId()}`
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="shrink-0"
    data-no-filter
  >
    <defs>
      <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :stop-color="resolvedColor" />
        <stop offset="100%" :stop-color="resolvedColor" stop-opacity="0.7" />
      </linearGradient>
    </defs>

    
    <rect
      width="100" height="100" rx="22"
      :fill="`url(#${gradientId})`"
    />

    
    <text
      x="50" y="68"
      text-anchor="middle"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="56"
      font-weight="700"
      fill="white"
      fill-opacity="0.95"
    >{{ initial }}</text>

    
    <rect
      x="30" y="82" width="40" height="4" rx="2"
      fill="white"
      fill-opacity="0.5"
    />
  </svg>
</template>
