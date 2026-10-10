
<script setup lang="ts">
definePageMeta({ layout: 'hub' })

const { t } = useHubT()

type TabId = 'bankwire' | 'systempay' | 'stripe' | 'klarna'
const activeTab = ref<TabId>('bankwire')
const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'bankwire', label: t('hub.tab_bankwire', 'Virement') },
  { id: 'systempay', label: t('hub.tab_systempay', 'SystemPay') },
  { id: 'stripe', label: t('hub.tab_stripe', 'Stripe (carte)') },
  { id: 'klarna', label: t('hub.tab_klarna', 'Klarna (3/4 fois)') },
]

interface PaymentConfig {
  BANK_WIRE_OWNER: string
  BANK_WIRE_DETAILS: string
  BANK_WIRE_ADDRESS: string
  BANK_WIRE_CUSTOM_TEXT: string
  SYSTEMPAY_MODE: string
  PAYMENT_BANKWIRE_ENABLED: string
  PAYMENT_SYSTEMPAY_ENABLED: string
  PAYMENT_STRIPE_ENABLED: string
  PAYMENT_KLARNA_ENABLED: string
  PAYMENT_KLARNA_MIN_AMOUNT: string
  PAYMENT_KLARNA_MAX_AMOUNT: string
}
interface PaymentKeys {
  SYSTEMPAY_ID_SHOP: boolean
  SYSTEMPAY_TEST_KEY: boolean
  SYSTEMPAY_PROD_KEY: boolean
  STRIPE_SECRET_KEY: boolean
  STRIPE_PUBLISHABLE_KEY: boolean
  STRIPE_WEBHOOK_SECRET_STOREFRONT: boolean
}

const { data: paymentData, refresh: refreshPayment } = await useFetch<{ config: PaymentConfig; keys: PaymentKeys }>('/api/hub/configuration/payment', {
  key: 'hub-configuration-payment',
})

const paymentForm = reactive<PaymentConfig>({
  BANK_WIRE_OWNER: '',
  BANK_WIRE_DETAILS: '',
  BANK_WIRE_ADDRESS: '',
  BANK_WIRE_CUSTOM_TEXT: '',
  SYSTEMPAY_MODE: 'TEST',
  PAYMENT_BANKWIRE_ENABLED: '1',
  PAYMENT_SYSTEMPAY_ENABLED: '0',
  PAYMENT_STRIPE_ENABLED: '0',
  PAYMENT_KLARNA_ENABLED: '0',
  PAYMENT_KLARNA_MIN_AMOUNT: '0',
  PAYMENT_KLARNA_MAX_AMOUNT: '',
})

watchEffect(() => {
  const c = paymentData.value?.config
  if (!c) return
  Object.assign(paymentForm, c)
})

const saving = ref(false)
const savedMessage = ref<string>('')
const errorMessage = ref<string>('')

const CONFIG_KEYS = [
  'BANK_WIRE_OWNER', 'BANK_WIRE_DETAILS', 'BANK_WIRE_ADDRESS', 'BANK_WIRE_CUSTOM_TEXT',
  'SYSTEMPAY_MODE',
  'PAYMENT_BANKWIRE_ENABLED', 'PAYMENT_SYSTEMPAY_ENABLED',
  'PAYMENT_STRIPE_ENABLED', 'PAYMENT_KLARNA_ENABLED',
  'PAYMENT_KLARNA_MIN_AMOUNT', 'PAYMENT_KLARNA_MAX_AMOUNT',
] as const

const dirty = computed(() => {
  const srv = paymentData.value?.config
  if (!srv) return false
  return CONFIG_KEYS.some(k => (paymentForm[k] ?? '') !== ((srv as any)[k] ?? ''))
})

function togglePayment(key: 'PAYMENT_BANKWIRE_ENABLED' | 'PAYMENT_SYSTEMPAY_ENABLED' | 'PAYMENT_STRIPE_ENABLED' | 'PAYMENT_KLARNA_ENABLED') {
  paymentForm[key] = paymentForm[key] === '1' ? '0' : '1'
}

