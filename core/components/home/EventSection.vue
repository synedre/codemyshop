
<template>
  <section class="py-16 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">

      <div class="flex items-baseline gap-3 mb-8">
        <h2 class="text-2xl font-bold text-foreground">{{ t('events.home_title', 'Prochains événements') }}</h2>
        <span class="text-sm text-muted">{{ t('events.home_count', '{n} événement(s)', { n: events.length }) }}</span>
      </div>

      <div v-if="!events.length" class="text-center py-16 text-muted text-sm">
        {{ t('events.empty', 'Aucun événement à venir pour le moment.') }}
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="ev in events"
          :key="ev.id"
          :to="localePath(`/evenements/${ev.slug}/`)"
          class="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
        >
          <div class="aspect-video bg-gray-100 overflow-hidden relative shrink-0">
            <img
              v-if="ev.coverImageUrl"
              :src="ev.coverImageUrl"
              :alt="ev.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-primary-100 to-accent-100" aria-hidden="true">
              {{ ev.type === 'online' ? '🎥' : ev.type === 'irl' ? '📍' : '🌍' }}
            </div>
            <span
              class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full"
              :class="ev.type === 'online' ? 'bg-primary-100 text-primary-700' : 'bg-gray-800/75 text-white'"
            >
              {{ typeLabel(ev.type) }}
            </span>
          </div>

          <div class="p-5 flex flex-col flex-1 gap-2">
            <h3 class="font-bold text-gray-800 text-base leading-snug">{{ ev.title }}</h3>
            <p class="text-xs text-primary-600 font-medium">{{ formatDate(ev.startAt) }}</p>
            <p v-if="ev.venueName || ev.city" class="text-xs text-gray-500 truncate">
              📍 {{ [ev.venueName, ev.city].filter(Boolean).join(', ') }}
            </p>
            <p v-if="ev.subtitle" class="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3 mt-1">{{ ev.subtitle }}</p>

            <div v-if="ev.maxParticipants" class="mt-1">
              <div class="flex justify-between text-xs text-gray-400 mb-1">
                <span>{{ t('events.registered_n', '{n} inscrit(s)', { n: ev.registeredCount }) }}</span>
                <span>{{ t('events.seats_n', '{n} places', { n: ev.maxParticipants }) }}</span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-400 rounded-full"
                  :style="`width:${Math.min(100, Math.round(ev.registeredCount / ev.maxParticipants * 100))}%`"
                />
              </div>
            </div>

            <span class="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-primary-600 text-white group-hover:bg-primary-700 transition-colors">
              {{ isFull(ev) ? t('events.full', 'Complet') : t('events.signup_cta', "S'inscrire") }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">

import { useDisplayTimeZone } from '../../composables/useDisplayTimeZone'

const displayTz = useDisplayTimeZone()

export interface PublicEventCard {
  id: number
  slug: string
  type: 'online' | 'irl' | 'hybrid'
  startAt: string
  venueName: string | null
  city: string | null
  coverImageUrl: string | null
  title: string
  subtitle: string | null
  maxParticipants: number | null
  registeredCount: number
}

defineProps<{ events: PublicEventCard[] }>()

const { t } = useHubT()
const { localePath } = useLocalePath()
const { activeLang } = useRouteLang()

function typeLabel(ty: PublicEventCard['type']): string {
  return { online: `🖥️ ${t('events.type_online', 'En ligne')}`, irl: `📍 ${t('events.type_irl', 'Sur place')}`, hybrid: `🌍 ${t('events.type_hybrid', 'Hybride')}` }[ty] ?? ty
}

function isFull(ev: PublicEventCard): boolean {
  return !!ev.maxParticipants && ev.registeredCount >= ev.maxParticipants
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(activeLang.value || 'fr', { timeZone: displayTz,
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>
