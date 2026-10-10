
<script setup lang="ts">
import type { I18nString } from '~/composables/useI18nField'

interface Feature {
  image: string
  label: I18nString
  description?: I18nString
  icon?: string
  title?: I18nString
  text?: I18nString
}

const props = withDefaults(
  defineProps<{
    features: Feature[]
    carriersImage?: string
    

    variant?: string | null
  }>(),
  { carriersImage: undefined, variant: null },
)

const isBand = computed(() => props.variant === 'band')

const iconClass = computed(() =>
  isBand.value ? 'w-7 h-7 text-neutral-900' : 'w-7 h-7 text-primary-600',
)

const placeholderIconClass = computed(() =>
  isBand.value ? 'w-7 h-7 text-neutral-900/40' : 'w-7 h-7 text-primary-600/40',
)

const { t: i18nt } = useI18nField()
const contentWidthClass = useContentWidth()
</script>

<template>
  <section
    v-if="features?.length"
    :class="isBand ? 'bg-white py-8' : 'border-y border-gray-100 py-10 bg-white'"
  >
    
    <div :class="[contentWidthClass, isBand ? 'mx-auto w-full px-6' : 'mx-auto px-4 sm:px-6']">
      <div
        :class="[
          'grid grid-cols-2 md:grid-cols-4',
          isBand ? 'gap-8 rounded-2xl bg-[#F2F2F2] px-10 py-7' : 'gap-8',
        ]"
      >
        <div
          v-for="feat in features"
          :key="feat.label"
          class="flex items-center gap-4"
        >
          <div
            :class="[
              'flex items-center justify-center shrink-0',
              isBand ? 'w-9 h-9' : 'w-14 h-14 rounded-full bg-primary-600/10',
            ]"
          >
            
            <img v-if="feat.image" :src="feat.image" :alt="i18nt(feat.label || feat.title)" class="w-8 h-8 object-contain" loading="lazy" />
            
            <template v-else-if="feat.icon">
              
              <svg v-if="feat.icon === 'truck'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              
              <svg v-else-if="feat.icon === 'shield'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              
              <svg v-else-if="feat.icon === 'clock'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              
              <svg v-else-if="feat.icon === 'zap'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
              </svg>
              
              <svg v-else-if="feat.icon === 'map-pin'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              
              <svg v-else-if="feat.icon === 'refresh'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              
              <svg v-else-if="feat.icon === 'house'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              
              <svg v-else-if="feat.icon === 'store'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5h-3V21M3 9.75h18M4.5 9.75V21h15V9.75M2.25 6.75 3.75 3h16.5l1.5 3.75a2.25 2.25 0 0 1-4.125 1.5 2.25 2.25 0 0 1-3.75 0 2.25 2.25 0 0 1-3.75 0 2.25 2.25 0 0 1-3.75 0A2.25 2.25 0 0 1 2.25 6.75Z" />
              </svg>
              
              <svg v-else-if="feat.icon === 'credit' || feat.icon === 'card'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              
              <svg v-else-if="feat.icon === 'star'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.5a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
              
              <svg v-else-if="feat.icon === 'leaf'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 20.25c0-8.284 6.716-15 15-15h1.5v1.5c0 8.284-6.716 15-15 15h-1.5v-1.5Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5C7.5 16.5 11.25 13.5 15 12" />
              </svg>
              
              <svg v-else-if="feat.icon === 'return'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              
              <svg v-else-if="feat.icon === 'headset'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12a8.25 8.25 0 0 1 16.5 0v5.25a3 3 0 0 1-3 3h-2.25" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12.75v2.25a2.25 2.25 0 0 0 2.25 2.25h.75v-6.75H6a2.25 2.25 0 0 0-2.25 2.25Zm16.5 0v2.25a2.25 2.25 0 0 1-2.25 2.25h-.75v-6.75H18a2.25 2.25 0 0 1 2.25 2.25Z" />
              </svg>
              
              <svg v-else-if="feat.icon === 'check'" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              
              <svg v-else :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </template>
            
            <svg v-else :class="placeholderIconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          
          <div>
            <p
              :class="isBand
                ? 'text-[15px] text-neutral-900 leading-snug'
                : 'text-sm font-semibold text-gray-900 leading-tight'"
            >{{ i18nt(feat.label || feat.title) }}</p>
            <p
              v-if="i18nt(feat.description || feat.text)"
              :class="isBand
                ? 'text-[15px] font-bold text-neutral-900 leading-snug'
                : 'text-xs text-gray-500 mt-0.5 leading-snug'"
            >{{ i18nt(feat.description || feat.text) }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="carriersImage" class="mt-8 flex justify-center">
        <img
          :src="carriersImage"
          alt="Transporteurs : Colissimo, Chronopost, Mondial Relay, Relais Colis"
          class="h-8 sm:h-10 w-auto max-w-full object-contain"
          loading="lazy"
        />
      </div>
    </div>
  </section>
</template>