function setSystempayMode(newMode: 'TEST' | 'PROD') {
  paymentForm.SYSTEMPAY_MODE = newMode
}

function resetChanges() {
  const srv = paymentData.value?.config
  if (srv) Object.assign(paymentForm, srv)
  errorMessage.value = ''
}

async function saveAll() {
  if (saving.value || !dirty.value) return
  saving.value = true
  savedMessage.value = ''
  errorMessage.value = ''
  try {
    const patch: Record<string, string> = {}
    for (const k of CONFIG_KEYS) patch[k] = paymentForm[k] ?? ''
    await $fetch('/api/hub/configuration/payment', {
      method: 'POST',
      body: { patch },
    })
    
    await refreshPayment()
    savedMessage.value = t('hub.changes_saved', 'Modifications enregistrées')
    setTimeout(() => { savedMessage.value = '' }, 2500)
  } catch (err: any) {
    errorMessage.value = err?.data?.message ?? err?.message ?? t('hub.ui.payments.error_generic', 'Erreur')
  } finally {
    saving.value = false
  }
}

onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm(t('hub.unsaved_leave_confirm', 'Des modifications ne sont pas enregistrées. Quitter quand même ?'))) {
    return false
  }
})

function beforeUnloadGuard(e: BeforeUnloadEvent) {
  if (dirty.value) { e.preventDefault(); e.returnValue = '' }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnloadGuard))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnloadGuard))

const systempayTestCards = computed(() => [
  { brand: 'Visa',          number: '4970 1000 0000 0003', cvv: '123', exp: '12/30', result: t('hub.ui.payments.card_accepted', 'Paiement accepté') },
  { brand: 'Visa',          number: '4970 1100 0000 0014', cvv: '123', exp: '12/30', result: t('hub.ui.payments.card_3ds', '3DS authentification puis accepté') },
  { brand: 'Visa',          number: '4970 1000 0000 0144', cvv: '123', exp: '12/30', result: t('hub.ui.payments.card_declined', 'Refus carte (insuffisant)') },
  { brand: 'Mastercard',    number: '5970 1000 0000 0008', cvv: '123', exp: '12/30', result: t('hub.ui.payments.card_accepted', 'Paiement accepté') },
  { brand: 'Mastercard',    number: '5970 1100 0000 0019', cvv: '123', exp: '12/30', result: t('hub.ui.payments.card_3ds', '3DS authentification puis accepté') },
  { brand: 'CB',            number: '4970 1010 0000 0008', cvv: '123', exp: '12/30', result: t('hub.ui.payments.card_accepted', 'Paiement accepté') },
])

const stripeTestCards = [
  { number: '4242 4242 4242 4242', exp: t('hub.stripe_test_any_future', 'Date future'), cvc: t('hub.stripe_test_any_cvc', 'Libre'), result: t('hub.stripe_test_result_ok', 'Paiement accepté') },
  { number: '4000 0025 0000 3155', exp: t('hub.stripe_test_any_future', 'Date future'), cvc: t('hub.stripe_test_any_cvc', 'Libre'), result: t('hub.stripe_test_result_3ds', '3D Secure requis') },
  { number: '4000 0000 0000 9995', exp: t('hub.stripe_test_any_future', 'Date future'), cvc: t('hub.stripe_test_any_cvc', 'Libre'), result: t('hub.stripe_test_result_decline', 'Refus carte') },
]

const stripeKeysOk = computed(() => {
  const k = paymentData.value?.keys
  return k?.STRIPE_SECRET_KEY && k?.STRIPE_PUBLISHABLE_KEY && k?.STRIPE_WEBHOOK_SECRET_STOREFRONT
})

