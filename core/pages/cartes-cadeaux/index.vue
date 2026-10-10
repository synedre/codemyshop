
<template>
  <NuxtLayout name="white-label">
    
    <div v-if="giftcardPage" class="giftcard-maquette" data-page="carte-cadeau">
      <section class="giftcard-maquette__hero relative overflow-hidden bg-black text-white">
        <img
          v-if="giftcardPage.hero"
          :src="giftcardPage.hero" alt=""
          class="absolute inset-0 w-full h-full object-cover"
          fetchpriority="high"
        />
        <div class="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div class="relative max-w-6xl mx-auto px-6 py-16 lg:py-24">
          <h1 class="text-4xl lg:text-7xl font-black leading-none tracking-tight">
            {{ t('cartes_cadeaux.hero_title', 'Offrez la carte cadeau') }}
            <span class="block text-primary-600">{{ brandName }}.</span>
          </h1>
          <p class="mt-4 max-w-3xl text-sm lg:text-[15px] font-bold whitespace-pre-line">
            {{ t('cartes_cadeaux.hero_text', 'Offrez le cadeau idéal en seulement quelques clics !') }}
          </p>
          <a
            href="#giftcard-form"
            class="giftcard-maquette__hero-cta mt-6 inline-flex items-center gap-2 h-10 px-5 rounded bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold uppercase transition-colors"
          >
            {{ t('cartes_cadeaux.hero_cta', 'Offrir une carte') }}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </a>
        </div>
      </section>

      <section class="giftcard-maquette__intro max-w-6xl mx-auto px-6 pt-14 text-center">
        <h2 class="text-2xl font-black uppercase text-black">{{ t('cartes_cadeaux.intro_title', 'Carte cadeau') }}</h2>
        <p class="mt-6 max-w-3xl mx-auto text-base leading-relaxed text-black whitespace-pre-line">
          {{ t('cartes_cadeaux.intro_text', 'Une carte cadeau valable 1 an, à imprimer ou à envoyer par email avec un message personnalisé.') }}
        </p>
      </section>

      <form
        v-if="state !== 'success'"
        id="giftcard-form"
        class="giftcard-maquette__form max-w-6xl mx-auto px-6 py-16 grid gap-12 lg:grid-cols-2"
        novalidate
        @submit.prevent="submit"
      >
        <input
          v-model="form.website"
          type="text" name="website" tabindex="-1" autocomplete="off"
          class="absolute -left-[9999px] w-px h-px"
          aria-hidden="true"
        />

        
        <div class="giftcard-maquette__amount">
          <h2 class="text-2xl font-black uppercase text-black">{{ t('cartes_cadeaux.amount_title', 'Choisissez le montant') }}</h2>
          <p class="mt-8 text-[15px] font-bold text-black">{{ t('cartes_cadeaux.tagline', 'Envie de faire plaisir à une connaissance ?') }}</p>
          <img
            v-if="giftcardPage.card"
            :src="giftcardPage.card"
            :alt="t('cartes_cadeaux.kicker', 'Cartes cadeaux')"
            class="giftcard-maquette__card mt-2 block w-full aspect-[624/212] object-cover rounded-xl"
          />
          <div class="giftcard-maquette__amounts mt-2 flex flex-wrap gap-[6px]" role="group" :aria-label="t('cartes_cadeaux.amount_label', 'Montant de la carte')">
            <button
              v-for="preset in PRESETS"
              :key="preset"
              type="button"
              :aria-pressed="form.preset === preset && !customOpen"
              :class="[
                'flex-1 min-w-[60px] h-[33px] rounded-[5px] text-white text-[15px] font-bold transition-colors',
                form.preset === preset && !customOpen ? 'bg-primary-800' : 'bg-primary-600 hover:bg-primary-700'
              ]"
              @click="selectPreset(preset)"
            >
              {{ preset }}
            </button>
            <button
              type="button"
              :aria-pressed="customOpen"
              :class="[
                'giftcard-maquette__custom-toggle px-3 h-[33px] rounded-[5px] text-white text-[11px] font-bold uppercase transition-colors',
                customOpen ? 'bg-primary-800' : 'bg-primary-600 hover:bg-primary-700'
              ]"
              @click="openCustom"
            >
              {{ t('cartes_cadeaux.amount_free', 'Montant au choix') }}
            </button>
          </div>
          <div v-if="customOpen" class="mt-3 flex items-center gap-2">
            <input
              v-model.number="form.customAmount"
              type="number" min="10" max="500" step="1"
              :aria-label="t('cartes_cadeaux.custom_amount', 'Autre montant')"
              :placeholder="t('cartes_cadeaux.custom_placeholder', '10 — 500')"
              class="flex-1 h-[35px] px-3 text-sm border border-black rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <span class="text-sm text-black">€</span>
          </div>
        </div>

        
        <div class="giftcard-maquette__delivery">
          <h2 class="text-2xl font-black uppercase text-black">{{ t('cartes_cadeaux.delivery_title', 'Choisissez le mode d\'envoi') }}</h2>
          <div class="giftcard-maquette__modes mt-8 grid grid-cols-2 gap-4" role="radiogroup" :aria-label="t('cartes_cadeaux.delivery_label', 'Comment l\'offrir ?')">
            <label v-for="mode in MAQUETTE_MODES" :key="mode.value" class="flex items-center gap-2 cursor-pointer text-[15px] font-bold text-black">
              <input v-model="form.deliveryMode" type="radio" :value="mode.value" class="w-[18px] h-[18px] accent-black" />
              {{ t(mode.titleKey, mode.titleFallback) }}
            </label>
          </div>

          <div class="giftcard-maquette__fields mt-10 grid grid-cols-[254fr_197fr] gap-x-[17px] gap-y-4">
            <template v-if="needsRecipient">
              <input
                v-model="form.recipientName"
                type="text" required
                :placeholder="t('cartes_cadeaux.recipient_name', 'Nom du destinataire')"
                class="h-[35px] px-3 text-sm border border-black rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <input
                v-model="form.recipientEmail"
                type="email" required
                :placeholder="t('cartes_cadeaux.recipient_email', 'Email du destinataire')"
                class="h-[35px] px-3 text-sm border border-black rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <textarea
                v-model="form.personalMessage"
                rows="1" maxlength="1000"
                :placeholder="t('cartes_cadeaux.message_short', 'Contenu de l\'email')"
                class="col-span-2 min-h-[35px] px-3 py-2 text-sm border border-black rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary-400 resize-y"
              />
              <div>
                <input
                  v-model="form.sendDate"
                  type="date" :min="minSendDate"
                  :aria-label="t('cartes_cadeaux.send_date', 'Date d\'envoi')"
                  class="w-full h-[35px] px-3 text-sm border border-black rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <p class="mt-1 text-[11px] text-black">{{ t('cartes_cadeaux.send_date_hint', 'Date d\'envoi facultative, à partir de demain.') }}</p>
              </div>
              <span aria-hidden="true" />
            </template>
            <input
              v-model="form.purchaserName"
              type="text" required
              :placeholder="t('cartes_cadeaux.purchaser_name', 'Votre nom')"
              class="h-[35px] px-3 text-sm border border-black rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <input
              v-model="form.purchaserEmail"
              type="email" required
              :placeholder="t('cartes_cadeaux.purchaser_email', 'Votre email')"
              class="h-[35px] px-3 text-sm border border-black rounded-[5px] focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <button
            type="submit"
            :disabled="!canSubmit || state === 'sending'"
            class="giftcard-maquette__submit mt-6 w-full max-w-[254px] h-[30px] px-3 rounded-[5px] border border-black bg-white text-black text-[13px] font-bold uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span v-if="state === 'sending'">{{ t('cartes_cadeaux.cta_sending', 'En cours…') }}</span>
            <span v-else>{{ t('cartes_cadeaux.cta', 'Continuer le paiement') }} — {{ formatPrice(amountEuros) }}</span>
          </button>
          <p class="mt-3 text-[11px] text-black">{{ t('cartes_cadeaux.legal', 'Validité 1 an. Code unique généré à l\'achat. Paiement sécurisé.') }}</p>
          <p v-if="errorMessage" class="mt-2 text-xs text-rose-600">{{ errorMessage }}</p>
        </div>
      </form>

      <div v-else id="giftcard-form" class="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">{{ t('cartes_cadeaux.success_title', 'Carte cadeau créée') }}</h2>
        <p class="text-sm text-gray-500 mb-4">{{ t('cartes_cadeaux.success_text', 'Voici votre code. Le PDF est téléchargeable ci-dessous.') }}</p>
        <p class="font-mono text-2xl tracking-wider text-gray-900 my-4">{{ successCode }}</p>
        <a
          v-if="successPdfUrl"
          :href="successPdfUrl" target="_blank" rel="noopener"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >{{ t('cartes_cadeaux.download_pdf', 'Télécharger le PDF') }}</a>
      </div>
    </div>

    <div v-else class="max-w-4xl mx-auto px-6 py-12 sm:py-16">
      
      <header class="text-center mb-10">
        <p class="text-[11px] tracking-[0.3em] uppercase text-primary-600 mb-3">
          {{ t('cartes_cadeaux.kicker', 'Cartes cadeaux') }}
        </p>
        <h1 class="text-3xl sm:text-4xl font-light text-gray-900 tracking-tight">
          {{ t('cartes_cadeaux.title', 'Offrez le meilleur de notre boutique') }}
        </h1>
        <p class="text-sm text-gray-500 mt-3 max-w-xl mx-auto leading-relaxed">
          {{ t('cartes_cadeaux.subtitle', 'Une carte cadeau valable 1 an, à imprimer ou à envoyer par email avec un message personnalisé.') }}
        </p>
      </header>

      
      <form
        v-if="state !== 'success'"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-8"
        novalidate
        @submit.prevent="submit"
      >
        
        <input
          v-model="form.website"
          type="text" name="website" tabindex="-1" autocomplete="off"
          class="absolute -left-[9999px] w-px h-px"
          aria-hidden="true"
        />

        
        <fieldset class="space-y-3">
          <legend class="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            {{ t('cartes_cadeaux.amount_label', 'Montant de la carte') }}
          </legend>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="preset in PRESETS"
              :key="preset"
              type="button"
              :class="[
                'py-3 rounded-xl border text-sm font-semibold transition-colors',
                form.preset === preset && !form.customAmount
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600'
              ]"
              @click="selectPreset(preset)"
            >
              {{ formatPrice(preset) }}
            </button>
          </div>
          <div class="flex items-center gap-2 pt-2">
            <label class="text-xs text-gray-500 shrink-0">
              {{ t('cartes_cadeaux.custom_amount', 'Autre montant') }}
            </label>
            <input
              v-model.number="form.customAmount"
              type="number" min="10" max="500" step="1"
              :placeholder="t('cartes_cadeaux.custom_placeholder', '10 — 500')"
              class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              @input="form.preset = null"
            />
            <span class="text-sm text-gray-400">€</span>
          </div>
        </fieldset>

        
        <fieldset class="space-y-3">
          <legend class="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            {{ t('cartes_cadeaux.delivery_label', 'Comment l\'offrir ?') }}
          </legend>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label
              v-for="mode in DELIVERY_MODES"
              :key="mode.value"
              :class="[
                'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                form.deliveryMode === mode.value
                  ? 'border-primary-500 bg-primary-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <input
                v-model="form.deliveryMode"
                type="radio"
                :value="mode.value"
                class="mt-0.5 w-3.5 h-3.5 accent-primary-600"
              />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-800">{{ t(mode.titleKey, mode.titleFallback) }}</p>
                <p class="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{{ t(mode.descKey, mode.descFallback) }}</p>
              </div>
            </label>
          </div>
        </fieldset>

        
        <fieldset class="space-y-3">
          <legend class="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            {{ t('cartes_cadeaux.purchaser_label', 'Vos coordonnées') }}
          </legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              v-model="form.purchaserName"
              type="text" required
              :placeholder="t('cartes_cadeaux.purchaser_name', 'Votre nom')"
              class="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <input
              v-model="form.purchaserEmail"
              type="email" required
              :placeholder="t('cartes_cadeaux.purchaser_email', 'Votre email')"
              class="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </fieldset>

        
        <fieldset
          v-if="needsRecipient"
          class="space-y-3 border-t border-gray-100 pt-6"
        >
          <legend class="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            {{ t('cartes_cadeaux.recipient_label', 'Pour qui ?') }}
          </legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              v-model="form.recipientName"
              type="text"
              :required="needsRecipient"
              :placeholder="t('cartes_cadeaux.recipient_name', 'Nom du destinataire')"
              class="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <input
              v-model="form.recipientEmail"
              type="email"
              :required="form.deliveryMode !== 'pdf'"
              :placeholder="t('cartes_cadeaux.recipient_email', 'Email du destinataire')"
              class="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <textarea
            v-model="form.personalMessage"
            rows="3" maxlength="1000"
            :placeholder="t('cartes_cadeaux.message_placeholder', 'Votre message (facultatif, 1000 caractères max)')"
            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
          />
        </fieldset>

        
        <div class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <p class="text-xs text-gray-500">
            {{ t('cartes_cadeaux.legal', 'Validité 1 an. Code unique généré à l\'achat. Paiement sécurisé.') }}
          </p>
          <button
            type="submit"
            :disabled="!canSubmit || state === 'sending'"
            class="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <span v-if="state === 'sending'">{{ t('cartes_cadeaux.cta_sending', 'En cours…') }}</span>
            <span v-else>{{ t('cartes_cadeaux.cta', 'Continuer le paiement') }} — {{ formatPrice(amountEuros) }}</span>
          </button>
        </div>

        <p v-if="errorMessage" class="text-xs text-rose-600">{{ errorMessage }}</p>
      </form>

      
      <div
        v-else
        class="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center"
      >
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">
          {{ t('cartes_cadeaux.success_title', 'Carte cadeau créée') }}
        </h2>
        <p class="text-sm text-gray-500 mb-4">
          {{ t('cartes_cadeaux.success_text', 'Voici votre code. Le PDF est téléchargeable ci-dessous.') }}
        </p>
        <p class="font-mono text-2xl tracking-wider text-gray-900 my-4">{{ successCode }}</p>
        <a
          v-if="successPdfUrl"
          :href="successPdfUrl"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {{ t('cartes_cadeaux.download_pdf', 'Télécharger le PDF') }}
        </a>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useHubT()

