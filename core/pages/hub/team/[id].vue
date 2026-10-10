<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/team" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">
          {{ isNew ? tHub('hub.ui.team_detail.new_member', 'Nouveau collaborateur') : `${form.firstname} ${form.lastname}`.trim() || tHub('hub.ui.team_detail.member', 'Collaborateur') }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          <span v-if="!isNew">#{{ form.id }} — </span>
          {{ form.email || tHub('hub.ui.team_detail.no_email_yet', 'pas encore d\'email') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="saved" class="text-xs text-green-600 font-medium">{{ tHub('hub.ui.team_detail.saved', 'Sauvegardé') }}</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">{{ saveError }}</span>
        <button
          v-if="!isNew"
          @click="confirmDelete"
          :disabled="deleting || saving"
          class="text-xs px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors font-medium"
        >
          {{ deleting ? tHub('hub.ui.team_detail.deleting', 'Suppression…') : tHub('hub.ui.team_detail.delete', 'Supprimer') }}
        </button>
        <button
          @click="save"
          :disabled="saving || loading"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ saving ? tHub('hub.ui.team_detail.saving', 'Enregistrement…') : (isNew ? tHub('hub.ui.team_detail.create', 'Créer') : tHub('hub.ui.team_detail.save', 'Enregistrer')) }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="px-6 py-8">
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="h-72 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <div v-else-if="loaded" class="px-6 py-6">
      <div class="max-w-2xl mx-auto space-y-6">
        <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5">
            <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ tHub('hub.ui.team_detail.sec_identity', 'Identité') }}</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ tHub('hub.ui.team_detail.identity_hint', 'Le profil pilote les permissions Hub et l\'accès PrestaShop natif.') }}
            </p>
          </header>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.firstname', 'Prénom') }}</label>
                <input
                  v-model="form.firstname"
                  type="text"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.lastname', 'Nom') }}</label>
                <input
                  v-model="form.lastname"
                  type="text"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.email', 'Email') }}</label>
              <input
                v-model="form.email"
                type="email"
                autocomplete="off"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
              <p class="text-[10px] text-gray-400 mt-1">{{ tHub('hub.ui.team_detail.email_hint', 'Sert aussi d\'identifiant de connexion au Hub.') }}</p>
            </div>

            <div v-if="isNew">
              <label class="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                <input v-model="form.invite" type="checkbox" class="mt-0.5" />
                <span>
                  <span class="font-medium">{{ tHub('hub.ui.team_detail.send_invite', 'Envoyer une invitation par email') }}</span>
                  <span class="block text-[10px] text-gray-400">{{ tHub('hub.ui.team_detail.send_invite_hint', 'Le collaborateur reçoit un lien pour choisir lui-même son mot de passe (valable 7 jours).') }}</span>
                </span>
              </label>
            </div>

            <div v-else class="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-gray-100 dark:border-slate-800 px-3 py-2">
              <span class="text-xs text-gray-600 dark:text-slate-300">{{ tHub('hub.ui.team_detail.choose_access_link_to', 'Lien pour choisir son mot de passe, envoyé à {email}', { email: form.email }) }}</span>
              <span class="flex items-center gap-2">
                <span v-if="inviteMessage" class="text-xs" :class="inviteError ? 'text-red-600' : 'text-emerald-700'">{{ inviteMessage }}</span>
                <button type="button" :disabled="inviting || !form.active" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 font-medium" @click="sendInvite">
                  {{ inviting ? tHub('hub.ui.team_detail.sending', 'Envoi…') : tHub('hub.ui.team_detail.send_link', 'Envoyer le lien') }}
                </button>
              </span>
            </div>

            <div v-if="!isNew || !form.invite">
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                {{ tHub('hub.ui.team_detail.pwd_field', 'Mot de passe') }}
                <span v-if="!isNew" class="text-[10px] text-gray-400 font-normal">{{ tHub('hub.ui.team_detail.pwd_keep_hint', '(laisser vide pour ne pas changer)') }}</span>
              </label>
              <input
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :placeholder="isNew ? tHub('hub.ui.team_detail.pwd_min_ph', 'Minimum 8 caractères') : '••••••••'"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.profile', 'Profil') }}</label>
                <select
                  v-model.number="form.profileId"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                >
                  <option :value="0" disabled>{{ tHub('hub.ui.team_detail.choose_profile', '— Choisir un profil —') }}</option>
                  <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <p v-if="!viewerIsSaas" class="text-[10px] text-gray-400 mt-1">
                  {{ tHub('hub.ui.team_detail.superadmin_hidden', 'Profil "SuperAdmin PrestaShop" masqué — réservé à l\'équipe CodeMyShop.') }}
                </p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.status', 'Statut') }}</label>
                <div class="flex items-center gap-2 h-[38px]">
                  <button
                    type="button"
                    @click="form.active = !form.active"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    :class="form.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      :class="form.active ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                  <span class="text-xs text-gray-600 dark:text-slate-300">
                    {{ form.active ? tHub('hub.ui.team_detail.active', 'Actif') : tHub('hub.ui.team_detail.inactive', 'Inactif') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        
        <section v-if="!isNew" class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <header class="mb-5 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ tHub('hub.ui.team_detail.sec_author', 'Page auteur') }}</h2>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ tHub('hub.ui.team_detail.author_hint', 'Profil public utilisé pour les articles de blog (E-E-A-T).') }}
                <NuxtLink v-if="extra.slug" :to="`/auteur/${extra.slug}`" target="_blank" class="text-primary-600 hover:underline">
                  {{ tHub('hub.ui.team_detail.view_page', 'Voir la page →') }}
                </NuxtLink>
              </p>
            </div>
            <button
              type="button"
              @click="extra.active = extra.active ? 0 : 1"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              :class="extra.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'"
              :title="extra.active ? tHub('hub.ui.team_detail.author_active', 'Page auteur active') : tHub('hub.ui.team_detail.author_hidden', 'Page auteur masquée')"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                :class="extra.active ? 'translate-x-5' : 'translate-x-1'"
              />
            </button>
          </header>

          <p v-if="extraTableMissing" class="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg mb-4">
            {{ tHub('hub.ui.team_detail.module_word', 'Module') }} <code>ac_employee_extra</code> {{ tHub('hub.ui.team_detail.module_missing', 'non installé sur ce tenant — la page auteur ne sera pas persistée tant que l\'install n\'est pas faite.') }}
          </p>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.public_slug', 'Slug public') }}</label>
                <input
                  v-model="extra.slug"
                  type="text"
                  :placeholder="`${form.firstname}-${form.lastname}`.toLowerCase()"
                  class="w-full text-sm font-mono border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
                <p class="text-[10px] text-gray-400 mt-1">{{ tHub('hub.ui.team_detail.author_url', 'URL : /auteur/{slug}', { slug: '{slug}' }) }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.display_name', 'Nom d\'affichage') }}</label>
                <input
                  v-model="extra.display_name"
                  type="text"
                  :placeholder="`${form.firstname} ${form.lastname}`.trim()"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.expertise', 'Expertise (1 ligne)') }}</label>
              <input
                v-model="extra.expertise"
                type="text"
                :placeholder="tHub('hub.ui.team_detail.expertise_ph', 'Architecte e-commerce — PrestaShop, Nuxt, IA')"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.bio', 'Bio') }}</label>
              <textarea
                v-model="extra.bio"
                rows="4"
                :placeholder="tHub('hub.ui.team_detail.bio_ph', 'Présentation publique. Markdown autorisé.')"
                class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none resize-y"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.photo', 'Photo') }}</label>
                <div class="flex items-center gap-3">
                  <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img
                      v-if="extra.photo_url"
                      :src="extra.photo_url"
                      :alt="extra.display_name || form.firstname"
                      class="w-full h-full object-cover"
                    />
                    <svg v-else class="w-7 h-7 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        @click="photoInput?.click()"
                        :disabled="photoUploading || !form.id"
                        class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors font-medium"
                      >
                        {{ photoUploading ? tHub('hub.ui.team_detail.converting', 'Conversion…') : (extra.photo_url ? tHub('hub.ui.team_detail.replace', 'Remplacer') : tHub('hub.ui.team_detail.upload', 'Téléverser')) }}
                      </button>
                      <button
                        v-if="extra.photo_url && !photoUploading"
                        type="button"
                        @click="removePhoto"
                        class="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        {{ tHub('hub.ui.team_detail.remove', 'Retirer') }}
                      </button>
                    </div>
                    <p v-if="photoError" class="text-[10px] text-red-600">{{ photoError }}</p>
                    <p v-else-if="photoInfo" class="text-[10px] text-emerald-600">{{ photoInfo }}</p>
                    <p v-else class="text-[10px] text-gray-400">{{ tHub('hub.ui.team_detail.photo_hint', 'JPG/PNG → AVIF ou WebP automatique (max 8 Mo)') }}</p>
                  </div>
                  <input
                    ref="photoInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onPhotoFile"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ tHub('hub.ui.team_detail.linkedin_url', 'URL LinkedIn') }}</label>
                <input
                  v-model="extra.linkedin_url"
                  type="text"
                  placeholder="https://linkedin.com/in/…"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="px-6 py-16 text-center">
      <p class="text-sm text-gray-500">{{ tHub('hub.ui.team_detail.not_found', 'Collaborateur introuvable.') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { canAccess } = useRoles()
if (!canAccess('founder_admin')) {
  navigateTo('/hub/dashboard')
}

const route = useRoute()
const router = useRouter()
const { t: tHub } = useHubT()

const loading = ref(true)
const loaded = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)
const isNew = ref(false)
const deleting = ref(false)
const viewerIsSaas = ref(false)
const profiles = ref<Array<{ id: number; name: string }>>([])
const extraTableMissing = ref(false)

const form = reactive({
  id: 0,
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  profileId: 0,
  active: true,
  invite: true,
})

const inviting = ref(false)
const inviteMessage = ref('')
const inviteError = ref(false)

async function sendInvite() {
  if (!form.id) return
  inviting.value = true
  inviteMessage.value = ''
  try {
    await $fetch(`/api/bo/team/${form.id}/invite`, { method: 'POST' })
    inviteError.value = false
    inviteMessage.value = tHub('hub.ui.team_detail.link_sent', 'Lien envoyé')
  } catch (err: any) {
    inviteError.value = true
    inviteMessage.value = err?.data?.message || tHub('hub.ui.team_detail.send_failed', 'Envoi impossible')
  } finally {
    inviting.value = false
  }
}

const extra = reactive({
  slug: '',
  display_name: '',
  bio: '',
  expertise: '',
  photo_url: '',
  linkedin_url: '',
  active: 1 as 0 | 1,
})

const photoInput = ref<HTMLInputElement | null>(null)
const photoUploading = ref(false)
const photoError = ref<string | null>(null)
const photoInfo = ref<string | null>(null)

async function onPhotoFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !form.id) return

  if (!file.type.startsWith('image/')) {
    photoError.value = tHub('hub.ui.team_detail.format_unsupported', 'Format non supporté')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    photoError.value = tHub('hub.ui.team_detail.file_too_big', 'Fichier trop volumineux (max 8 Mo)')
    return
  }

  photoError.value = null
  photoInfo.value = null
  photoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<any>(`/api/bo/team/extra/${form.id}/upload-photo`, {
      method: 'POST',
      body: fd,
    })
    extra.photo_url = res.url
    photoInfo.value = tHub('hub.ui.team_detail.photo_info', '{format} · {size} Ko', { format: (res.format || '').toUpperCase(), size: res.sizeKb })
    setTimeout(() => { photoInfo.value = null }, 4000)
  } catch (err: any) {
    photoError.value = err?.data?.message || err?.message || tHub('hub.ui.team_detail.upload_failed', 'Échec de l\'upload')
  } finally {
    photoUploading.value = false
  }
}

