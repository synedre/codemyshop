
<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: false })

const { t } = useHubT()
const { isB2b } = useB2bVisibility()

const cfg = useRuntimeConfig()
const brand = String((cfg.public as any).brandName ?? '')
const contactEmail = String((cfg.public as any).contactEmail ?? '')
const contactPhone = String((cfg.public as any).contactPhone ?? '')
const contactDescription = String((cfg.public as any).contactDescription ?? '')
const warehouses = ((cfg.public as any).warehouses ?? []) as Array<{ label: string; address_html: string }>

const formulaireActif = (cfg.public as any).contactForm !== false

const telHref = computed(() => contactPhone ? `tel:${contactPhone.replace(/[^+\d]/g, '')}` : '')

const { trackLead } = useAnalytics()

const { activeLang: contactLang } = useRouteLang()

const REPLY_HINT_KEY = 'contact.contact_reply_language_hint'
const replyHint = computed(() => {
  const hint = t(REPLY_HINT_KEY)
  return hint === REPLY_HINT_KEY ? '' : hint
})
const { data: pageMeta } = await useFetch<{ title: string | null; description: string | null }>('/api/page-meta', {
  query: { page: 'contact', lang: contactLang },
  watch: [contactLang],
  default: () => ({ title: null, description: null }),
})

const metaTitleFallback = brand ? `${t('contact.head_title', 'Nous contacter')} — ${brand}` : t('contact.head_title', 'Nous contacter')
const metaTitle = computed(() => {
  const localized = pageMeta.value?.title
  if (localized) return brand ? `${localized} — ${brand}` : localized
  return metaTitleFallback
})
const metaDescription = computed(() => String(pageMeta.value?.description || contactDescription))

useHead({
  title: metaTitle,
  meta: computed(() => metaDescription.value ? [{ name: 'description', content: metaDescription.value }] : []),
})

const form = reactive({ company: '', siret: '', name: '', email: '', phone: '', message: '' })
const sent      = ref(false)
const submitting = ref(false)
const errorMsg  = ref('')

const noSiret = ref(contactLang.value !== 'fr')
watch(noSiret, (v) => { if (v) form.siret = '' })

interface SiretLookup {
  status: 'idle' | 'pending' | 'ok' | 'error'
  companyName?: string
  city?: string
  error?: string
}
const siretLookup = reactive<SiretLookup>({ status: 'idle' })
let siretDebounce: ReturnType<typeof setTimeout> | null = null

function onSiretInput() {
  const cleaned = form.siret.replace(/\D/g, '')
  if (siretDebounce) clearTimeout(siretDebounce)
  if (cleaned.length === 0) { siretLookup.status = 'idle'; return }
  if (cleaned.length < 14)  { siretLookup.status = 'pending'; return }
  siretLookup.status = 'pending'
  siretDebounce = setTimeout(async () => {
    try {
      const r = await $fetch<{ valid: boolean; companyName?: string; city?: string; error?: string }>(
        '/api/siret-verify', { query: { siret: cleaned } },
      )
      if (r.valid) {
        siretLookup.status = 'ok'
        siretLookup.companyName = r.companyName
        siretLookup.city = r.city
      } else {
        siretLookup.status = 'error'
        siretLookup.error = r.error || 'SIRET introuvable'
      }
    } catch {
      siretLookup.status = 'error'
      siretLookup.error = 'Vérification indisponible, réessayez.'
    }
  }, 500)
}

interface EmailLookup {
  status: 'idle' | 'pending' | 'ok' | 'unknown' | 'rejected' | 'mx_missing' | 'invalid'
}
const emailLookup = reactive<EmailLookup>({ status: 'idle' })
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function onEmailBlur() {
  const v = form.email.trim()
  if (!v || !EMAIL_RE.test(v)) { emailLookup.status = 'invalid'; return }
  emailLookup.status = 'pending'
  try {
    const r = await $fetch<{ status: string }>('/api/email-verify', { query: { email: v } })
    if (r.status === 'ok') emailLookup.status = 'ok'
    else if (r.status === 'mx_missing') emailLookup.status = 'mx_missing'
    
    
    else emailLookup.status = 'unknown'
  } catch {
    emailLookup.status = 'unknown'
  }
}
function onEmailInput() {
  
  if (emailLookup.status !== 'idle') emailLookup.status = 'idle'
}

