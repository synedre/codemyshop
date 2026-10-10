
<script setup lang="ts">
const { localePath } = useLocalePath()
import type { I18nString } from '~/composables/useI18nField'

interface NarrativeBlock {
  image: string
  kicker?: I18nString
  title: I18nString
  text?: I18nString
  cta_label?: I18nString
  cta_to?: string
  

  alt?: I18nString
  

  w?: number | null
  h?: number | null
  

  picto?: string | null
}

interface NarrativeMedia {
  image: string
  alt?: I18nString
  caption?: I18nString
  weight?: number
}

const props = defineProps<{
  title?: string | null
  subtitle?: string | null
  payload: {
    blocks?: NarrativeBlock[]
    variant?: string
    note?: I18nString
    cols?: number | null
    

    cta?: { label?: I18nString; href?: string } | null
    

    media_position?: string | null
    

    card_align?: string | null
    

    hover_focus?: boolean | null
    

    media?: NarrativeMedia[]
  } | null
}>()

const { t: i18nt } = useI18nField()
const blocks = computed<NarrativeBlock[]>(() => props.payload?.blocks ?? [])
const variant = computed(() => props.payload?.variant || 'cards')

function pictoAttrs(block: NarrativeBlock): Record<string, unknown> {
  if (!block.picto) return {}
  const picto = 'before:mb-4 before:block before:h-8 before:w-8 before:shrink-0 before:bg-[image:var(--picto)] before:bg-contain before:bg-center before:bg-no-repeat'
  return {
    
    
    class: block.image ? picto : `${picto} items-center text-center !justify-start`,
    style: { '--picto': `url(${JSON.stringify(block.picto)})` },
  }
}

function mediaSpan(weight?: number): string {
  const spans: Record<number, string> = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
  }
  return spans[Number(weight)] || 'md:col-span-1'
}

const mediaColsClass = computed(() => {
  const n = Number(props.payload?.cols) || Math.min(blocks.value.length || 1, 5)
  return {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  }[n] ?? 'grid-cols-2 md:grid-cols-3'
})

const mediaBelow = computed(() => props.payload?.media_position === 'below')

const cardsCentered = computed(() => props.payload?.card_align === 'center')

const cardAttrs = computed(() => {
  const classes = [
    mediaBelow.value ? 'flex flex-col' : '',
    cardsCentered.value ? 'text-center' : '',
  ].filter(Boolean).join(' ')
  return classes ? { class: classes } : {}
})

const textGridClass = computed(() => {
  const n = blocks.value.length
  const cols = n <= 1 ? 'md:grid-cols-1' : n === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
  return `grid grid-cols-1 gap-10 ${cols} md:gap-0 md:-mx-4`
})

function hasFrame(b: NarrativeBlock): boolean {
  return Boolean(b.image) || (Number(b.w) > 0 && Number(b.h) > 0)
}

function ratioOf(b: NarrativeBlock): string {
  const w = Number(b.w), h = Number(b.h)
  return w > 0 && h > 0 ? `${w} / ${h}` : '4 / 3'
}

const hoverFocus = computed(() => props.payload?.hover_focus === true)

const hoverGridClass = computed(() => (hoverFocus.value ? 'group/grid' : ''))

const hoverCardBorderClass = computed(() =>
  hoverFocus.value
    ? 'group/card md:transition-colors md:duration-200 ' +
      'md:group-hover/grid:border-primary-100 md:group-focus-within/grid:border-primary-100 ' +
      'md:hover:!border-primary-600 md:focus-within:!border-primary-600'
    : '',
)

function hoverCardTextClass(pale: string, dark: string): string {
  return hoverFocus.value
    ? `md:transition-colors md:duration-200 ` +
      `md:group-hover/grid:${pale} md:group-focus-within/grid:${pale} ` +
      `md:group-hover/card:!${dark} md:group-focus-within/card:!${dark}`
    : ''
}
</script>