async function removePhoto() {
  if (!form.id) return
  if (!window.confirm(tHub('hub.ui.team_detail.confirm_remove_photo', 'Retirer la photo ?'))) return
  extra.photo_url = ''
  await saveExtra()
}

async function loadProfiles() {
  try {
    const data = await $fetch<any>('/api/bo/team/profiles')
    profiles.value = data.profiles ?? []
    viewerIsSaas.value = !!data.viewerIsSaas
  } catch (err) {
    console.error('Load profiles error:', err)
  }
}

async function load() {
  loading.value = true
  loaded.value = false
  try {
    const data = await $fetch<any>(`/api/bo/team/${route.params.id}`)
    const e = data.employee
    isNew.value = !!data.isNew
    form.id = Number(e.id) || 0
    form.firstname = e.firstname || ''
    form.lastname = e.lastname || ''
    form.email = e.email || ''
    form.password = ''
    form.profileId = Number(e.profileId) || 0
    form.active = isNew.value ? true : !!Number(e.active)
    viewerIsSaas.value = !!data.viewerIsSaas
    loaded.value = true

    if (!isNew.value && form.id) await loadExtra()
  } catch (err) {
    console.error('Load employee error:', err)
    loaded.value = false
  } finally {
    loading.value = false
  }
}

async function loadExtra() {
  try {
    const data = await $fetch<any>(`/api/bo/team/extra/${form.id}`)
    extraTableMissing.value = !!data.tableMissing
    const x = data.extra || {}
    extra.slug         = x.slug || ''
    extra.display_name = x.display_name || ''
    extra.bio          = x.bio || ''
    extra.expertise    = x.expertise || ''
    extra.photo_url    = x.photo_url || ''
    extra.linkedin_url = x.linkedin_url || ''
    extra.active       = Number(x.active) ? 1 : 0
  } catch (err) {
    console.warn('Load extra error:', err)
  }
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = null
  try {
    const payload: Record<string, any> = {
      firstname: form.firstname,
      lastname: form.lastname,
      email: form.email,
      profileId: form.profileId,
      active: form.active,
    }
    if (isNew.value && form.invite) payload.invite = true
    else if (form.password) payload.password = form.password

    const res = await $fetch<any>(`/api/bo/team/${route.params.id}`, {
      method: 'PUT',
      body: payload,
    })

    saved.value = true
    form.password = ''
    setTimeout(() => { saved.value = false }, 3000)

    if (res?.created && res?.id) {
      if (payload.invite && !res.invited) {
        saveError.value = tHub('hub.ui.team_detail.invited_not_sent', 'Collaborateur créé, mais l\'invitation n\'est pas partie : utilisez « Envoyer le lien ».')
      }
      router.replace(`/hub/team/${res.id}`)
    } else if (form.id) {
      
      await saveExtra()
    }
  } catch (err: any) {
    console.error('Save employee error:', err)
    saveError.value = err?.data?.message || err?.message || tHub('hub.ui.team_detail.save_failed', 'Échec de la sauvegarde')
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

async function saveExtra() {
  if (extraTableMissing.value) return
  try {
    await $fetch(`/api/bo/team/extra/${form.id}`, {
      method: 'PUT',
      body: {
        slug: extra.slug,
        display_name: extra.display_name,
        bio: extra.bio,
        expertise: extra.expertise,
        photo_url: extra.photo_url,
        linkedin_url: extra.linkedin_url,
        active: extra.active,
      },
    })
    await loadExtra()
  } catch (err: any) {
    saveError.value = err?.data?.message || tHub('hub.ui.team_detail.author_save_failed', 'Échec sauvegarde page auteur')
    setTimeout(() => { saveError.value = null }, 6000)
  }
}

async function confirmDelete() {
  if (!form.id) return
  const ok = window.confirm(tHub('hub.ui.team_detail.confirm_delete', 'Supprimer définitivement {name} (#{id}) ?\n\nSi l\'employé a des commandes liées, il sera désactivé (soft delete) au lieu d\'être supprimé.', { name: `${form.firstname} ${form.lastname}`, id: form.id }))
  if (!ok) return

  deleting.value = true
  try {
    const res = await $fetch<any>(`/api/bo/team/${form.id}`, { method: 'DELETE' })
    alert(res?.message || tHub('hub.ui.team_detail.delete_done', 'Suppression effectuée.'))
    router.replace('/hub/team')
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || tHub('hub.ui.team_detail.delete_failed', 'Échec suppression')
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await Promise.all([load(), loadProfiles()])
})
</script>
