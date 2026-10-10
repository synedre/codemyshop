<template>
  <div class="flex-1 overflow-auto">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.logistics_events.title', 'Événements') }}</h1>
      <button
        @click="openCreate"
        class="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {{ t('hub.ui.logistics_events.new_event', 'Nouvel événement') }}
      </button>
    </header>

    <div class="p-6">

      
      <div class="flex flex-wrap gap-3 mb-5">
        <select v-model="filterStatus" class="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300">
          <option value="">{{ t('hub.ui.logistics_events.all_statuses', 'Tous les statuts') }}</option>
          <option value="published">{{ t('hub.ui.logistics_events.published', 'Publié') }}</option>
          <option value="draft">{{ t('hub.ui.logistics_events.draft', 'Brouillon') }}</option>
          <option value="cancelled">{{ t('hub.ui.logistics_events.cancelled', 'Annulé') }}</option>
          <option value="finished">{{ t('hub.ui.logistics_events.finished', 'Terminé') }}</option>
        </select>
        <select v-model="filterType" class="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-300">
          <option value="">{{ t('hub.ui.logistics_events.all_types', 'Tous les types') }}</option>
          <option value="irl">{{ t('hub.ui.logistics_events.in_person', 'Présentiel') }}</option>
          <option value="online">{{ t('hub.ui.logistics_events.online', 'En ligne') }}</option>
          <option value="hybrid">{{ t('hub.ui.logistics_events.hybrid', 'Hybride') }}</option>
        </select>
        <span class="text-xs text-gray-400 self-center ml-auto">{{ t('hub.ui.logistics_events.count', '{n} événement(s)', { n: filteredEvents.length }) }}</span>
      </div>

      
      <div v-if="loading" class="text-center py-20 text-gray-400">{{ t('hub.ui.logistics_events.loading', 'Chargement…') }}</div>

      
      <div v-else-if="!filteredEvents.length" class="text-center py-20 text-gray-400 text-sm">
        {{ t('hub.ui.logistics_events.empty', 'Aucun événement. Créez votre premier événement !') }}
      </div>

      
      <div v-else class="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-slate-800 bg-gray-50 text-xs text-gray-500 uppercase tracking-widest">
              <th class="text-left px-4 py-3 font-semibold">{{ t('hub.ui.logistics_events.col_event', 'Événement') }}</th>
              <th class="text-left px-4 py-3 font-semibold">{{ t('hub.ui.logistics_events.col_date', 'Date') }}</th>
              <th class="text-left px-4 py-3 font-semibold">{{ t('hub.ui.logistics_events.col_type', 'Type') }}</th>
              <th class="text-left px-4 py-3 font-semibold">{{ t('hub.ui.logistics_events.col_registrants', 'Inscrits') }}</th>
              <th class="text-left px-4 py-3 font-semibold">{{ t('hub.ui.logistics_events.col_status', 'Statut') }}</th>
              <th class="text-right px-4 py-3 font-semibold">{{ t('hub.ui.logistics_events.col_actions', 'Actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="ev in filteredEvents"
              :key="ev.id"
              class="hover:bg-gray-50/50 transition-colors"
            >
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800 dark:text-slate-100 truncate max-w-[220px]">{{ ev.title }}</p>
                <p v-if="placeOf(ev)" class="text-xs text-gray-400 truncate max-w-[220px]">📍 {{ placeOf(ev) }}</p>
                <p v-else-if="ev.meetingUrl" class="text-xs text-gray-400 truncate max-w-[220px]">🔗 {{ ev.meetingUrl }}</p>
              </td>
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{{ formatDate(ev.date) }}</td>
              <td class="px-4 py-3">
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                  :class="ev.type === 'online' ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-600'"
                >
                  {{ typeLabel(ev.type) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-600">
                    {{ ev.registrations }}{{ ev.capacity > 0 ? '/' + ev.capacity : '' }}
                  </span>
                  <div v-if="ev.capacity > 0" class="w-16 bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div
                      class="h-1.5 rounded-full bg-primary-400 transition-all"
                      :style="`width:${Math.min(100, Math.round(ev.registrations / ev.capacity * 100))}%`"
                    />
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full" :class="statusClass(ev.status)">
                  {{ statusLabel(ev.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="openRegistrants(ev)"
                    class="text-xs py-1 px-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 hover:bg-gray-50 transition-colors"
                    :title="t('hub.ui.logistics_events.view_registrants', 'Voir les inscrits')"
                  >
                    👥 {{ ev.registrations }}
                  </button>
                  <button
                    @click="openEdit(ev)"
                    class="text-xs py-1 px-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {{ t('hub.ui.logistics_events.edit', 'Modifier') }}
                  </button>
                  <button
                    @click="confirmDelete(ev)"
                    class="text-xs py-1 px-2 rounded-lg border border-danger-100 text-danger-400 hover:bg-danger-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          @click.self="closeModal"
        >
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 class="font-bold text-gray-800 dark:text-slate-100">{{ editingId ? t('hub.ui.logistics_events.edit_event', 'Modifier l\'événement') : t('hub.ui.logistics_events.new_event', 'Nouvel événement') }}</h2>
              <button @click="closeModal" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form @submit.prevent="saveEvent" class="px-6 py-5 space-y-4">

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_title', 'Titre *') }}</label>
                <input v-model="form.title" required class="input-field" :placeholder="t('hub.ui.logistics_events.ph_title', 'Webinaire PrestaShop 2026')" />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_description', 'Description') }}</label>
                <textarea v-model="form.description" rows="3" class="input-field resize-none" />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_start', 'Date de début *') }}</label>
                  <input v-model="form.date" type="datetime-local" required class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_end', 'Date de fin') }}</label>
                  <input v-model="form.endDate" type="datetime-local" class="input-field" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_type', 'Type *') }}</label>
                  <select v-model="form.type" required class="input-field">
                    <option value="irl">📍 {{ t('hub.ui.logistics_events.in_person', 'Présentiel') }}</option>
                    <option value="online">🖥️ {{ t('hub.ui.logistics_events.online', 'En ligne') }}</option>
                    <option value="hybrid">🌍 {{ t('hub.ui.logistics_events.hybrid', 'Hybride') }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_capacity', 'Capacité') }} <span class="text-gray-400 font-normal">{{ t('hub.ui.logistics_events.capacity_hint', '(0 = illimitée)') }}</span></label>
                  <input v-model.number="form.capacity" type="number" min="0" class="input-field" />
                </div>
              </div>

              <div v-if="form.type !== 'online'" class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_venue_name', 'Lieu') }}</label>
                  <input v-model="form.venueName" class="input-field" :placeholder="t('hub.ui.logistics_events.ph_venue_name', 'Nom du lieu')" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_venue_address', 'Adresse') }}</label>
                  <input v-model="form.venueAddress" class="input-field" />
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_postcode', 'Code postal') }}</label>
                    <input v-model="form.postcode" class="input-field" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_city', 'Ville') }}</label>
                    <input v-model="form.city" class="input-field" />
                  </div>
                </div>
              </div>

              <div v-if="form.type !== 'irl'">
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_meeting', 'Lien de réunion') }}</label>
                <input v-model="form.meetingUrl" class="input-field" placeholder="https://meet.google.com/xxx-yyyy-zzz" />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.f_cover', 'Image de couverture') }} <span class="text-gray-400 font-normal">{{ t('hub.ui.logistics_events.url_hint', '(URL)') }}</span></label>
                <input v-model="form.coverImage" class="input-field" placeholder="https://..." />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.logistics_events.col_status', 'Statut') }}</label>
                  <select v-model="form.status" class="input-field">
                    <option value="draft">{{ t('hub.ui.logistics_events.draft', 'Brouillon') }}</option>
                    <option value="published">{{ t('hub.ui.logistics_events.published', 'Publié') }}</option>
                    <option value="cancelled">{{ t('hub.ui.logistics_events.cancelled', 'Annulé') }}</option>
                    <option value="finished">{{ t('hub.ui.logistics_events.finished', 'Terminé') }}</option>
                  </select>
                </div>
                <label class="flex items-center gap-2 self-end pb-2 text-sm text-gray-600 dark:text-slate-400">
                  <input v-model="form.registrationOpen" type="checkbox" />
                  {{ t('hub.ui.logistics_events.f_registration_open', 'Inscriptions ouvertes') }}
                </label>
              </div>

              <p v-if="formError" class="text-sm text-danger-500">{{ formError }}</p>

              <div class="flex gap-3 pt-2">
                <button type="button" @click="closeModal" class="flex-1 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  {{ t('hub.ui.logistics_events.cancel', 'Annuler') }}
                </button>
                <button type="submit" :disabled="saving" class="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {{ saving ? t('hub.ui.logistics_events.saving', 'Enregistrement…') : t('hub.ui.logistics_events.save', 'Enregistrer') }}
                </button>
              </div>

            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    
    <Teleport to="body">
      <Transition name="slide">
        <div v-if="showRegistrants" class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/30" @click="showRegistrants = false" />
          <div class="relative bg-white dark:bg-slate-900 w-full max-w-md h-full flex flex-col shadow-2xl">
            <div class="flex items-center justify-between px-5 py-4 border-b bg-white dark:bg-slate-900 sticky top-0">
              <div>
                <h3 class="font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.logistics_events.col_registrants', 'Inscrits') }}</h3>
                <p class="text-xs text-gray-400 truncate max-w-[240px]">{{ selectedEventForReg?.title }}</p>
              </div>
              <button @click="showRegistrants = false" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div v-if="regLoading" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {{ t('hub.ui.logistics_events.loading', 'Chargement…') }}
            </div>
            <div v-else-if="!registrations.length" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {{ t('hub.ui.logistics_events.no_registrants', 'Aucun inscrit pour l\'instant.') }}
            </div>
            <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-50">
              <div v-for="r in registrations" :key="r.id" class="flex items-center gap-3 px-5 py-3">
                <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {{ r.name[0]?.toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{{ r.name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ r.email }}</p>
                  <p v-if="r.phone" class="text-xs text-gray-400">{{ r.phone }}</p>
                  <p v-if="r.attendeesCount > 1" class="text-xs text-gray-500">{{ t('hub.ui.logistics_events.reg_attendees', '{n} personnes', { n: r.attendeesCount }) }}</p>
                  <p v-if="r.note" class="text-xs text-gray-500 italic whitespace-pre-line">{{ r.note }}</p>
                  <p v-if="r.status !== 'confirmed'" class="text-xs text-danger-400">{{ r.status }}</p>
                </div>
                <p class="text-xs text-gray-300 shrink-0">{{ formatDateShort(r.createdAt) }}</p>
              </div>
            </div>

            <div class="px-5 py-3 border-t text-xs text-gray-400 text-right bg-white dark:bg-slate-900">
              {{ t('hub.ui.logistics_events.reg_count', '{n} inscrit(s)', { n: registrations.length }) }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="deleteTarget"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          @click.self="deleteTarget = null"
        >
          <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="font-bold text-gray-800 dark:text-slate-100 mb-2">{{ t('hub.ui.logistics_events.delete_title', 'Supprimer cet événement ?') }}</h3>
            <p class="text-sm text-gray-500 mb-5">
              <strong>{{ deleteTarget.title }}</strong> {{ t('hub.ui.logistics_events.delete_body_suffix', 'et ses inscriptions seront définitivement supprimés.') }}
            </p>
            <div class="flex gap-3">
              <button @click="deleteTarget = null" class="flex-1 py-2 border rounded-lg text-sm">{{ t('hub.ui.logistics_events.cancel', 'Annuler') }}</button>
              <button @click="deleteEvent" class="flex-1 py-2 bg-danger-500 text-white rounded-lg text-sm font-medium">{{ t('hub.ui.logistics_events.delete', 'Supprimer') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">

import type { EventRecord, EventRegistration } from '~/types/event'

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const { t } = useHubT()

const events       = ref<EventRecord[]>([])
const loading      = ref(true)
const filterStatus = ref('')
const filterType   = ref('')

const filteredEvents = computed(() =>
  events.value
    .filter(ev => {
      if (filterStatus.value && ev.status !== filterStatus.value) return false
      if (filterType.value   && ev.type   !== filterType.value)   return false
      return true
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
)

const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving    = ref(false)
const formError = ref('')

const emptyForm = () => ({
  title:       '',
  description: '',
  date:        '',
  endDate:     '',
  type:        'irl' as EventRecord['type'],
  capacity:    0,
  status:      'draft' as EventRecord['status'],
  registrationOpen: true,
  venueName:    '',
  venueAddress: '',
  postcode:     '',
  city:         '',
  meetingUrl:  '',
  coverImage:  '',
})
const form = ref(emptyForm())

const showRegistrants      = ref(false)
const selectedEventForReg  = ref<EventRecord | null>(null)
const registrations        = ref<EventRegistration[]>([])
const regLoading           = ref(false)

const deleteTarget = ref<EventRecord | null>(null)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function statusLabel(s: EventRecord['status']) {
  return { draft: t('hub.ui.logistics_events.draft', 'Brouillon'), published: t('hub.ui.logistics_events.published', 'Publié'), cancelled: t('hub.ui.logistics_events.cancelled', 'Annulé'), finished: t('hub.ui.logistics_events.finished', 'Terminé') }[s] ?? s
}
function typeLabel(ty: EventRecord['type']) {
  return { irl: t('hub.ui.logistics_events.in_person', 'Présentiel'), online: t('hub.ui.logistics_events.online', 'En ligne'), hybrid: t('hub.ui.logistics_events.hybrid', 'Hybride') }[ty] ?? ty
}
function placeOf(ev: EventRecord) {
  return [ev.venueName, ev.city].filter(Boolean).join(', ')
}
function statusClass(s: EventRecord['status']) {
  return ({
    draft:     'bg-gray-100 dark:bg-slate-800 text-gray-500',
    published: 'bg-success-50 text-success-700',
    cancelled: 'bg-danger-50 text-danger-400',
  } as Record<string, string>)[s] ?? 'bg-gray-100 dark:bg-slate-800 text-gray-500'
}

const loadEvents = async () => {
  loading.value = true
  try {
    events.value = await $fetch<EventRecord[]>('/api/hub/events')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  form.value      = emptyForm()
  formError.value = ''
  showModal.value = true
}

const openEdit = (ev: EventRecord) => {
  editingId.value = ev.id
  form.value = {
    title:       ev.title,
    description: ev.description,
    date:        ev.date.slice(0, 16),
    endDate:     ev.endDate?.slice(0, 16) ?? '',
    type:        ev.type,
    capacity:    ev.capacity,
    status:      ev.status,
    registrationOpen: ev.registrationOpen,
    venueName:    ev.venueName ?? '',
    venueAddress: ev.venueAddress ?? '',
    postcode:     ev.postcode ?? '',
    city:         ev.city ?? '',
    meetingUrl:  ev.meetingUrl ?? '',
    coverImage:  ev.coverImage ?? '',
  }
  formError.value = ''
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

const saveEvent = async () => {
  saving.value    = true
  formError.value = ''
  try {
    const payload = {
      ...form.value,
      date:      form.value.date     ? new Date(form.value.date).toISOString()    : '',
      
      endDate:   form.value.endDate  ? new Date(form.value.endDate).toISOString() : '',
    }
    if (editingId.value) {
      await $fetch(`/api/hub/events/${editingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/hub/events', { method: 'POST', body: payload })
    }
    closeModal()
    await loadEvents()
  } catch (e: any) {
    formError.value = e.data?.message ?? e.message ?? t('hub.ui.logistics_events.save_error', 'Erreur lors de la sauvegarde')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (ev: EventRecord) => { deleteTarget.value = ev }

const deleteEvent = async () => {
  if (!deleteTarget.value) return
  await $fetch(`/api/hub/events/${deleteTarget.value.id}`, { method: 'DELETE' })
  deleteTarget.value = null
  await loadEvents()
}

const openRegistrants = async (ev: EventRecord) => {
  selectedEventForReg.value = ev
  showRegistrants.value     = true
  regLoading.value          = true
  try {
    registrations.value = await $fetch<EventRegistration[]>(`/api/hub/events/${ev.id}/registrations`)
  } finally {
    regLoading.value = false
  }
}

onMounted(loadEvents)
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-900;
}
.fade-enter-active,  .fade-leave-active  { transition: opacity .15s; }
.fade-enter-from,    .fade-leave-to      { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform .25s ease-out; }
.slide-enter-from,   .slide-leave-to     { transform: translateX(100%); }
</style>
