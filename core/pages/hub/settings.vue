<template>
  <div class="flex-1 overflow-auto">
    <header class="sticky top-0 z-10 px-8 py-5 border-b border-white/5 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{{ t('hub.ui.settings.title', 'Configuration compte') }}</h1>
          <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{{ t('hub.ui.settings.subtitle', 'Préférences personnelles staff') }}</p>
        </div>
      </div>
    </header>

    <div class="p-8 max-w-3xl mx-auto space-y-6">
      <section class="rounded-2xl border bg-white border-gray-100 dark:bg-slate-800/80 dark:border-slate-700/50 p-6">
        <h2 class="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">{{ t('hub.ui.settings.identity', 'Identité') }}</h2>
        <p class="text-xs text-gray-500 dark:text-slate-500 mb-4">{{ t('hub.ui.settings.identity_hint', 'Données extraites de PrestaShop (ps_employee).') }}</p>

        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">{{ t('hub.ui.settings.firstname', 'Prénom') }}</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.firstname || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">{{ t('hub.ui.settings.lastname', 'Nom') }}</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.lastname || '—' }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">{{ t('hub.ui.settings.email', 'Email') }}</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.email || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">{{ t('hub.ui.settings.role', 'Rôle') }}</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.role || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1">{{ t('hub.ui.settings.admin', 'Admin') }}</dt>
            <dd class="text-gray-900 dark:text-slate-100">{{ user?.is_admin ? t('hub.ui.settings.yes', 'Oui') : t('hub.ui.settings.no', 'Non') }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-2xl border bg-white border-gray-100 dark:bg-slate-800/80 dark:border-slate-700/50 p-6">
        <h2 class="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">{{ t('hub.employee_lang.title', "Langue de l'interface") }}</h2>
        <p class="text-xs text-gray-500 dark:text-slate-500 mb-4">{{ t('hub.employee_lang.hint', 'La langue du back-office pour vous seul. La boutique garde ses propres langues.') }}</p>
        <div class="flex items-center gap-3">
          <label for="hub-employee-lang" class="sr-only">{{ t('hub.employee_lang.title', "Langue de l'interface") }}</label>
          <select
            id="hub-employee-lang"
            v-model="langChoisie"
            :disabled="langEnregistrement || !langues.length"
            class="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-gray-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            @change="enregistrerLangue"
          >
            <option v-if="!langChoisie" value="">{{ t('hub.employee_lang.default', 'Langue par défaut de la boutique') }}</option>
            <option v-for="l in langues" :key="l.iso" :value="l.iso">{{ l.name }}</option>
          </select>
          <span v-if="langEtat" class="text-xs" :class="langEtat === 'error' ? 'text-danger-600' : 'text-gray-500 dark:text-slate-400'" role="status">
            {{ langEtat === 'error' ? t('hub.employee_lang.error', "La langue n'a pas pu être enregistrée.") : t('hub.employee_lang.saved', 'Enregistré') }}
          </span>
        </div>
      </section>

      <section class="rounded-2xl border bg-white border-gray-100 dark:bg-slate-800/80 dark:border-slate-700/50 p-6">
        <h2 class="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">{{ t('hub.ui.settings.session', 'Session') }}</h2>
        <p class="text-xs text-gray-500 dark:text-slate-500 mb-4">{{ t('hub.ui.settings.session_hint', 'Déconnexion propre du back-office staff.') }}</p>
        <button
          class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          @click="logoutAndGoHome"
        >
          {{ t('hub.ui.settings.logout', 'Se déconnecter') }}
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const auth = useAuth()
const router = useRouter()
const user = computed(() => auth.user.value)
const { t } = useHubT()

const employeeLang = useState<string | null>('hub_employee_lang', () => null)
const langues = ref<{ iso: string; name: string }[]>([])
const langChoisie = ref('')
const langEnregistrement = ref(false)

const langEtat = ref<'' | 'saved' | 'error'>('')

onMounted(async () => {
  try {
    const r = await $fetch<{ iso: string | null; langs: { iso: string; name: string }[] }>('/api/hub/employee/lang')
    langues.value = r.langs || []
    langChoisie.value = r.iso || ''
  } catch {  }
})

async function enregistrerLangue() {
  if (!langChoisie.value) return
  langEnregistrement.value = true
  langEtat.value = ''
  try {
    await $fetch('/api/hub/employee/lang', { method: 'PUT', body: { iso: langChoisie.value } })
    
    employeeLang.value = langChoisie.value
    langEtat.value = 'saved'
  } catch {
    langEtat.value = 'error'
  } finally {
    langEnregistrement.value = false
  }
}

async function logoutAndGoHome() {
  await auth.logout()
  router.push('/')
}
</script>