const siretValid = computed(() => siretLookup.status === 'ok')
const emailBlocked = computed(() => emailLookup.status === 'rejected' || emailLookup.status === 'mx_missing' || emailLookup.status === 'invalid')

const canSubmit = computed(() => !submitting.value && (isB2b.value ? (noSiret.value || siretValid.value) : true) && !emailBlocked.value)

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ success: boolean; id: number }>('/api/contact', {
      method: 'POST',
      body: {
        
        ...(isB2b.value ? {
          company: form.company,
          siret:   noSiret.value ? undefined : form.siret.replace(/\D/g, ''),
          noSiret: noSiret.value || undefined,
        } : {}),
        name:    form.name,
        email:   form.email,
        phone:   form.phone,
        message: form.message,
        
        lang:    contactLang.value,
        
        
        attribution: useAdAttribution(),
      },
    })
    
    
    
    trackLead({ leadId: String(res.id), source: 'contact' })
    sent.value = true
  }
  catch (err: unknown) {
    errorMsg.value = getApiErrorMessage(err, t)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-white">

      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">{{ t('contact.contact_page_title') }}</h1>

        <div class="grid gap-12" :class="formulaireActif ? 'md:grid-cols-2' : 'max-w-xl'">

          
          <div>
            <div class="space-y-6">
              
              <p v-if="!formulaireActif && contactEmail" class="text-sm text-gray-600 leading-relaxed">
                {{ t('contact.contact_no_form_hint', 'Écrivez-nous directement, nous répondons à chaque message.') }}
              </p>
              <div v-if="contactPhone">
                <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">{{ t('contact.contact_label_phone') }}</h2>
                <a :href="telHref" class="text-lg font-semibold text-primary-600 hover:underline">{{ contactPhone }}</a>
              </div>
              <div v-if="contactEmail">
                <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">{{ t('contact.contact_label_email') }}</h2>
                <a :href="`mailto:${contactEmail}`" class="text-lg font-semibold text-primary-600 hover:underline">{{ contactEmail }}</a>
              </div>
              
              <div v-if="!warehouses.some(w => (w as any).hours_html)">
                <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">{{ t('contact.contact_label_hours') }}</h2>
                <p class="text-sm text-gray-600 leading-relaxed">
                  {{ t('contact.contact_hours_weekday') }}<br>
                  {{ t('contact.contact_hours_friday') }}
                </p>
              </div>
              <div v-if="warehouses.length">
                <h2 class="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">{{ t('contact.contact_label_warehouses') }}</h2>
                <div v-for="(w, i) in warehouses" :key="i" class="text-sm text-gray-600" :class="{ 'mt-3': i > 0 }">
                  <p>
                    <strong>{{ w.label }}</strong><br>
                    <span v-html="w.address_html" />
                  </p>
                  <p v-if="(w as any).hours_html" class="mt-1 text-xs">
                    <span class="font-semibold text-gray-700">{{ t('contact.contact_label_hours') }} :</span>
                    <span class="text-gray-600" v-html="(w as any).hours_html" />
                  </p>
                </div>
              </div>
            </div>
          </div>

          
          <div v-if="formulaireActif">
            <div v-if="sent" class="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <p class="text-emerald-700 font-semibold">{{ t('contact.contact_sent_title') }}</p>
              <p class="text-sm text-emerald-600 mt-1">{{ t('contact.contact_sent_subtitle') }}</p>
            </div>
            <form v-else class="space-y-4" @submit.prevent="onSubmit">
              <div v-if="errorMsg" class="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                {{ errorMsg }}
              </div>
              
              <template v-if="isB2b">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('contact.contact_label_company') }}</label>
                  <input v-model="form.company" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">SIRET <span v-if="!noSiret" class="text-red-500">*</span></label>
                  <input
                    v-model="form.siret"
                    type="text"
                    inputmode="numeric"
                    maxlength="17"
                    placeholder="12345678901234"
                    :required="!noSiret"
                    :disabled="noSiret"
                    :class="[
                      'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none',
                      noSiret
                        ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : siretLookup.status === 'ok' ? 'border-emerald-500 focus:border-emerald-600'
                        : siretLookup.status === 'error' ? 'border-red-500 focus:border-red-600'
                        : 'border-gray-200 focus:border-primary-600',
                    ]"
                    @input="onSiretInput"
                  />
                  <p v-if="!noSiret && siretLookup.status === 'pending'" class="mt-1 text-xs text-gray-400">{{ t('contact.contact_siret_verifying', 'Vérification…') }}</p>
                  <p v-else-if="!noSiret && siretLookup.status === 'ok'" class="mt-1 text-xs text-emerald-700">
                    ✓ {{ siretLookup.companyName }}<span v-if="siretLookup.city"> · {{ siretLookup.city }}</span>
                  </p>
                  <p v-else-if="!noSiret && siretLookup.status === 'error'" class="mt-1 text-xs text-red-600">
                    ✗ {{ siretLookup.error }}
                  </p>
                  
                  <label class="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      v-model="noSiret"
                      type="checkbox"
                      class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="text-xs text-gray-500">{{ t('contact.contact_siret_no_siren', 'Société étrangère ou sans SIREN français') }}</span>
                  </label>
                </div>
              </template>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('contact.contact_label_name') }}</label>
                  <input v-model="form.name" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('contact.contact_label_phone_field') }}</label>
                  <input v-model="form.phone" type="tel" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">
                  {{ t('contact.contact_label_email_field') }} <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  :class="[
                    'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none',
                    emailLookup.status === 'ok' ? 'border-emerald-500 focus:border-emerald-600' :
                    emailLookup.status === 'rejected' || emailLookup.status === 'mx_missing' || emailLookup.status === 'invalid' ? 'border-red-500 focus:border-red-600' :
                    emailLookup.status === 'unknown' ? 'border-amber-400 focus:border-amber-500' :
                    'border-gray-200 focus:border-primary-600',
                  ]"
                  @blur="onEmailBlur"
                  @input="onEmailInput"
                />
                <p v-if="emailLookup.status === 'pending'" class="mt-1 text-xs text-gray-400">{{ t('contact.contact_email_verifying', 'Vérification de l\'adresse…') }}</p>
                <p v-else-if="emailLookup.status === 'ok'" class="mt-1 text-xs text-emerald-700">{{ t('contact.contact_email_ok', '✓ Adresse vérifiée') }}</p>
                <p v-else-if="emailLookup.status === 'rejected'" class="mt-1 text-xs text-red-600">{{ t('contact.contact_email_rejected', '✗ Cette adresse n\'existe pas') }}</p>
                <p v-else-if="emailLookup.status === 'mx_missing'" class="mt-1 text-xs text-red-600">{{ t('contact.contact_email_mx_missing', '✗ Domaine email invalide') }}</p>
                <p v-else-if="emailLookup.status === 'invalid'" class="mt-1 text-xs text-red-600">{{ t('contact.contact_email_invalid', '✗ Format email invalide') }}</p>
                <p v-else-if="emailLookup.status === 'unknown'" class="mt-1 text-xs text-amber-700">{{ t('contact.contact_email_unknown', '⚠ Adresse non vérifiable, votre demande sera traitée mais vérifiez l\'orthographe.') }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('contact.contact_label_message') }}</label>
                <textarea v-model="form.message" rows="5" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none resize-none" />
              </div>
              
              <PrivacyNotice />
              <p v-if="replyHint" class="text-sm font-medium text-gray-700">{{ replyHint }}</p>
              <button
                type="submit"
                :disabled="!canSubmit"
                class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {{ submitting ? t('contact.contact_submitting') : t('contact.contact_submit') }}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