useHead({
  title: () => t('cartes_cadeaux.meta_title', 'Cartes cadeaux'),
  meta: [
    { name: 'description', content: t('cartes_cadeaux.meta_description', 'Offrez une carte cadeau de notre boutique, valable 1 an, à imprimer ou à envoyer par email.') },
  ],
})

const _pub = useRuntimeConfig().public as Record<string, any>
const giftcardPage: { hero?: string; card?: string } | null =
  _pub.giftcardPage && typeof _pub.giftcardPage === 'object' ? _pub.giftcardPage : null
const brandName = String(_pub.brandName ?? '')

const PRESETS: readonly number[] = giftcardPage ? [10, 20, 50, 100] : [25, 50, 100, 200]
const MAQUETTE_MODES = [
  { value: 'pdf' as const, titleKey: 'cartes_cadeaux.mode_print', titleFallback: 'Imprimer à la maison' },
  { value: 'email' as const, titleKey: 'cartes_cadeaux.mode_friend', titleFallback: 'Envoyer à un ami' },
]
const DELIVERY_MODES = [
  {
    value: 'pdf' as const,
    titleKey: 'cartes_cadeaux.mode_pdf', titleFallback: 'PDF imprimable',
    descKey: 'cartes_cadeaux.mode_pdf_desc', descFallback: 'Téléchargez et imprimez la carte pour l\'offrir en main propre.',
  },
  {
    value: 'email' as const,
    titleKey: 'cartes_cadeaux.mode_email', titleFallback: 'Envoi par email',
    descKey: 'cartes_cadeaux.mode_email_desc', descFallback: 'Le destinataire reçoit son code par email avec votre message.',
  },
  {
    value: 'both' as const,
    titleKey: 'cartes_cadeaux.mode_both', titleFallback: 'Les deux',
    descKey: 'cartes_cadeaux.mode_both_desc', descFallback: 'PDF côté acheteur + email côté destinataire.',
  },
]