<template>
  
  <section v-if="blocks.length && variant === 'text'" class="py-14 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title" class="mb-8">
        <h2 class="text-2xl sm:text-3xl font-bold text-black">{{ title }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-600 mt-2">{{ subtitle }}</p>
      </div>

      <div :class="textGridClass">
        <div
          v-for="(block, i) in blocks"
          :key="i"
          class="md:px-4 md:border-l md:border-[#7f7f7f] md:first:border-l-0"
        >
          <component :is="title ? 'h3' : 'h2'" class="text-[13px] leading-[19px] font-bold text-black">
            {{ i18nt(block.title) }}
          </component>
          <p v-if="i18nt(block.text)" class="text-[13px] leading-[19px] text-black">
            {{ i18nt(block.text) }}
          </p>
        </div>
      </div>
    </div>
  </section>

  
  <section v-else-if="blocks.length && variant === 'cards-plain-media'" class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title" class="mb-10 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900">{{ title }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-2">{{ subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6" :class="hoverGridClass">
        <article
          v-for="(block, i) in blocks"
          :key="i"
          class="rounded-xl border border-gray-200 p-6"
          :class="hoverCardBorderClass"
        >
          <p
            v-if="i18nt(block.kicker)"
            class="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-2"
            :class="hoverCardTextClass('text-primary-200', 'text-primary-600')"
          >{{ i18nt(block.kicker) }}</p>
          <component
            :is="title ? 'h3' : 'h2'"
            class="text-lg font-bold text-gray-900 mb-3"
            :class="hoverCardTextClass('text-primary-300', 'text-gray-900')"
          >{{ i18nt(block.title) }}</component>
          <p
            v-if="i18nt(block.text)"
            class="text-sm text-gray-600 leading-relaxed mb-4"
            :class="hoverCardTextClass('text-primary-200', 'text-gray-600')"
          >{{ i18nt(block.text) }}</p>
          <NuxtLink
            v-if="block.cta_to && i18nt(block.cta_label)"
            :to="localePath(block.cta_to)"
            class="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            {{ i18nt(block.cta_label) }}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </NuxtLink>
        </article>
      </div>

      <div
        v-if="payload?.media?.length"
        class="mt-8 grid grid-cols-1 overflow-hidden rounded-xl shadow-sm md:grid-cols-5"
      >
        <figure
          v-for="(media, i) in payload.media"
          :key="i"
          class="relative h-56 bg-gray-100 sm:h-72"
          :class="mediaSpan(media.weight)"
        >
          <img :src="media.image" :alt="String(i18nt(media.alt) ?? '')" loading="lazy" class="h-full w-full object-cover" />
          <figcaption
            v-if="i18nt(media.caption)"
            class="absolute inset-x-0 bottom-0 bg-black/55 px-5 py-4 text-center text-base font-bold uppercase text-white sm:text-xl"
          >{{ i18nt(media.caption) }}</figcaption>
        </figure>
      </div>

      <div
        v-if="i18nt(payload?.note) || (payload?.cta?.href && i18nt(payload.cta.label))"
        class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
      >
        <p v-if="i18nt(payload?.note)" class="text-sm leading-relaxed text-gray-700">{{ i18nt(payload?.note) }}</p>
        <NuxtLink
          v-if="payload?.cta?.href && i18nt(payload.cta.label)"
          :to="localePath(payload.cta.href)"
          class="shrink-0 inline-flex items-center justify-center rounded-md bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >{{ i18nt(payload.cta.label) }}</NuxtLink>
      </div>
    </div>
  </section>

  
  <section v-else-if="blocks.length && variant === 'cards-plain'" class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title" class="mb-10 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900">{{ title }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-2">{{ subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6" :class="hoverGridClass">
        <article
          v-for="(block, i) in blocks"
          :key="i"
          class="rounded-xl border border-gray-200 p-6"
          :class="hoverCardBorderClass"
        >
          
          <p
            v-if="i18nt(block.kicker)"
            class="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-2"
            :class="hoverCardTextClass('text-primary-200', 'text-primary-600')"
          >
            {{ i18nt(block.kicker) }}
          </p>
          <component
            :is="title ? 'h3' : 'h2'"
            class="text-lg font-bold text-gray-900 mb-3"
            :class="hoverCardTextClass('text-primary-300', 'text-gray-900')"
          >{{ i18nt(block.title) }}</component>
          <p
            v-if="i18nt(block.text)"
            class="text-sm text-gray-600 leading-relaxed mb-4"
            :class="hoverCardTextClass('text-primary-200', 'text-gray-600')"
          >{{ i18nt(block.text) }}</p>
          <NuxtLink
            v-if="block.cta_to && i18nt(block.cta_label)"
            :to="localePath(block.cta_to)"
            class="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            {{ i18nt(block.cta_label) }}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </NuxtLink>
        </article>
      </div>

      
      <p v-if="i18nt(payload?.note)" class="mt-8 text-center text-sm leading-relaxed text-gray-700">
        {{ i18nt(payload?.note) }}
      </p>
    </div>
  </section>

  
  <section v-else-if="blocks.length && variant === 'cards-display'" class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title || subtitle" class="mb-10">
        <h2 v-if="title" class="text-[32px] font-bold uppercase leading-none tracking-tight text-black lg:text-[40px]">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="mt-3 text-base leading-relaxed text-gray-600">{{ subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6" :class="hoverGridClass">
        <article
          v-for="(block, i) in blocks"
          :key="i"
          class="rounded-xl border border-gray-200 p-6"
          :class="hoverCardBorderClass"
        >
          
          <p
            v-if="i18nt(block.kicker)"
            class="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-2"
            :class="hoverCardTextClass('text-primary-200', 'text-primary-600')"
          >
            {{ i18nt(block.kicker) }}
          </p>
          <component
            :is="title ? 'h3' : 'h2'"
            class="text-lg font-bold text-gray-900 mb-3"
            :class="hoverCardTextClass('text-primary-300', 'text-gray-900')"
          >{{ i18nt(block.title) }}</component>
          <p
            v-if="i18nt(block.text)"
            class="text-sm text-gray-600 leading-relaxed"
            :class="hoverCardTextClass('text-primary-200', 'text-gray-600')"
          >{{ i18nt(block.text) }}</p>
          
          <NuxtLink
            v-if="block.cta_to && i18nt(block.cta_label)"
            :to="localePath(block.cta_to)"
            class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            {{ i18nt(block.cta_label) }}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </NuxtLink>
        </article>
      </div>

      
      <div
        v-if="i18nt(payload?.note) || (payload?.cta?.href && i18nt(payload.cta.label))"
        class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
      >
        <p v-if="i18nt(payload?.note)" class="text-sm leading-relaxed text-gray-700">{{ i18nt(payload?.note) }}</p>
        <NuxtLink
          v-if="payload?.cta?.href && i18nt(payload.cta.label)"
          :to="localePath(payload.cta.href)"
          class="shrink-0 inline-flex items-center justify-center rounded-md bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          {{ i18nt(payload.cta.label) }}
        </NuxtLink>
      </div>
    </div>
  </section>

  
  <section v-else-if="blocks.length && variant === 'cards-media'" class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title || subtitle" class="mb-8">
        <h2 v-if="title" class="text-[32px] font-bold uppercase leading-none tracking-tight text-black lg:text-[40px]">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="mt-3 max-w-4xl text-base leading-relaxed text-gray-600">{{ subtitle }}</p>
      </div>

      <div class="grid gap-x-5 gap-y-8" :class="mediaColsClass">
        <article v-for="(block, i) in blocks" :key="i" v-bind="cardAttrs">
          
          <div
            v-if="hasFrame(block)"
            class="relative w-full overflow-hidden rounded-lg bg-gray-100"
            :class="mediaBelow ? 'order-2 mt-4' : ''"
            :style="{ aspectRatio: ratioOf(block) }"
            :aria-hidden="block.image ? undefined : 'true'"
          >
            <img
              v-if="block.image"
              :src="block.image"
              :alt="String(i18nt(block.alt) ?? i18nt(block.title) ?? '')"
              loading="lazy"
              class="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <component
            :is="title ? 'h3' : 'h2'"
            v-if="i18nt(block.title)"
            class="text-lg font-bold text-gray-900"
            :class="mediaBelow ? 'order-1' : (block.image ? 'mt-4' : '')"
          >{{ i18nt(block.title) }}</component>
          <p
            v-if="i18nt(block.text)"
            class="mt-2 text-sm leading-relaxed text-gray-600"
            :class="mediaBelow ? 'order-3' : ''"
          >{{ i18nt(block.text) }}</p>
        </article>
      </div>
    </div>
  </section>

  
  <section v-else-if="blocks.length && variant === 'cards-horizontal'" class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title || subtitle" class="mb-10 text-center">
        <h2 v-if="title" class="text-[32px] font-bold uppercase leading-none tracking-tight text-black lg:text-[40px]">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="mx-auto mt-3 max-w-4xl text-base leading-relaxed text-gray-600">{{ subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <article
          v-for="(block, i) in blocks"
          :key="i"
          class="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 sm:flex-row"
          :class="(i === blocks.length - 1 && blocks.length % 2 === 1)
            ? 'md:col-span-2 md:mx-auto md:w-[calc(50%-0.75rem)]'
            : ''"
        >
          <div v-if="block.image" class="relative aspect-[4/3] w-full shrink-0 bg-gray-100 sm:aspect-auto sm:w-2/5">
            <img
              :src="block.image"
              :alt="String(i18nt(block.alt) ?? i18nt(block.title) ?? '')"
              loading="lazy"
              class="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div class="flex flex-1 flex-col justify-center p-6" v-bind="pictoAttrs(block)">
            <component
              :is="title ? 'h3' : 'h2'"
              v-if="i18nt(block.title)"
              class="text-lg font-bold text-gray-900"
            >{{ i18nt(block.title) }}</component>
            <p
              v-if="i18nt(block.text)"
              class="mt-2 text-sm leading-relaxed text-gray-600"
            >{{ i18nt(block.text) }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>

  
  <section v-else-if="blocks.length && variant === 'cards-offer'" class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title || subtitle" class="mb-10">
        <h2 v-if="title" class="text-[32px] font-bold uppercase leading-none tracking-tight text-black lg:text-[40px]">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="mt-3 max-w-4xl text-base leading-relaxed text-gray-600">{{ subtitle }}</p>
      </div>

      <div class="grid gap-6 lg:gap-10" :class="mediaColsClass">
        <article
          v-for="(block, i) in blocks"
          :key="i"
          class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white"
        >
          <div
            v-if="block.image || (Number(block.w) > 0 && Number(block.h) > 0)"
            class="relative w-full bg-gray-100"
            :style="{ aspectRatio: ratioOf(block) }"
            :aria-hidden="block.image ? undefined : 'true'"
          >
            <img
              v-if="block.image"
              :src="block.image"
              :alt="String(i18nt(block.alt) ?? i18nt(block.title) ?? '')"
              loading="lazy"
              class="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          
          <div
            v-if="i18nt(block.title) || i18nt(block.text) || i18nt(block.kicker) || (block.cta_to && i18nt(block.cta_label))"
            class="flex flex-1 flex-col p-6"
          >
            <component
              :is="title ? 'h3' : 'h2'"
              v-if="i18nt(block.title)"
              class="text-xl font-bold uppercase leading-tight tracking-tight text-black lg:text-2xl"
            >{{ i18nt(block.title) }}</component>
            <p v-if="i18nt(block.text)" class="mt-2 text-sm leading-relaxed text-gray-500">{{ i18nt(block.text) }}</p>

            <div
              v-if="i18nt(block.kicker) || (block.cta_to && i18nt(block.cta_label))"
              class="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6"
            >
              <p v-if="i18nt(block.kicker)" class="text-base font-bold uppercase tracking-tight text-primary-600 lg:text-lg">
                {{ i18nt(block.kicker) }}
              </p>
              <NuxtLink
                v-if="block.cta_to && i18nt(block.cta_label)"
                :to="localePath(block.cta_to)"
                class="ml-auto shrink-0 inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                {{ i18nt(block.cta_label) }}
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>

  
  <component :is="title ? 'section' : 'div'" v-else-if="blocks.length" class="py-16 bg-[#fafaf7]">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div v-if="title" class="mb-10 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-900">{{ title }}</h2>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-2">{{ subtitle }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article
          v-for="(block, i) in blocks"
          :key="i"
          class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
        >
          <div class="aspect-[4/3] bg-gray-100 overflow-hidden">
            <img
              :src="block.image"
              :alt="i18nt(block.title)"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
          <div class="p-6">
            <p v-if="i18nt(block.kicker)" class="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-2">
              {{ i18nt(block.kicker) }}
            </p>
            
            <component :is="title ? 'h3' : 'h2'" class="text-lg font-bold text-gray-900 mb-3">{{ i18nt(block.title) }}</component>
            <p v-if="i18nt(block.text)" class="text-sm text-gray-600 leading-relaxed mb-4">{{ i18nt(block.text) }}</p>
            <NuxtLink
              v-if="block.cta_to && i18nt(block.cta_label)"
              :to="localePath(block.cta_to)"
              class="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              {{ i18nt(block.cta_label) }}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </NuxtLink>
          </div>
        </article>
      </div>
    </div>
  </component>
</template>
