
<script setup lang="ts">

definePageMeta({ layout: false, ssr: false })
const { t } = useHubT()

const router = useRouter()
const route = useRoute()
const _cfg = useRuntimeConfig()
const isDemo = Boolean((_cfg.public as any)?.isDemo)
const cmsVersion = String((_cfg.public as any)?.cmsVersion ?? '')
const brandName = String((_cfg.public as any)?.brandName ?? '')

const showTenantBadge = computed(() =>
  brandName && brandName !== 'Boutique' && brandName.toLowerCase() !== 'codemyshop',
)

const { login, user, fetchMe } = useAuth({ forceEmployee: true })
const error = ref('')
const loading = ref(false)
const form = reactive({
  email: isDemo ? 'demo@codemyshop.com' : '',
  password: isDemo ? 'demo' : '',
})

function resolveRedirect(): string {
  const raw = route.query.redirect
  const target = Array.isArray(raw) ? raw[0] : raw
  if (typeof target !== 'string' || !target.startsWith('/hub/')) return '/hub/dashboard'
  if (target.startsWith('//')) return '/hub/dashboard'
  return target
}

onMounted(async () => {
  try {
    if (!user.value) await fetchMe()
  } catch {
    return
  }
  if (user.value?.user_type === 'employee') router.replace(resolveRedirect())
})

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    const res = await login(form.email, form.password)
    if (res.success && user.value?.user_type === 'employee') {
      router.push(resolveRedirect())
      return
    }
    error.value = res.error || t('hub.ui.login.bad_creds', 'Identifiants incorrects ou compte non employé.')
  } catch (err: any) {
    error.value = t('hub.ui.login.server_err', 'Erreur de connexion au serveur.')
  } finally {
    loading.value = false
  }
}

useHead({ title: computed(() => t('hub.ui.login.page_title', 'Accès employé — Hub')) })
</script>

<template>
  <div class="login-bg min-h-screen flex items-center justify-center px-4 py-12">
    <div class="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-100 p-8">
      
      <div
        class="mb-6"
        :class="showTenantBadge ? 'flex items-center gap-4' : 'flex flex-col items-center text-center'"
      >
        <img
          :src="'/logo-codemyshop.png'"
          alt="CodeMyShop"
          width="80"
          height="80"
          class="w-20 h-20 shrink-0"
          :class="showTenantBadge ? '' : 'mb-3'"
        />
        <div :class="showTenantBadge ? 'min-w-0 text-left' : ''">
          <h1 class="flex items-baseline gap-1.5 flex-wrap text-base font-bold text-gray-900 tracking-tight">
            <span>CodeMyShop<sup class="text-[10px] font-normal text-gray-500 ml-0.5">®</sup></span>
            <span v-if="cmsVersion" class="text-[11px] font-mono font-normal text-gray-400">v{{ cmsVersion }}</span>
          </h1>
          <p v-if="showTenantBadge" class="mt-1 flex items-baseline gap-2">
            <span class="text-xl font-light text-gray-300 leading-none">×</span>
            <span class="text-base font-bold text-gray-900 tracking-tight">{{ brandName }}</span>
          </p>
          <p class="text-[11px] text-gray-500 mt-1.5">{{ t('hub.ui.login.subtitle', 'Accès employé — Tableau de bord') }}</p>
        </div>
      </div>

      <div v-if="isDemo" class="mb-5 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
        <p class="font-semibold mb-0.5">{{ t('hub.ui.login.demo_title', 'Démo CodeMyShop') }}</p>
        <p>{{ t('hub.ui.login.demo_prefilled', 'Identifiants pré-remplis') }} (<code class="font-mono">demo@codemyshop.com</code> / <code class="font-mono">demo</code>). {{ t('hub.ui.login.demo_reset', 'Données réinitialisées chaque nuit.') }}</p>
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.login.email', 'Email') }}</label>
          <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:border-primary-500 focus:outline-none" :placeholder="t('hub.ui.login.email_ph', 'nom@entreprise.com')" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">{{ t('hub.ui.login.pwd_field', 'Mot de passe') }}</label>
          <input v-model="form.password" type="password" required class="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:border-primary-500 focus:outline-none" />
        </div>

        <div class="text-right -mt-2">
          <NuxtLink to="/hub/mot-de-passe-oublie" class="text-xs text-gray-500 hover:text-primary-700 hover:underline">{{ t('hub.ui.login.forgot_link', 'Mot de passe oublié ?') }}</NuxtLink>
        </div>
        <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

        <button type="submit" :disabled="loading" class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
          {{ loading ? t('hub.ui.login.connecting', 'Connexion…') : t('hub.ui.login.sign_in', 'Se connecter') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/*
  Fond doodle "WhatsApp-style" : SVG pattern e-commerce/dev en gris très clair,
  posé sur un wash radial chaud (purple-50 → green-50, brand palette).
  Tout est en CSS pur — pas d'image binaire, pas de JS, perf neutre.
*/
.login-bg {
  background-color: #fafafa;
  background-image:
    /* aurore radiale soft, brand colors */
    radial-gradient(60% 50% at 20% 10%, rgba(168, 85, 247, 0.08), transparent 70%),
    radial-gradient(50% 50% at 85% 85%, rgba(34, 197, 94, 0.08), transparent 70%),
    /* pattern doodle tilé */
    url('/login-pattern.svg');
  background-repeat: no-repeat, no-repeat, repeat;
  background-size: auto, auto, 384px 384px;
}
</style>