const form = reactive({
  preset:           PRESETS[0] as number | null,
  customAmount:     null as number | null,
  deliveryMode:     (giftcardPage ? 'email' : 'pdf') as 'pdf' | 'email' | 'both',
  purchaserName:    '',
  purchaserEmail:   '',
  recipientName:    '',
  recipientEmail:   '',
  personalMessage:  '',
  sendDate:         '',
  website:          '',
})

const customOpen = ref(false)
const state = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const errorMessage = ref('')
const successCode = ref('')
const successPdfUrl = ref('')

const montantDemande = Math.round(Number(useRoute().query.montant))
if (Number.isFinite(montantDemande) && montantDemande >= 10 && montantDemande <= 500) {
  if (PRESETS.includes(montantDemande)) form.preset = montantDemande
  else { form.preset = null; form.customAmount = montantDemande; customOpen.value = !!giftcardPage }
}

function selectPreset(p: number) {
  form.preset = p
  form.customAmount = null
  customOpen.value = false
}

function openCustom() {
  form.preset = null
  customOpen.value = true
}

const minSendDate = (() => {
  const d = new Date(Date.now() + 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const amountEuros = computed<number>(() => {
  if (form.customAmount && form.customAmount >= 10 && form.customAmount <= 500) {
    return Math.round(form.customAmount)
  }
  if (customOpen.value) return 0
  return form.preset ?? 25
})

const needsRecipient = computed(() => form.deliveryMode === 'email' || form.deliveryMode === 'both')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const canSubmit = computed(() => {
  if (!form.purchaserName.trim() || !EMAIL_RE.test(form.purchaserEmail.trim())) return false
  if (amountEuros.value < 10 || amountEuros.value > 500) return false
  if (needsRecipient.value) {
    if (!form.recipientName.trim() || !EMAIL_RE.test(form.recipientEmail.trim())) return false
  }
  return true
})

function formatPrice(eur: number): string {
  return eur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

async function submit() {
  if (!canSubmit.value || state.value === 'sending') return
  state.value = 'sending'
  errorMessage.value = ''
  try {
    const r = await $fetch<{ ok: true; code: string; pdf_url: string }>('/api/giftcard/order', {
      method: 'POST',
      body: {
        amount_cents:      amountEuros.value * 100,
        delivery_mode:     form.deliveryMode,
        purchaser_name:    form.purchaserName.trim(),
        purchaser_email:   form.purchaserEmail.trim(),
        recipient_name:    needsRecipient.value ? form.recipientName.trim() : null,
        recipient_email:   needsRecipient.value ? form.recipientEmail.trim() : null,
        personal_message:  form.personalMessage.trim() || null,
        ...(needsRecipient.value && form.sendDate
          ? { scheduled_send_at: new Date(`${form.sendDate}T08:00:00`).toISOString() }
          : {}),
        website:           form.website,
      },
    })
    successCode.value = r.code
    successPdfUrl.value = r.pdf_url
    state.value = 'success'
  } catch (err: any) {
    state.value = 'error'
    errorMessage.value = err?.data?.statusMessage || t('cartes_cadeaux.error_generic', 'Une erreur est survenue. Réessayez plus tard.')
  }
}
</script>