useHead({ title: computed(() => t('hub.ui.payments.head_title', 'Paiements — Hub')) })
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ t('hub.payments_title', 'Paiements') }}</h1>
      <p class="text-sm text-gray-500 dark:text-slate-400">
        {{ t('hub.payments_subtitle', 'Configuration des moyens de paiement du tenant. Vos changements sont mis en attente puis appliqués d\'un coup quand vous cliquez « Enregistrer les modifications ».') }}
      </p>
    </div>

    
    <div
      role="region"
      :aria-label="t('hub.save_bar_label', 'Barre d\'enregistrement')"
      class="sticky top-0 z-20 -mx-6 px-6 py-3 mb-6 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3"
    >
      <span
        aria-live="polite"
        class="text-xs font-medium flex items-center gap-2"
        :class="dirty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-slate-500'"
      >
        <span class="inline-block w-2 h-2 rounded-full" :class="dirty ? 'bg-amber-500' : 'bg-emerald-500'" />
        {{ dirty ? t('hub.unsaved_changes', 'Modifications non enregistrées') : t('hub.all_saved', 'Tout est enregistré') }}
      </span>
      <div class="flex items-center gap-2">
        <button
          v-if="dirty"
          type="button"
          :disabled="saving"
          class="text-xs px-3 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
          @click="resetChanges"
        >
          {{ t('hub.cancel', 'Annuler') }}
        </button>
        <button
          type="button"
          :disabled="!dirty || saving"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
          @click="saveAll"
        >
          {{ saving ? t('hub.saving', 'Enregistrement…') : t('hub.save_changes', 'Enregistrer les modifications') }}
        </button>
      </div>
    </div>

    
    <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm mb-6">
      <nav class="flex items-center gap-1 px-4 border-b border-gray-100 dark:border-slate-800" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="[
            'relative text-xs px-4 py-3 -mb-px border-b-2 transition-colors font-medium',
            activeTab === tab.id
              ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-200 dark:hover:border-slate-700'
          ]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    
    <div v-if="savedMessage" class="mb-4 px-4 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm">
      {{ savedMessage }}
    </div>
    <div v-if="errorMessage" class="mb-4 px-4 py-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
      {{ errorMessage }}
    </div>

    
    
    
    <div v-show="activeTab === 'bankwire'" class="space-y-6">
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('hub.section_bankwire_title', 'Virement bancaire (RIB)') }}</h2>
          
          <button
            type="button"
            :disabled="saving"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50"
            :class="paymentForm.PAYMENT_BANKWIRE_ENABLED === '1' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            :aria-label="t('hub.toggle_payment_enabled', 'Activer / désactiver ce moyen de paiement')"
            @click="togglePayment('PAYMENT_BANKWIRE_ENABLED')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="paymentForm.PAYMENT_BANKWIRE_ENABLED === '1' ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_bankwire_subtitle', 'Coordonnées affichées sur la page de confirmation et dans l\'email de commande quand le client paie par virement. Stocké dans ps_configuration (BANK_WIRE_*).') }}
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ t('hub.field_bank_owner', 'Bénéficiaire') }}</label>
            <input
              v-model="paymentForm.BANK_WIRE_OWNER"
              type="text"
              :placeholder="t('hub.placeholder_company_name', 'Ma Société')"
              maxlength="100"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="saving"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_bank_details', 'Coordonnées (IBAN / BIC)') }}
              <span class="text-gray-400 font-normal">· {{ paymentForm.BANK_WIRE_DETAILS.length }}/500</span>
            </label>
            <textarea
              v-model="paymentForm.BANK_WIRE_DETAILS"
              rows="3"
              maxlength="500"
              :placeholder="t('hub.ui.payments.ph_iban', 'IBAN : FR76 1234 5678 9012 3456 7890 123\nBIC : ABCDFRPPXXX')"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="saving"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{{ t('hub.field_bank_address', 'Adresse banque') }}</label>
            <textarea
              v-model="paymentForm.BANK_WIRE_ADDRESS"
              rows="2"
              maxlength="500"
              :placeholder="t('hub.ui.payments.ph_bank_address', 'NOM DE LA BANQUE\n1 RUE EXEMPLE\n75000 PARIS')"
              class="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="saving"
            />
          </div>
        </div>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.bankwire_note', 'Source : ps_configuration (BANK_WIRE_*, PAYMENT_BANKWIRE_ENABLED). Lu par /api/checkout/bankwire-details.') }}
      </p>
    </div>

    
    
    
    <div v-show="activeTab === 'systempay'" class="space-y-6">
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-start justify-between gap-4 mb-1">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('hub.section_systempay_title', 'SystemPay (CB)') }}</h2>
            <span
              class="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
              :class="paymentForm.SYSTEMPAY_MODE === 'PROD'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'"
            >
              {{ paymentForm.SYSTEMPAY_MODE || 'TEST' }}
            </span>
          </div>
          
          <button
            type="button"
            :disabled="saving"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50"
            :class="paymentForm.PAYMENT_SYSTEMPAY_ENABLED === '1' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            :aria-label="t('hub.toggle_payment_enabled', 'Activer / désactiver ce moyen de paiement')"
            @click="togglePayment('PAYMENT_SYSTEMPAY_ENABLED')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="paymentForm.PAYMENT_SYSTEMPAY_ENABLED === '1' ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_systempay_subtitle', 'Paiement carte bancaire via SystemPay (Lyra Network — Banque Populaire / Crédit Agricole). Mode TEST = redirection sandbox sans débit réel ; PROD = vrais paiements.') }}
        </p>

        
        <div class="flex items-center gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg w-fit">
          <button
            type="button"
            class="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors"
            :class="paymentForm.SYSTEMPAY_MODE === 'TEST' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
            :disabled="saving"
            @click="setSystempayMode('TEST')"
          >{{ t('hub.ui.payments.mode_test', 'TEST (sandbox)') }}</button>
          <button
            type="button"
            class="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors"
            :class="paymentForm.SYSTEMPAY_MODE === 'PROD' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
            :disabled="saving"
            @click="setSystempayMode('PROD')"
          >{{ t('hub.ui.payments.mode_prod', 'PROD (réel)') }}</button>
        </div>

        
        <div class="mb-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800">
          <p class="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-3">{{ t('hub.systempay_keys', 'Clés API (.env du VPS)') }}</p>
          <dl class="space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">SYSTEMPAY_ID_SHOP</dt>
              <dd>
                <span v-if="paymentData?.keys.SYSTEMPAY_ID_SHOP" class="text-emerald-600 dark:text-emerald-400 font-medium">{{ t('hub.key_configured', 'configuré') }}</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">{{ t('hub.key_missing', 'manquant') }}</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">SYSTEMPAY_TEST_KEY</dt>
              <dd>
                <span v-if="paymentData?.keys.SYSTEMPAY_TEST_KEY" class="text-emerald-600 dark:text-emerald-400 font-medium">{{ t('hub.key_configured', 'configuré') }}</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">{{ t('hub.key_missing', 'manquant') }}</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">SYSTEMPAY_PROD_KEY</dt>
              <dd>
                <span v-if="paymentData?.keys.SYSTEMPAY_PROD_KEY" class="text-emerald-600 dark:text-emerald-400 font-medium">{{ t('hub.key_configured', 'configuré') }}</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">{{ t('hub.key_missing', 'manquant') }}</span>
              </dd>
            </div>
          </dl>
          <p class="mt-3 text-[11px] text-gray-400 dark:text-slate-500 leading-relaxed">
            {{ t('hub.systempay_keys_note', 'Les clés vivent dans le `.env` du VPS (jamais en DB). Pour les modifier : SSH + édition manuelle + redeploy.') }}
          </p>
        </div>

        
        <div v-if="paymentForm.SYSTEMPAY_MODE === 'TEST'" class="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-4">
          <p class="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {{ t('hub.systempay_test_cards', 'Cartes de test SystemPay') }}
          </p>
          <table class="w-full text-xs">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-500/70 border-b border-amber-200/50 dark:border-amber-500/20">
                <th class="pb-2 font-medium">{{ t('hub.col_brand', 'Marque') }}</th>
                <th class="pb-2 font-medium">{{ t('hub.col_number', 'Numéro') }}</th>
                <th class="pb-2 font-medium">CVV</th>
                <th class="pb-2 font-medium">{{ t('hub.col_exp', 'Exp.') }}</th>
                <th class="pb-2 font-medium">{{ t('hub.col_result', 'Résultat') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-200/30 dark:divide-amber-500/10">
              <tr v-for="card in systempayTestCards" :key="card.number">
                <td class="py-2 text-amber-900 dark:text-amber-200">{{ card.brand }}</td>
                <td class="py-2 font-mono text-amber-900 dark:text-amber-200 select-all">{{ card.number }}</td>
                <td class="py-2 font-mono text-amber-900 dark:text-amber-200">{{ card.cvv }}</td>
                <td class="py-2 font-mono text-amber-900 dark:text-amber-200">{{ card.exp }}</td>
                <td class="py-2 text-amber-700 dark:text-amber-400">{{ card.result }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mt-3 text-[11px] text-amber-700 dark:text-amber-500/70 leading-relaxed">
            {{ t('hub.systempay_test_cards_note', 'Date d\'expiration future quelconque (ex: 12/30). En mode TEST aucune somme n\'est débitée. Référence officielle Lyra/SystemPay.') }}
          </p>
        </div>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.payment_note', 'Source : ps_configuration (BANK_WIRE_*, SYSTEMPAY_MODE) + .env du VPS pour les clés sensibles. Lu par /api/payment/systempay-* et /api/checkout/bankwire-details.') }}
      </p>
    </div>

    
    
    
    <div v-show="activeTab === 'stripe'" class="space-y-6">
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('hub.section_stripe_title', 'Stripe (carte bancaire)') }}</h2>
          
          <button
            type="button"
            :disabled="saving"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50"
            :class="paymentForm.PAYMENT_STRIPE_ENABLED === '1' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            :aria-label="t('hub.toggle_payment_enabled', 'Activer / désactiver ce moyen de paiement')"
            @click="togglePayment('PAYMENT_STRIPE_ENABLED')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="paymentForm.PAYMENT_STRIPE_ENABLED === '1' ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_stripe_subtitle', 'Paiement par carte bancaire via Stripe (Visa, Mastercard, American Express). Requis pour activer Klarna.') }}
        </p>

        
        <div v-if="!stripeKeysOk" class="mb-6 p-4 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5">
          <p class="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {{ t('hub.stripe_keys_incomplete', 'Clés Stripe incomplètes — Stripe ne peut pas être activé.') }}
          </p>
          <p class="text-[11px] text-amber-700 dark:text-amber-500/70 leading-relaxed">
            {{ t('hub.stripe_keys_incomplete_note', 'Ajoutez STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY et STRIPE_WEBHOOK_SECRET_STOREFRONT dans le .env du VPS puis redéployez.') }}
          </p>
        </div>

        
        <div class="mb-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800">
          <p class="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-3">{{ t('hub.stripe_keys', 'Clés API (.env du VPS)') }}</p>
          <dl class="space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">STRIPE_SECRET_KEY</dt>
              <dd>
                <span v-if="paymentData?.keys.STRIPE_SECRET_KEY" class="text-emerald-600 dark:text-emerald-400 font-medium">{{ t('hub.key_configured', 'configuré') }}</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">{{ t('hub.key_missing', 'manquant') }}</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">STRIPE_PUBLISHABLE_KEY</dt>
              <dd>
                <span v-if="paymentData?.keys.STRIPE_PUBLISHABLE_KEY" class="text-emerald-600 dark:text-emerald-400 font-medium">{{ t('hub.key_configured', 'configuré') }}</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">{{ t('hub.key_missing', 'manquant') }}</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="font-mono text-gray-600 dark:text-slate-300">STRIPE_WEBHOOK_SECRET_STOREFRONT</dt>
              <dd>
                <span v-if="paymentData?.keys.STRIPE_WEBHOOK_SECRET_STOREFRONT" class="text-emerald-600 dark:text-emerald-400 font-medium">{{ t('hub.key_configured', 'configuré') }}</span>
                <span v-else class="text-rose-600 dark:text-rose-400 font-medium">{{ t('hub.key_missing', 'manquant') }}</span>
              </dd>
            </div>
          </dl>
          <p class="mt-3 text-[11px] text-gray-400 dark:text-slate-500 leading-relaxed">
            {{ t('hub.stripe_keys_note', 'Les clés vivent dans le `.env` du VPS (jamais en DB). Pour les modifier : SSH + édition manuelle + redeploy.') }}
          </p>
        </div>

        
        <div class="rounded-lg border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-4">
          <p class="text-xs font-semibold text-violet-800 dark:text-violet-400 mb-3">
            {{ t('hub.stripe_test_cards', 'Cartes de test Stripe') }}
          </p>
          <table class="w-full text-xs">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-500/70 border-b border-violet-200/50 dark:border-violet-500/20">
                <th class="pb-2 font-medium">{{ t('hub.col_number', 'Numéro') }}</th>
                <th class="pb-2 font-medium">{{ t('hub.col_exp', 'Exp.') }}</th>
                <th class="pb-2 font-medium">CVC</th>
                <th class="pb-2 font-medium">{{ t('hub.col_result', 'Résultat') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-violet-200/30 dark:divide-violet-500/10">
              <tr v-for="card in stripeTestCards" :key="card.number">
                <td class="py-2 font-mono text-violet-900 dark:text-violet-200 select-all">{{ card.number }}</td>
                <td class="py-2 text-violet-700 dark:text-violet-300">{{ card.exp }}</td>
                <td class="py-2 text-violet-700 dark:text-violet-300">{{ card.cvc }}</td>
                <td class="py-2 text-violet-700 dark:text-violet-400">{{ card.result }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mt-3 text-[11px] text-violet-700 dark:text-violet-500/70 leading-relaxed">
            {{ t('hub.stripe_test_cards_note', 'En mode test Stripe, aucune somme n\'est débitée. Référence : stripe.com/docs/testing.') }}
          </p>
        </div>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.stripe_note', 'Source : ps_configuration (PAYMENT_STRIPE_ENABLED) + .env du VPS pour les clés. Lu par /api/payment/stripe-*.') }}
      </p>
    </div>

    
    
    
    <div v-show="activeTab === 'klarna'" class="space-y-6">
      <section class="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('hub.section_klarna_title', 'Klarna (paiement en 3 ou 4 fois)') }}</h2>
          
          <button
            type="button"
            :disabled="saving || paymentForm.PAYMENT_STRIPE_ENABLED !== '1'"
            :title="paymentForm.PAYMENT_STRIPE_ENABLED !== '1' ? t('hub.klarna_requires_stripe', 'Klarna nécessite Stripe activé') : undefined"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            :class="paymentForm.PAYMENT_KLARNA_ENABLED === '1' && paymentForm.PAYMENT_STRIPE_ENABLED === '1' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'"
            :aria-label="t('hub.toggle_payment_enabled', 'Activer / désactiver ce moyen de paiement')"
            @click="togglePayment('PAYMENT_KLARNA_ENABLED')"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"
              :class="paymentForm.PAYMENT_KLARNA_ENABLED === '1' && paymentForm.PAYMENT_STRIPE_ENABLED === '1' ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        
        <div v-if="paymentForm.PAYMENT_STRIPE_ENABLED !== '1'" class="mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {{ t('hub.klarna_requires_stripe', 'Klarna nécessite Stripe activé') }} — {{ t('hub.klarna_requires_stripe_hint', 'activez d\'abord l\'onglet Stripe.') }}
        </div>

        <p class="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {{ t('hub.section_klarna_subtitle', 'Paiement fractionné (3 ou 4 fois) via Klarna, distribué par Stripe. Soumis à une obligation légale d\'affichage de la mention crédit.') }}
        </p>

        
        <div class="space-y-4 mb-6">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_klarna_min', 'Montant minimum (€)') }}
              <span class="text-gray-400 font-normal">· {{ t('hub.field_klarna_min_hint', 'le panier doit atteindre ce montant TTC pour afficher Klarna') }}</span>
            </label>
            <input
              v-model="paymentForm.PAYMENT_KLARNA_MIN_AMOUNT"
              type="number"
              min="0"
              step="1"
              :placeholder="t('hub.field_klarna_min_placeholder', 'ex : 100')"
              class="w-40 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="saving"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {{ t('hub.field_klarna_max', 'Montant maximum (€)') }}
              <span class="text-gray-400 font-normal">· {{ t('hub.field_klarna_max_hint', 'optionnel — laissez vide pour pas de plafond') }}</span>
            </label>
            <input
              v-model="paymentForm.PAYMENT_KLARNA_MAX_AMOUNT"
              type="number"
              min="0"
              step="1"
              :placeholder="t('hub.field_klarna_max_placeholder', 'ex : 4000 (optionnel)')"
              class="w-40 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="saving"
            >
          </div>
        </div>

        
        <div class="p-4 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5">
          <p class="text-xs font-semibold text-blue-800 dark:text-blue-400 mb-2">
            {{ t('hub.klarna_legal_title', 'Mention légale obligatoire') }}
          </p>
          <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed italic">
            {{ t('hub.klarna_legal_text', 'Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.') }}
          </p>
          <p class="mt-2 text-[11px] text-blue-600 dark:text-blue-400/70 leading-relaxed">
            {{ t('hub.klarna_legal_note', 'Cette mention est affichée automatiquement sur la page de paiement et dans les emails de confirmation.') }}
          </p>
        </div>
      </section>

      <p class="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
        {{ t('hub.klarna_note', 'Source : ps_configuration (PAYMENT_KLARNA_ENABLED, PAYMENT_KLARNA_MIN_AMOUNT, PAYMENT_KLARNA_MAX_AMOUNT). Klarna est distribué par Stripe — PAYMENT_STRIPE_ENABLED doit être \'1\'.') }}
      </p>
    </div>

    
    <div
      role="region"
      :aria-label="t('hub.save_bar_label', 'Barre d\'enregistrement')"
      class="sticky bottom-0 z-20 -mx-6 px-6 py-3 mt-6 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3"
    >
      <span
        aria-live="polite"
        class="text-xs font-medium flex items-center gap-2"
        :class="dirty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-slate-500'"
      >
        <span class="inline-block w-2 h-2 rounded-full" :class="dirty ? 'bg-amber-500' : 'bg-emerald-500'" />
        {{ dirty ? t('hub.unsaved_changes', 'Modifications non enregistrées') : t('hub.all_saved', 'Tout est enregistré') }}
      </span>
      <div class="flex items-center gap-2">
        <button
          v-if="dirty"
          type="button"
          :disabled="saving"
          class="text-xs px-3 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
          @click="resetChanges"
        >
          {{ t('hub.cancel', 'Annuler') }}
        </button>
        <button
          type="button"
          :disabled="!dirty || saving"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
          @click="saveAll"
        >
          {{ saving ? t('hub.saving', 'Enregistrement…') : t('hub.save_changes', 'Enregistrer les modifications') }}
        </button>
      </div>
    </div>
  </div>
</template>
