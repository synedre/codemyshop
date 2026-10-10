
<script setup lang="ts">
definePageMeta({ layout: false })
const { localePath } = useLocalePath()

const { t } = useHubT()
const { isB2b, isDual, commerceMode } = useB2bVisibility()
const { activeLang: registerLang } = useRouteLang()
const router = useRouter()
const route = useRoute()
const error = ref('')

const accountType = ref<'b2c' | 'pro'>(commerceMode.value === 'b2b' ? 'pro' : 'b2c')
const isProForm = computed(() => commerceMode.value === 'b2b' || (isDual.value && accountType.value === 'pro'))

function safeNext(): string {
  const raw = String(route.query.next || '').trim()
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}
const loading = ref(false)

const cfg = useRuntimeConfig()
const clientId = String((cfg.public as any).clientId ?? '')
const brand = String((cfg.public as any).brandName ?? '')

const { activites: activityOptions } = useCustomerActivities()

const psFlags = useState<Record<string, string>>('ps_flags', () => ({}))
const proSiteUrl = computed(() => {
  const url = String(psFlags.value?.PRO_SITE_URL ?? '').trim()
  return !isProForm.value && /^https?:\/\//i.test(url) ? url : ''
})

const form = reactive({
  company: '', siret: '', activityCode: '', firstname: '', lastname: '', email: '', phone: '', password: '', confirmPassword: '',
  
  companyInCreation: registerLang.value !== 'fr',
})

watch(() => form.companyInCreation, (v) => { if (v) form.siret = '' })

async function onSubmit() {
  error.value = ''
  if (form.password !== form.confirmPassword) { error.value = t('auth.register_password_mismatch'); return }
  if (form.password.length < 8) { error.value = t('auth.register_password_min_length'); return }

  loading.value = true
  try {
    const res = await $fetch('/api/catalogue/customer/register', {
      method: 'POST',
      body: {
        clientId,
        firstname: form.firstname, lastname: form.lastname,
        email: form.email, password: form.password,
        phone: form.phone || undefined,
        
        company: isProForm.value ? form.company : undefined,
        siret: isProForm.value && !form.companyInCreation ? form.siret : undefined,
        activityCode: isProForm.value && form.activityCode ? form.activityCode : undefined,
        companyInCreation: isProForm.value ? form.companyInCreation : undefined,
        accountType: isProForm.value ? 'pro' : 'b2c',
      },
    })
    if (res.success) router.push(safeNext())
  } catch (err: any) {
    error.value = err.data?.message ?? t('auth.register_error_generic')
  } finally {
    loading.value = false
  }
}

const headTitle = computed(() => {
  const base = isProForm.value
    ? t('auth.head_title_register_b2b', 'Créer un compte professionnel')
    : t('auth.head_title_register_b2c', 'Créer un compte')
  return brand ? `${base} — ${brand}` : base
})
useHead({ title: () => headTitle.value })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ t('auth.register_page_title') }}</h1>
        <p class="text-sm text-gray-500 mb-6">{{ t('auth.register_subtitle') }}</p>

        
        <div v-if="isDual" class="flex p-1 bg-gray-100 rounded-xl mb-6">
          <button
            type="button"
            class="flex-1 py-2 text-xs font-semibold rounded-lg transition-colors"
            :class="accountType === 'b2c' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'"
            @click="accountType = 'b2c'"
          >
            {{ t('auth.account_type_individual', 'Particulier') }}
          </button>
          <button
            type="button"
            class="flex-1 py-2 text-xs font-semibold rounded-lg transition-colors"
            :class="accountType === 'pro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'"
            @click="accountType = 'pro'"
          >
            {{ t('auth.account_type_pro', 'Professionnel') }}
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="onSubmit">
          <template v-if="isProForm">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_company') }} *</label>
              <input v-model="form.company" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="t('auth.placeholder_company')" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">SIRET</label>
              <input
                v-model="form.siret"
                type="text"
                maxlength="14"
                :disabled="form.companyInCreation"
                :class="[
                  'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none',
                  form.companyInCreation
                    ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 focus:border-primary-600',
                ]"
                :placeholder="form.companyInCreation ? t('auth.siret_disabled_in_creation', 'Non requis (société en cours de création)') : t('auth.placeholder_siret')"
              />
              
              <label class="flex items-center gap-2 mt-2 cursor-pointer select-none">
                <input
                  v-model="form.companyInCreation"
                  type="checkbox"
                  class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span class="text-xs text-gray-500">{{ t('auth.register_company_in_creation', 'Société en cours de création (ou client étranger sans SIREN)') }}</span>
              </label>
            </div>
            
            <div v-if="activityOptions.length">
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_activity', 'Votre activité') }}</label>
              <select v-model="form.activityCode" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none bg-white">
                <option value="">— {{ t('common.select_option', 'Sélectionner') }} —</option>
                <option v-for="a in activityOptions" :key="a.code" :value="a.code">{{ a.label }}</option>
              </select>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_firstname') }} *</label>
              <input v-model="form.firstname" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_lastname') }} *</label>
              <input v-model="form.lastname" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">{{ isProForm ? t('auth.label_email_pro') : t('auth.label_email') }} *</label>
            <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="isProForm ? t('auth.placeholder_email_pro') : t('auth.placeholder_email')" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_phone', 'Téléphone') }}</label>
            <input v-model="form.phone" type="tel" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="t('auth.placeholder_phone', 'Ex : 06 12 34 56 78')" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_password_field') }} *</label>
              <input v-model="form.password" type="password" required minlength="8" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_confirm_password') }} *</label>
              <input v-model="form.confirmPassword" type="password" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
          </div>

          <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

          <button type="submit" :disabled="loading" class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
            {{ loading ? t('auth.register_loading') : t('auth.register_button') }}
          </button>
        </form>

        <p class="text-xs text-gray-400 text-center mt-4">
          {{ t('auth.register_already_client') }} <NuxtLink :to="localePath(`/connexion?next=${encodeURIComponent(safeNext())}`)" class="text-primary-600 hover:underline">{{ t('auth.login_button') }}</NuxtLink>
        </p>

        
        <div v-if="proSiteUrl" class="mt-6 pt-4 border-t border-gray-100 text-center">
          <p class="text-xs text-gray-500">
            {{ t('auth.pro_account_hint', 'Vous êtes un professionnel ?') }}
          </p>
          <a
            :href="proSiteUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-block mt-1 text-xs font-semibold text-primary-600 hover:underline"
          >
            {{ t('auth.pro_account_link', 'Découvrir notre offre professionnelle') }}
          </a>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
