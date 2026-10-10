
<script setup lang="ts">
import { recapTTCActif, recapPanier, totalLigneTTC, totalAPayerTTC } from '~/utils/cart-totals'
import { tunnelSplit, lienInscriptionTunnel } from '~/utils/checkout-layout'
import { MOYENS_ACHAT_AU_RETOUR } from '~/utils/analytics-events'
import { pagePaiementActive, suiteApresAdresse, liensLegaux, separateurAvant, peutCommander } from '~/utils/checkout-page'
import { gabaritDuTunnel, type LigneGabarit } from '~/utils/gabarit-tunnel'
definePageMeta({ layout: false })
const { localePath } = useLocalePath()

const { data: encartsLignes } = await useFetch<{ sections?: LigneGabarit[] }>('/api/page-sections', {
  
  
  
  
  
  
  query: { parent_type: 'checkout', parent_id: 0, all: 1 },
  key: 'gabarit-commander',
  default: () => ({ sections: [] }),
})
const encarts = computed(() => gabaritDuTunnel('checkout', encartsLignes.value?.sections ?? []))

const { registerContext, clearContext } = useEditorContext()
onMounted(() => registerContext('checkout'))
onUnmounted(() => clearContext())

const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const _brand = String((_cfg.public as any).brandName ?? '')
const { loggedIn, customer, login, logout, loading: authLoading, checkSession } = useCustomerAuth()
const {
  items, cartId, totalHT, totalTTC, totalFormatted, totalTTCFormatted,
  subtotalHT, subtotalTTC, subtotalFormatted,
  discountCode, discountHT, applyPromoCode, removePromoCode, promoEnAttente, promoAttenteErreur,
  initServerCart, clearCart, isServerMode,
  appliedCorseTva,
} = useServerCart(clientId)
const { t } = useHubT()
const {
  step, loading, error,
  addresses, selectedAddressId,
  selectedInvoiceAddressId, useDifferentInvoiceAddress,
  carriers, selectedCarrierId, selectedCarrier, shippingPrice, shippingPriceTTC, deliveryComment,
  vatIntracom, vatValid, vatChecking, vatError, vatCompany, loadVatStatus, validateVat,
  paymentMethod, createdOrder,
  loadAddresses, createAddress, updateAddress, deleteAddress,
  loadCarriers, placeOrder, goToStep,
} = useCheckout(clientId)

const promoInput = ref('')
const promoError = ref('')
const promoLoading = ref(false)

async function onApplyPromo() {
  if (!promoInput.value.trim()) return
  promoError.value = ''
  promoLoading.value = true
  try {
    await applyPromoCode(promoInput.value.trim(), { totalHT: recap.value.totalHT })
    promoInput.value = ''
  } catch (err: any) {
    promoError.value = err?.data?.message || t('checkout.checkout_promo_invalid', 'Code invalide')
  } finally {
    promoLoading.value = false
  }
}

async function onRemovePromo() {
  promoLoading.value = true
  try { await removePromoCode() } finally { promoLoading.value = false }
}

const finalTotalTTCHistorique = computed(() => Math.max(0, totalTTC.value - discountHT.value) + shippingPriceTTC.value)

const recapTTC = computed(() => recapTTCActif(_cfg.public as Record<string, any>, !lignesTTC.value))
const recap = computed(() => recapPanier({
  serveur: isServerMode.value
    ? { subtotalTTC: subtotalTTC.value, totalTTC: totalTTC.value, totalHT: totalHT.value }
    : null,
  lignes: items.value,
  lignesTTC: lignesTTC.value,
  remiseAttente: promoEnAttente.value,
}))
const finalTotalTTC = computed(() => (recapTTC.value
  ? totalAPayerTTC(recap.value, shippingPriceTTC.value)
  : finalTotalTTCHistorique.value))

const enabledPayments = ref<{ bankwire: boolean; systempay: boolean; payplug?: boolean; stripe: boolean; paypal?: boolean; klarna: boolean; klarnaMinAmount: number }>({ bankwire: true, systempay: false, payplug: false, stripe: false, paypal: false, klarna: false, klarnaMinAmount: 0 })
async function loadPaymentMethods() {
  try {
    enabledPayments.value = await $fetch('/api/checkout/payment-methods', { query: { clientId } })
  } catch {  }
  
  const sel = paymentMethod.value as 'bankwire' | 'systempay' | 'payplug' | 'stripe' | 'paypal' | 'klarna'
  if (!enabledPayments.value[sel]) {
    paymentMethod.value = enabledPayments.value.bankwire ? 'bankwire'
      : enabledPayments.value.payplug ? 'payplug'
      : enabledPayments.value.systempay ? 'systempay'
      : enabledPayments.value.stripe ? 'stripe'
      : enabledPayments.value.paypal ? 'paypal'
      : enabledPayments.value.klarna ? 'klarna'
      : 'bankwire'
  }
}

const { activeLang: langConditions } = useRouteLang()
const { data: conditionsLues } = await useFetch<{ required: boolean; slug?: string }>('/api/checkout/terms', { query: { clientId, lang: langConditions } })

const conditions = computed(() => conditionsLues.value ?? { required: false })
const conditionsAcceptees = ref(false)
const conditionsManquantes = computed(() => !splitTunnel.value && conditions.value.required && !conditionsAcceptees.value)

const bankwireDetails = ref<{ owner: string; details: string; address: string; customText: string } | null>(null)
async function loadBankwireDetails() {
  try {
    bankwireDetails.value = await $fetch('/api/checkout/bankwire-details', { query: { clientId } })
  } catch {  }
}
watch(() => createdOrder.value, async (o) => {
  if (o && paymentMethod.value === 'bankwire' && !bankwireDetails.value) {
    await loadBankwireDetails()
  }
})

const { trackPurchase, trackBeginCheckout } = useAnalytics()

const PAIEMENT_CHEZ_PRESTATAIRE: ReadonlySet<string> = new Set([...MOYENS_ACHAT_AU_RETOUR, 'systempay', 'payplug'])
watch(() => createdOrder.value, (o) => {
  if (!o?.reference) return
  
  
  
  if (MOYENS_ACHAT_AU_RETOUR.has(paymentMethod.value)) return
  trackPurchase({
    transactionId: String(o.reference),
    value: Number(o.totalPaidTTC) || 0,
    currency: 'EUR',
  })
})

onMounted(async () => {
  
  
  trackBeginCheckout(String(Date.now()))
  
  goToStep('auth')
  loadPaymentMethods()
  await checkSession()
  
  if (loggedIn.value && customer.value) {
    if (!isServerMode.value) {
      await initServerCart(customer.value.customerId)
    }
    await loadAddresses(customer.value.customerId)
    loadVatStatus()
    goToStep('address')
  }
})

watch(loggedIn, async (v, oldV) => {
  if (v && !oldV && customer.value) {
    if (!isServerMode.value) {
      await initServerCart(customer.value.customerId)
    }
    if (step.value === 'auth') {
      await loadAddresses(customer.value.customerId)
      loadVatStatus()
      goToStep('address')
    }
  }
})

const loginForm = reactive({ email: '', password: '' })
const loginError = ref('')

async function onLogin() {
  loginError.value = ''
  try {
    await login(loginForm.email, loginForm.password)
  } catch (err: any) {
    loginError.value = err.data?.message ?? t('auth.login_error_invalid')
  }
}

const splitTunnel = computed(() => tunnelSplit(_cfg.public as Record<string, any>))
const entreeSplit = computed(() => splitTunnel.value && step.value === 'auth' && !(loggedIn.value && customer.value))
const choixEntree = ref<'' | 'connexion' | 'invite'>('')
const lienInscription = computed(() => lienInscriptionTunnel(localePath))

async function onContinueAsLoggedIn() {
  if (!customer.value) return
  if (!isServerMode.value) await initServerCart(customer.value.customerId)
  await loadAddresses(customer.value.customerId)
  goToStep('address')
}

async function onLogout() {
  await logout()
  
  
  clearCart()
  loginForm.email = ''
  loginForm.password = ''
  guestSession.value = null
}

const psFlags = useState<Record<string, string>>('ps_flags', () => ({}))

const lignesTTC = computed(() => psFlags.value?.PS_B2B_ENABLE !== '1')
const guestCheckoutEnabled = computed(() => psFlags.value?.PS_GUEST_CHECKOUT_ENABLED === '1')

const emailLabel = computed(() => psFlags.value?.PS_B2B_ENABLE === '1' ? t('auth.label_email_pro') : t('auth.label_email'))

const phoneRequired = computed(() => psFlags.value?.CHECKOUT_PHONE_REQUIRED === '1')

const guestSession = ref<{ customerId: number; email: string } | null>(null)
const guestForm = reactive({ email: '' })
const guestError = ref('')
const guestLoading = ref(false)

const checkoutCustomerId = computed(() => customer.value?.customerId ?? guestSession.value?.customerId ?? 0)
const checkoutEmail = computed(() => customer.value?.email ?? guestSession.value?.email ?? '')

async function onGuestContinue() {
  guestError.value = ''
  const email = guestForm.email.trim()
  if (!email) return
  guestLoading.value = true
  try {
    const res = await $fetch<{ customerId?: number; email?: string; needsLogin?: boolean }>(
      '/api/catalogue/customer/guest',
      { method: 'POST', body: { email, clientId } },
    )
    if (res.needsLogin) {
      
      guestError.value = t('checkout.guest_account_exists', 'Un compte existe déjà avec cet email. Connectez-vous pour continuer.')
      loginForm.email = email
      
      
      choixEntree.value = 'connexion'
      return
    }
    if (!res.customerId) throw new Error('no customerId')
    guestSession.value = { customerId: res.customerId, email: res.email || email }
    if (!isServerMode.value) await initServerCart(res.customerId)
    await loadAddresses(res.customerId)
    loadVatStatus()
    goToStep('address')
  } catch (err: any) {
    guestError.value = err?.data?.message ?? t('checkout.guest_error', 'Impossible de continuer en invité. Réessayez.')
  } finally {
    guestLoading.value = false
  }
}

const addressForm = reactive({
  company: '', firstname: '', lastname: '',
  address1: '', address2: '', postcode: '', city: '',
  phone: '', countryId: 8,
})
const countries = ref<{ id: number; iso?: string; name: string }[]>([])

const { activeLang: langPays } = useRouteLang()
onMounted(async () => {
  try {
    countries.value = await $fetch<{ id: number; iso?: string; name: string }[]>('/api/catalogue/countries', { query: { clientId, lang: langPays.value } })
  } catch {  }
})

const EU_HORS_FR = new Set(['DE','AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
const selectedAddress = computed(() => addresses.value.find(a => a.id === selectedAddressId.value))
const selectedCountry = computed(() => countries.value.find(c => c.id === Number(selectedAddress.value?.countryId)))
const selectedCountryIso = computed(() => String(selectedCountry.value?.iso || '').toUpperCase())
const vatRequired = computed(() => EU_HORS_FR.has(selectedCountryIso.value) && !vatValid.value)

const vatInputDraft = ref('')
watch(vatIntracom, (v) => { vatInputDraft.value = v }, { immediate: true })

async function onClickValidateVat() {
  if (!vatInputDraft.value.trim()) return
  await validateVat(vatInputDraft.value.trim())
}
const showNewAddress = ref(false)
const editingAddressId = ref<number | null>(null)

const creatingForBilling = ref(false)

function startNewAddress(forBilling = false) {
  resetAddressForm()
  creatingForBilling.value = forBilling
  showNewAddress.value = true
}

function startEditAddress(addr: any) {
  editingAddressId.value = addr.id
  addressForm.company = addr.company || ''
  addressForm.firstname = addr.firstname || ''
  addressForm.lastname = addr.lastname || ''
  addressForm.address1 = addr.address1 || ''
  addressForm.address2 = addr.address2 || ''
  addressForm.postcode = addr.postcode || ''
  addressForm.city = addr.city || ''
  addressForm.phone = addr.phone || ''
  addressForm.countryId = addr.countryId || 8
  showNewAddress.value = true
}

function resetAddressForm() {
  editingAddressId.value = null
  creatingForBilling.value = false
  addressForm.company = ''
  addressForm.firstname = ''
  addressForm.lastname = ''
  addressForm.address1 = ''
  addressForm.address2 = ''
  addressForm.postcode = ''
  addressForm.city = ''
  addressForm.phone = ''
  addressForm.countryId = 8
  showNewAddress.value = false
}

async function onSaveAddress() {
  if (!checkoutCustomerId.value) return
  
  
  
  const previousShippingId = selectedAddressId.value
  const isBillingCreation = creatingForBilling.value && !editingAddressId.value

  if (editingAddressId.value) {
    const addr = await updateAddress(editingAddressId.value, {
      company: addressForm.company,
      firstname: addressForm.firstname || customer.value?.firstname || '',
      lastname: addressForm.lastname || customer.value?.lastname || '',
      address1: addressForm.address1,
      address2: addressForm.address2,
      postcode: addressForm.postcode,
      city: addressForm.city,
      phone: addressForm.phone,
      countryId: addressForm.countryId,
    })
    if (addr) resetAddressForm()
  } else {
    const aliasKey = isBillingCreation ? 'checkout.checkout_address_alias_billing' : 'checkout.checkout_address_alias_default'
    const aliasFallback = isBillingCreation ? 'Facturation' : 'Livraison'
    const addr = await createAddress({
      customerId: checkoutCustomerId.value,
      alias: t(aliasKey, aliasFallback),
      company: addressForm.company,
      firstname: addressForm.firstname || customer.value?.firstname || '',
      lastname: addressForm.lastname || customer.value?.lastname || '',
      address1: addressForm.address1,
      address2: addressForm.address2,
      postcode: addressForm.postcode,
      city: addressForm.city,
      countryId: addressForm.countryId,
      phone: addressForm.phone,
    })
    if (addr) {
      if (isBillingCreation) {
        
        
        if (previousShippingId !== null) selectedAddressId.value = previousShippingId
        selectedInvoiceAddressId.value = addr.id!
        useDifferentInvoiceAddress.value = true
      }
      resetAddressForm()
    }
  }
}

async function onDeleteAddress(addrId: number) {
  await deleteAddress(addrId)
}

async function goToShipping() {
  if (!selectedAddressId.value) return
  
  if (vatRequired.value) return
  await loadCarriers({
    addressId: selectedAddressId.value,
    totalHT: totalHT.value,
  })
  goToStep('shipping')
}

async function goToPayment() {
  if (!selectedCarrierId.value) return
  goToStep('payment')
}

const pagePaiement = computed(() => pagePaiementActive(splitTunnel.value, step.value))
const complementOuvert = ref(false)
const cgvCochee = ref(false)

const footerLegal = splitTunnel.value
  ? (await useFetch('/api/footer', { query: { lang: useRouteLang().activeLang } })).data
  : ref(null)
const documentsLegaux = computed(() => liensLegaux((footerLegal.value as any)?.columns))

async function onPasserAuPaiement() {
  if (!selectedAddressId.value || vatRequired.value) return
  await loadCarriers({ addressId: selectedAddressId.value, totalHT: totalHT.value })
  const suite = suiteApresAdresse(carriers.value)
  if (suite.transporteur !== null) selectedCarrierId.value = suite.transporteur
  goToStep(suite.etape)
}

function onModifierAdresse(addr: any) {
  goToStep('address')
  startEditAddress(addr)
  complementOuvert.value = Boolean(addr?.address2)
}

function onSeConnecterDepuisPage() {
  goToStep('auth')
  choixEntree.value = 'connexion'
}

const commandeActive = computed(() => peutCommander({
  cgvCochee: cgvCochee.value,
  cgvExigee: documentsLegaux.value.length > 0,
  chargement: loading.value,
  sousMinimum: underMinimum.value,
  moyenChoisi: Boolean((enabledPayments.value as Record<string, unknown>)[paymentMethod.value]),
}))

const { data: salesPolicy } = await useFetch<{ purchaseMinimumHt: number }>('/api/catalogue/sales-policy', {
  default: () => ({ purchaseMinimumHt: 0 }),
})
const purchaseMinimumHt = computed(() => Number(salesPolicy.value?.purchaseMinimumHt || 0))

const minimumBaseHt = computed(() => (recapTTC.value ? recap.value.totalHT : totalHT.value))
const underMinimum = computed(() => purchaseMinimumHt.value > 0 && minimumBaseHt.value < purchaseMinimumHt.value)

const minimumMessage = computed(() => t('checkout.minimum_not_reached_msg', 'Il manque {delta} HT pour atteindre le minimum de {min} HT. Retournez au panier pour ajouter des produits.')
  .replace('{delta}', formatPrice(Math.max(0, purchaseMinimumHt.value - minimumBaseHt.value)))
  .replace('{min}', formatPrice(purchaseMinimumHt.value)))

async function onPlaceOrder() {
  if (!cartId.value || !checkoutCustomerId.value) return
  if (underMinimum.value) {
    error.value = minimumMessage.value
    return
  }
  if (conditionsManquantes.value) {
    error.value = t('checkout.terms_required', 'Merci d’accepter les conditions générales de vente pour commander.')
    return
  }
  const order = await placeOrder(cartId.value, checkoutCustomerId.value, checkoutEmail.value)
  if (!order) return

  
  if (paymentMethod.value === 'systempay') {
    try {
      const formData = await $fetch<{ url: string; fields: Record<string, string> }>('/api/payment/systempay-form', {
        method: 'POST',
        body: {
          orderId: order.id,
          orderReference: order.reference,
          amount: order.totalPaidTTC,
          customerEmail: checkoutEmail.value,
        },
      })

      
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = formData.url
      for (const [name, value] of Object.entries(formData.fields)) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        form.appendChild(input)
      }
      document.body.appendChild(form)
      clearCart()
      form.submit()
      return
    } catch (err: any) {
      error.value = t('checkout.systempay_error')
      console.error('[systempay] Erreur génération formulaire:', err?.message)
      return
    }
  }

  
  if (paymentMethod.value === 'payplug') {
    try {
      const res = await $fetch<{ url: string; paymentId: string }>('/api/payment/payplug-create', {
        method: 'POST',
        body: {
          orderId: order.id,
        },
      })
      clearCart()
      window.location.href = res.url
      return
    } catch (err: any) {
      error.value = t('checkout.payplug_error', 'Une erreur est survenue lors de l\'initialisation du paiement PayPlug.')
      console.error('[payplug] Erreur création paiement:', err?.message)
      return
    }
  }

  
  
  
  if (paymentMethod.value === 'paypal') {
    try {
      const res = await $fetch<{ url: string; paypalOrderId: string }>('/api/payment/paypal-create', {
        method: 'POST',
        body: { orderId: order.id },
      })
      clearCart()
      window.location.href = res.url
      return
    } catch (err: any) {
      error.value = t('checkout.paypal_error', 'Une erreur est survenue lors de l\'initialisation du paiement PayPal.')
      console.error('[paypal] Erreur création paiement:', err?.message)
      return
    }
  }

  
  
  if (paymentMethod.value === 'stripe' || paymentMethod.value === 'klarna') {
    try {
      const stripeMethod = paymentMethod.value === 'klarna' ? 'klarna' : 'card'
      const { url } = await $fetch<{ url: string }>('/api/checkout/stripe/create-payment', {
        method: 'POST',
        body: {
          clientId,
          orderId: order.id,
          method: stripeMethod,
        },
      })
      clearCart()
      window.location.href = url
      return
    } catch (err: any) {
      error.value = t('checkout.stripe_error', 'Une erreur est survenue lors de la redirection vers le paiement. Veuillez réessayer.')
      console.error('[stripe] Erreur création session paiement:', err?.message)
      return
    }
  }

  clearCart()
}

const steps = computed(() => [
  { key: 'auth', num: 1, label: t('checkout.step_connexion') },
  { key: 'address', num: 2, label: t('checkout.step_adresses') },
  { key: 'shipping', num: 3, label: t('checkout.step_livraison') },
  { key: 'payment', num: 4, label: t('checkout.step_paiement') },
])

const stepNum = computed(() => {
  if (step.value === 'confirmation') return 5
  return steps.value.find(s => s.key === step.value)?.num || 1
})

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

useListingBodyId('checkout')

useHead({ title: _brand ? `${t('checkout.head_title', 'Commander')} — ${_brand}` : t('checkout.head_title', 'Commander') })
</script>

<template>
  <NuxtLayout name="checkout">
    <div class="min-h-screen" :class="splitTunnel ? 'bg-white' : 'bg-gray-50'">

      
      <div v-if="step !== 'confirmation' && !entreeSplit && !pagePaiement" class="bg-white border-b border-gray-100">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div class="flex items-center justify-between">
            <div
              v-for="s in steps"
              :key="s.num"
              class="flex items-center gap-2"
              :class="s.num < stepNum ? 'text-primary-600' : s.num === stepNum ? 'text-gray-900' : 'text-gray-300'"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                :class="s.num < stepNum ? 'bg-primary-600 border-primary-600 text-white' : s.num === stepNum ? 'border-primary-600 text-primary-600' : 'border-gray-200 text-gray-300'"
              >
                <span v-if="s.num < stepNum">✓</span>
                <span v-else>{{ s.num }}</span>
              </div>
              <span class="text-xs font-semibold hidden sm:inline">{{ s.label }}</span>
              <div v-if="s.num < 4" class="w-8 sm:w-16 h-px mx-1" :class="s.num < stepNum ? 'bg-primary-600' : 'bg-gray-200'" />
            </div>
          </div>
        </div>
      </div>

      <div :class="pagePaiement ? 'max-w-7xl mx-auto px-4 sm:px-6 py-16' : entreeSplit ? 'max-w-6xl mx-auto px-4 sm:px-6 py-16' : 'max-w-3xl mx-auto px-4 sm:px-6 py-8'">

        
        <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {{ error }}
        </div>

        
        <div v-if="step === 'auth'" :class="entreeSplit ? 'py-8' : 'bg-white rounded-2xl p-8 shadow-sm'">
          
          <template v-if="loggedIn && customer">
            <h2 class="text-xl font-bold text-gray-900 mb-2">{{ t('checkout.auth_already_title') }}</h2>
            <p class="text-sm text-gray-500 mb-6">{{ t('checkout.auth_already_subtitle') }}</p>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ emailLabel }}</label>
                <input
                  :value="customer.email"
                  type="email"
                  disabled
                  aria-readonly="true"
                  class="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-600 rounded-xl text-sm cursor-not-allowed"
                />
              </div>
              <button
                type="button"
                :disabled="loading"
                class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors"
                @click="onContinueAsLoggedIn"
              >
                {{ t('checkout.auth_continue_as_logged_in') }}
              </button>
              <p class="text-xs text-gray-400 text-center">
                {{ t('checkout.auth_not_you') }}
                <button type="button" class="text-primary-600 hover:underline" @click="onLogout">
                  {{ t('auth.logout') }}
                </button>
              </p>
            </div>
          </template>

          
          <div v-else-if="splitTunnel" class="grid gap-12 md:grid-cols-2 md:divide-x md:divide-gray-200" data-entree="split">
            <div class="flex flex-col items-center text-center px-4">
              <h2 class="text-2xl text-gray-900 leading-snug max-w-md">
                {{ t('checkout.split_login_title', 'Connectez-vous à votre compte {brand} afin de récupérer vos points de fidélité').replace('{brand}', _brand) }}
              </h2>
              <div class="mt-6 w-full max-w-xs space-y-3">
                <button
                  type="button"
                  class="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-base transition-colors"
                  data-choix="connexion"
                  :aria-expanded="choixEntree === 'connexion'"
                  @click="choixEntree = 'connexion'"
                >{{ t('checkout.split_login_button', 'Se connecter') }}</button>
                <NuxtLink
                  :to="lienInscription"
                  class="block w-full py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-base transition-colors"
                  data-choix="inscription"
                >{{ t('checkout.split_register_button', 'S’inscrire') }}</NuxtLink>
              </div>
              <form v-if="choixEntree === 'connexion'" class="mt-6 w-full max-w-sm space-y-4 text-left" @submit.prevent="onLogin">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ emailLabel }}</label>
                  <input v-model="loginForm.email" type="email" required autocomplete="email" class="w-full px-4 py-3 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" :placeholder="t('auth.placeholder_email')" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_password') }}</label>
                  <input v-model="loginForm.password" type="password" required autocomplete="current-password" class="w-full px-4 py-3 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" />
                </div>
                <p v-if="loginError" class="text-red-500 text-xs">{{ loginError }}</p>
                <button type="submit" :disabled="authLoading" class="w-full py-3 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg text-sm transition-colors">
                  {{ authLoading ? t('auth.login_loading') : t('auth.login_button') }}
                </button>
              </form>
            </div>

            <div v-if="guestCheckoutEnabled" class="flex flex-col items-center text-center px-4" data-entree-invite>
              <h2 class="text-2xl text-gray-900 leading-snug max-w-md">
                {{ t('checkout.split_guest_title', 'Vous pouvez régler en tant qu’invité si vous ne souhaitez pas créer de compte') }}
              </h2>
              <div class="mt-6 w-full max-w-xs">
                <button
                  type="button"
                  class="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-base transition-colors"
                  data-choix="invite"
                  :aria-expanded="choixEntree === 'invite'"
                  @click="choixEntree = 'invite'"
                >{{ t('checkout.split_guest_button', 'Compte invité') }}</button>
              </div>
              <form v-if="choixEntree === 'invite'" class="mt-6 w-full max-w-sm space-y-4 text-left" @submit.prevent="onGuestContinue">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ emailLabel }}</label>
                  <input v-model="guestForm.email" type="email" required autocomplete="email" class="w-full px-4 py-3 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" :placeholder="t('auth.placeholder_email')" />
                </div>
                <p v-if="guestError" class="text-red-500 text-xs">{{ guestError }}</p>
                <button type="submit" :disabled="guestLoading" class="w-full py-3 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
                  {{ guestLoading ? t('checkout.guest_loading', 'Patientez…') : t('checkout.guest_continue', 'Continuer en tant qu\'invité') }}
                </button>
              </form>
            </div>
          </div>

          
          <template v-else>
            <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('checkout.auth_title') }}</h2>
            
            <p class="text-sm text-gray-500 mb-6">{{ guestCheckoutEnabled ? t('checkout.auth_subtitle') : t('checkout.auth_subtitle_no_guest', 'Connectez-vous ou créez un compte pour finaliser votre commande.') }}</p>
            <form class="space-y-4" @submit.prevent="onLogin">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ emailLabel }}</label>
                <input v-model="loginForm.email" type="email" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="t('auth.placeholder_email')" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('auth.label_password') }}</label>
                <input v-model="loginForm.password" type="password" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <p v-if="loginError" class="text-red-500 text-xs">{{ loginError }}</p>
              <button type="submit" :disabled="authLoading" class="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
                {{ authLoading ? t('auth.login_loading') : t('auth.login_button') }}
              </button>
              <p class="text-xs text-gray-400 text-center">
                {{ t('auth.login_no_account') }} <NuxtLink :to="localePath('/inscription')" class="text-primary-600 hover:underline">{{ t('auth.login_create_account') }}</NuxtLink>
              </p>
            </form>

            
            <div v-if="guestCheckoutEnabled" class="mt-6 pt-6 border-t border-gray-100">
              <p class="text-sm text-gray-500 mb-4">{{ t('checkout.guest_or', 'Ou commandez sans créer de compte') }}</p>
              <form class="space-y-4" @submit.prevent="onGuestContinue">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ emailLabel }}</label>
                  <input v-model="guestForm.email" type="email" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" :placeholder="t('auth.placeholder_email')" />
                </div>
                <p v-if="guestError" class="text-red-500 text-xs">{{ guestError }}</p>
                <button type="submit" :disabled="guestLoading" class="w-full py-3.5 border-2 border-primary-600 text-primary-600 hover:bg-primary-600/5 disabled:opacity-50 font-semibold rounded-xl text-sm transition-colors">
                  {{ guestLoading ? t('checkout.guest_loading', 'Patientez…') : t('checkout.guest_continue', 'Continuer en tant qu\'invité') }}
                </button>
              </form>
            </div>
          </template>
        </div>

        
        <div v-if="pagePaiement" class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-24" data-page="paiement">
          <section class="min-w-0">
            <h1 class="text-3xl sm:text-4xl font-bold uppercase text-gray-900 text-center mb-8">{{ t('checkout.single_title', 'Paiement') }}</h1>

            
            <div class="grid grid-cols-2 gap-4 mb-10" role="tablist">
              <button type="button" role="tab" aria-selected="true" class="flex items-center justify-center gap-2 py-3 rounded-lg border border-gray-900 text-lg text-gray-900" data-onglet="livraison">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                {{ t('checkout.tab_delivery', 'Livraison') }}
              </button>
              <button type="button" role="tab" aria-selected="false" disabled class="flex items-center justify-center gap-2 py-3 rounded-lg border border-gray-300 text-lg text-gray-400 cursor-not-allowed" data-onglet="retrait">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                {{ t('checkout.tab_pickup', 'Retrait') }}
              </button>
            </div>

            
            <form v-if="step === 'address' && (!addresses.length || showNewAddress)" class="space-y-6" data-section="adresse-formulaire" @submit.prevent="onSaveAddress">
              <div>
                <label class="block text-sm text-gray-900 mb-2">{{ emailLabel }}*</label>
                <input :value="checkoutEmail" type="email" readonly class="w-full h-12 px-4 border border-gray-400 rounded-lg text-sm text-gray-500 bg-white" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-gray-900 mb-2">{{ t('checkout.label_firstname') }}*</label>
                  <input v-model="addressForm.firstname" type="text" required autocomplete="given-name" class="w-full h-12 px-4 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-sm text-gray-900 mb-2">{{ t('checkout.label_lastname') }}*</label>
                  <input v-model="addressForm.lastname" type="text" required autocomplete="family-name" class="w-full h-12 px-4 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" />
                </div>
              </div>
              <div>
                <label class="block text-sm text-gray-900 mb-2">{{ t('checkout.label_address_street', 'Adresse (numéro et nom de la rue)') }}*</label>
                <input v-model="addressForm.address1" type="text" required autocomplete="address-line1" class="w-full h-12 px-4 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" />
                <button v-if="!complementOuvert" type="button" class="mt-3 inline-flex items-center gap-2 text-sm text-gray-900 underline" data-action="complement" @click="complementOuvert = true">
                  <span aria-hidden="true" class="text-lg leading-none no-underline">+</span>{{ t('checkout.address_complement_add', 'Ajouter un complément d’adresse') }}
                </button>
                <input v-else v-model="addressForm.address2" type="text" autocomplete="address-line2" :aria-label="t('checkout.address_complement_add', 'Ajouter un complément d’adresse')" class="mt-3 w-full h-12 px-4 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm text-gray-900 mb-2">{{ t('checkout.label_postcode') }}*</label>
                  <input v-model="addressForm.postcode" type="text" required autocomplete="postal-code" class="w-full h-12 px-4 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-sm text-gray-900 mb-2">{{ t('checkout.label_city') }}*</label>
                  <input v-model="addressForm.city" type="text" required autocomplete="address-level2" class="w-full h-12 px-4 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-sm text-gray-900 mb-2">{{ t('checkout.label_country_region', 'Pays/région') }}*</label>
                  <select v-model="addressForm.countryId" required autocomplete="country" class="w-full h-12 px-4 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none bg-white">
                    <option v-if="!countries.length" :value="8">{{ t('checkout.checkout_country_france', 'France') }}</option>
                    <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
              </div>
              <div class="sm:w-1/3">
                <label class="block text-sm text-gray-900 mb-2">{{ t('checkout.label_phone') }}<template v-if="phoneRequired">*</template></label>
                <input v-model="addressForm.phone" type="tel" :required="phoneRequired" autocomplete="tel" class="w-full h-12 px-4 border border-gray-400 rounded-lg text-sm focus:border-gray-900 focus:outline-none" />
              </div>
              <div class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-4">
                <button v-if="addresses.length" type="button" class="text-sm text-gray-900 underline" @click="resetAddressForm">{{ t('checkout.cancel') }}</button>
                <button type="submit" :disabled="loading" class="sm:w-80 h-14 px-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white text-lg rounded-xl transition-colors" data-action="enregistrer-adresse">
                  {{ loading ? t('checkout.saving') : t('checkout.save_and_continue', 'Enregistrer et continuer') }}
                </button>
              </div>
            </form>

            
            <template v-else>
              <div class="space-y-3" data-section="adresse-validee">
                <label
                  v-for="addr in (step === 'address' ? addresses : addresses.filter(a => a.id === selectedAddressId))"
                  :key="addr.id"
                  class="relative block rounded-lg border p-4 pr-28 text-sm text-gray-900 cursor-pointer"
                  :class="selectedAddressId === addr.id ? 'border-gray-900' : 'border-gray-300'"
                  data-carte="adresse"
                >
                  <input v-if="step === 'address' && addresses.length > 1" v-model="selectedAddressId" :value="addr.id" type="radio" name="address" class="sr-only" />
                  <span class="block">{{ addr.company || `${addr.firstname} ${addr.lastname}` }}</span>
                  <span class="block mt-3">{{ checkoutEmail }}</span>
                  <span v-if="addr.phone" class="block mt-3">{{ addr.phone }}</span>
                  <span v-if="countries.find(c => c.id === Number(addr.countryId))" class="block mt-3">{{ countries.find(c => c.id === Number(addr.countryId))?.name }}</span>
                  <span class="block mt-3">{{ addr.address1 }}<template v-if="addr.address2">, {{ addr.address2 }}</template></span>
                  <span class="block mt-3">{{ addr.postcode }} {{ addr.city }}</span>
                  <button type="button" class="absolute top-4 right-4 text-sm font-bold uppercase underline" data-action="modifier-adresse" @click.prevent="onModifierAdresse(addr)">
                    {{ t('checkout.edit', 'Modifier') }}
                  </button>
                </label>
                <button v-if="step === 'address'" type="button" class="text-sm text-gray-900 underline" @click="startNewAddress(false)">{{ t('checkout.address_new') }}</button>
              </div>

              <p v-if="!loggedIn" class="mt-3 text-base text-gray-900" data-fidelite="tunnel">
                {{ t('checkout.loyalty_hint', 'Connectez-vous ou créez votre compte {brand} afin de récupérer vos points de fidélité.').replace('{brand}', _brand) }}
                <button type="button" class="underline" @click="onSeConnecterDepuisPage">{{ t('checkout.split_login_button', 'Se connecter') }}</button>
                {{ t('common.or', 'ou') }}
                <NuxtLink :to="lienInscription" class="underline">{{ t('checkout.split_register_button', 'S’inscrire') }}</NuxtLink>.
              </p>

              
              <div v-if="vatRequired" class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p class="font-semibold">{{ t('checkout.vat_intracom_required', 'Numéro de TVA intracommunautaire requis') }}</p>
                <div class="mt-3 flex gap-2">
                  <input v-model="vatInputDraft" type="text" :placeholder="t('checkout.vat_intracom_placeholder', 'Ex. DE123456789')" class="flex-1 h-11 px-3 border border-amber-200 rounded-lg font-mono" :disabled="vatChecking" />
                  <button type="button" class="px-4 h-11 bg-black text-white rounded-lg disabled:bg-gray-300" :disabled="vatChecking || !vatInputDraft.trim()" @click="onClickValidateVat">
                    {{ vatChecking ? t('checkout.vat_checking', 'Vérification…') : t('checkout.vat_check', 'Vérifier') }}
                  </button>
                </div>
                <p v-if="vatError" class="mt-2 text-xs text-red-600">{{ vatError }}</p>
              </div>

              <div v-if="step === 'address'" class="mt-8 flex justify-end">
                <button type="button" class="w-full sm:w-80 h-14 px-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white text-lg rounded-xl transition-colors" :disabled="loading || !selectedAddressId || vatRequired" data-action="passer-au-paiement" @click="onPasserAuPaiement">
                  {{ t('checkout.go_to_payment', 'Passer au paiement') }}
                </button>
              </div>

              
              <div v-if="step === 'shipping'" class="mt-10" data-section="transporteur">
                <h2 class="text-xl text-gray-900 mb-4">{{ t('checkout.shipping_title') }}</h2>
                <p v-if="!loading && !carriers.length" class="text-sm text-gray-500">{{ t('checkout.shipping_none', 'Aucun mode de livraison n’est disponible pour cette adresse.') }}</p>
                <div class="space-y-3">
                  <label v-for="carrier in carriers" :key="carrier.id" class="flex items-center gap-4 p-4 rounded-lg border cursor-pointer" :class="selectedCarrierId === carrier.id ? 'border-gray-900' : 'border-gray-300'">
                    <input v-model="selectedCarrierId" :value="carrier.id" type="radio" name="carrier" class="accent-black" />
                    <span class="flex-1 text-sm text-gray-900">{{ carrier.name }}<span v-if="carrier.delay" class="block text-gray-500">{{ carrier.delay }}</span></span>
                    <span class="text-sm text-gray-900">{{ carrier.isFree || carrier.priceTTC === 0 ? t('checkout.shipping_free') : formatPrice(carrier.priceTTC) }}</span>
                  </label>
                </div>
                <div class="mt-8 flex justify-end">
                  <button type="button" class="w-full sm:w-80 h-14 px-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white text-lg rounded-xl" :disabled="!selectedCarrierId" @click="goToPayment">
                    {{ t('checkout.go_to_payment', 'Passer au paiement') }}
                  </button>
                </div>
              </div>
            </template>

            
            <div class="mt-10 border-t border-gray-300 pt-8" data-section="paiement">
              <h2 class="text-2xl" :class="step === 'payment' ? 'text-gray-900' : 'text-gray-400'">{{ t('checkout.payment_section', 'Paiement') }}</h2>
              <template v-if="step === 'payment'">
                <p class="mt-1 text-sm text-gray-900">{{ t('checkout.payment_select', 'Sélectionnez un mode de paiement') }}</p>
                <div class="mt-6 space-y-4">
                  <label v-if="enabledPayments.bankwire" class="flex items-center gap-4 cursor-pointer" data-moyen="bankwire">
                    <input v-model="paymentMethod" value="bankwire" type="radio" name="payment" class="w-5 h-5 accent-black" />
                    <span class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900">{{ t('checkout.bankwire_title') }}</span>
                  </label>
                  <label v-if="enabledPayments.systempay" class="flex items-center gap-4 cursor-pointer" data-moyen="systempay">
                    <input v-model="paymentMethod" value="systempay" type="radio" name="payment" class="w-5 h-5 accent-black" />
                    <span class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900">{{ t('checkout.systempay_title') }}</span>
                  </label>
                  <label v-if="enabledPayments.payplug" class="flex items-center gap-4 cursor-pointer" data-moyen="payplug">
                    <input v-model="paymentMethod" value="payplug" type="radio" name="payment" class="w-5 h-5 accent-black" />
                    <span class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900">{{ t('checkout.pay_card_payplug', 'Carte bancaire (PayPlug)') }}</span>
                  </label>
                  <label v-if="enabledPayments.stripe" class="flex items-center gap-4 cursor-pointer" data-moyen="stripe">
                    <input v-model="paymentMethod" value="stripe" type="radio" name="payment" class="w-5 h-5 accent-black" />
                    <span class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900">{{ t('checkout.pay_card_stripe', 'Carte bancaire') }}</span>
                  </label>
                  <label v-if="enabledPayments.paypal" class="flex items-center gap-4 cursor-pointer" data-moyen="paypal">
                    <input v-model="paymentMethod" value="paypal" type="radio" name="payment" class="w-5 h-5 accent-black" />
                    <span class="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900">{{ t('checkout.pay_paypal', 'PayPal') }}</span>
                  </label>
                  <label v-if="enabledPayments.klarna && finalTotalTTC >= enabledPayments.klarnaMinAmount" class="flex items-start gap-4 cursor-pointer" data-moyen="klarna">
                    <input v-model="paymentMethod" value="klarna" type="radio" name="payment" class="mt-2 w-5 h-5 accent-black" />
                    <span>
                      <span class="inline-block px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900">{{ t('checkout.pay_klarna', 'Payer en 3 ou 4 fois') }}</span>
                      <span class="block mt-1 text-[11px] text-gray-500 leading-snug">{{ t('checkout.klarna_notice', 'Paiement fractionné proposé par Klarna. Un crédit vous engage et doit être remboursé.') }}</span>
                    </span>
                  </label>
                </div>

                <div v-if="underMinimum" class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                  <strong>{{ t('checkout.minimum_not_reached_title', 'Minimum de commande non atteint') }}</strong>
                  <p class="mt-1">{{ minimumMessage }}</p>
                </div>

                <label v-if="documentsLegaux.length" class="mt-8 flex items-start gap-4 text-sm text-gray-900 cursor-pointer" data-cgv="case">
                  <input v-model="cgvCochee" type="checkbox" class="mt-1 w-4 h-4 accent-black shrink-0" />
                  <span>
                    {{ t('checkout.terms_accept', 'En cochant cette case, j’affirme avoir lu et approuvé') }}
                    <template v-for="(doc, i) in documentsLegaux" :key="doc.href">{{ separateurAvant(i, documentsLegaux.length, t('common.and', 'et')) }}<a v-if="doc.external" :href="doc.href" target="_blank" rel="noopener noreferrer" class="underline">{{ doc.label }}</a><NuxtLink v-else :to="localePath(doc.href)" target="_blank" class="underline">{{ doc.label }}</NuxtLink></template>.
                  </span>
                </label>

                <button type="button" class="mt-8 w-full sm:w-96 h-14 px-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg rounded-xl transition-colors" :disabled="!commandeActive" data-action="commander" @click="onPlaceOrder">
                  {{ loading ? t('checkout.placing_order') : t('checkout.place_order_short', 'Commander avec obligation de paiement') }}
                </button>
              </template>
            </div>
          </section>

          <CheckoutSummaryAside
            :lignes="items"
            :recap="recap"
            :totalTTC="totalAPayerTTC(recap, shippingPriceTTC)"
            :livraisonTTC="selectedCarrier ? shippingPriceTTC : null"
            :delai="selectedCarrier?.delay || ''"
            :lienPanier="localePath('/panier')"
          />
        </div>

        
        <div v-if="step === 'address' && !pagePaiement" class="bg-white rounded-2xl p-8 shadow-sm">
          <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('checkout.address_title') }}</h2>

          
          <div v-if="addresses.length && !showNewAddress" class="space-y-3 mb-6">
            <label
              v-for="addr in addresses"
              :key="addr.id"
              class="flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="selectedAddressId === addr.id ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="selectedAddressId" :value="addr.id" type="radio" name="address" class="accent-primary-600 mt-1" />
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900">{{ addr.company || `${addr.firstname} ${addr.lastname}` }}</p>
                <p class="text-xs text-gray-500">{{ addr.address1 }}<span v-if="addr.address2">, {{ addr.address2 }}</span></p>
                <p class="text-xs text-gray-500">{{ addr.postcode }} {{ addr.city }}</p>
                <p v-if="addr.phone" class="text-xs text-gray-400">{{ addr.phone }}</p>
              </div>
              <div class="flex flex-col gap-1 shrink-0">
                <button type="button" @click.prevent="startEditAddress(addr)" class="text-[10px] text-gray-400 hover:text-primary-600 transition-colors" :title="t('common.common_edit', 'Modifier')">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" /></svg>
                </button>
                <button type="button" @click.prevent="onDeleteAddress(addr.id!)" class="text-[10px] text-gray-400 hover:text-red-500 transition-colors" :title="t('common.common_delete', 'Supprimer')">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              </div>
            </label>
            <button class="text-sm text-primary-600 hover:underline" @click="startNewAddress(false)">{{ t('checkout.address_new') }}</button>
          </div>

          
          <div v-if="addresses.length && !showNewAddress" class="border-t border-gray-100 pt-5 mt-5">
            <label class="flex items-center gap-3 cursor-pointer">
              <input v-model="useDifferentInvoiceAddress" type="checkbox" class="accent-primary-600" />
              <span class="text-sm font-medium text-gray-800">{{ t('checkout.invoice_address_different_toggle', 'Utiliser une adresse de facturation différente') }}</span>
            </label>
            <p class="text-xs text-gray-500 mt-1 ml-7">{{ t('checkout.invoice_address_different_hint', 'Cochez si vous souhaitez recevoir la facture à une adresse différente de la livraison.') }}</p>
            <div v-if="useDifferentInvoiceAddress" class="space-y-2 mt-4">
              <label
                v-for="addr in addresses"
                :key="`inv-${addr.id}`"
                class="flex items-start gap-4 p-3 border rounded-xl cursor-pointer transition-colors"
                :class="selectedInvoiceAddressId === addr.id ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
              >
                <input v-model="selectedInvoiceAddressId" :value="addr.id" type="radio" name="invoice-address" class="accent-primary-600 mt-1" />
                <div class="flex-1">
                  <p class="text-xs font-semibold text-gray-900">{{ addr.company || `${addr.firstname} ${addr.lastname}` }}</p>
                  <p class="text-[11px] text-gray-500">{{ addr.address1 }}, {{ addr.postcode }} {{ addr.city }}</p>
                </div>
              </label>
              <button type="button" class="text-sm text-primary-600 hover:underline mt-2" @click="startNewAddress(true)">
                + {{ t('checkout.invoice_address_new', 'Nouvelle adresse de facturation') }}
              </button>
            </div>
          </div>

          
          <form v-if="!addresses.length || showNewAddress" class="space-y-4" @submit.prevent="onSaveAddress">
            <div v-if="creatingForBilling" class="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 text-sm text-primary-800">
              🧾 {{ t('checkout.invoice_address_new_hint', 'Cette adresse sera utilisée comme adresse de facturation. L\'adresse de livraison reste celle déjà sélectionnée.') }}
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_company') }}</label>
              <input v-model="addressForm.company" type="text" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_firstname') }} *</label>
                <input v-model="addressForm.firstname" type="text" required :placeholder="customer?.firstname" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_lastname') }} *</label>
                <input v-model="addressForm.lastname" type="text" required :placeholder="customer?.lastname" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_address') }} *</label>
              <input v-model="addressForm.address1" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_postcode') }} *</label>
                <input v-model="addressForm.postcode" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_city') }} *</label>
                <input v-model="addressForm.city" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_country') }} *</label>
              <select v-model="addressForm.countryId" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none bg-white">
                <option v-if="!countries.length" :value="8">{{ t('checkout.checkout_country_france', 'France') }}</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('checkout.label_phone') }}<template v-if="phoneRequired"> *</template></label>
              <input v-model="addressForm.phone" type="tel" :required="phoneRequired" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div class="flex gap-3">
              <button v-if="addresses.length" type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="resetAddressForm">{{ t('checkout.cancel') }}</button>
              <button type="submit" :disabled="loading" class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
                {{ loading ? t('checkout.saving') : editingAddressId ? t('checkout.edit_address') : t('checkout.save_address') }}
              </button>
            </div>
          </form>

          
          <div v-if="vatRequired && !showNewAddress" class="border-t border-amber-100 pt-5 mt-5">
            <label class="flex items-center gap-2 mb-2">
              <span class="text-sm font-semibold text-amber-900">
                {{ t('checkout.vat_intracom_required', 'Numéro de TVA intracommunautaire requis') }}
              </span>
              <span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">B2B UE</span>
            </label>
            <p class="text-xs text-amber-700 mb-3">
              {{ t('checkout.vat_intracom_hint', 'Votre adresse de livraison est dans un pays de l\'Union européenne hors France. Pour bénéficier de l\'autoliquidation (vente HT, art. 262 ter I CGI), saisissez votre numéro de TVA intracommunautaire — il sera vérifié auprès du registre VIES de la Commission européenne.') }}
            </p>
            <div class="flex gap-2">
              <input
                v-model="vatInputDraft"
                type="text"
                :placeholder="t('checkout.vat_intracom_placeholder', 'Ex. DE123456789')"
                class="flex-1 px-4 py-3 border border-amber-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none font-mono"
                :disabled="vatChecking"
              />
              <button
                type="button"
                class="px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold rounded-xl text-sm transition-colors"
                :disabled="vatChecking || !vatInputDraft.trim()"
                @click="onClickValidateVat"
              >
                {{ vatChecking ? t('checkout.vat_checking', 'Vérification…') : t('checkout.vat_check', 'Vérifier') }}
              </button>
            </div>
            <p v-if="vatError" class="text-xs text-red-600 mt-2">{{ vatError }}</p>
            <p v-if="vatValid && vatCompany.name" class="text-xs text-emerald-700 mt-2">
              ✓ {{ t('checkout.vat_valid_for', 'Numéro validé pour') }} <strong>{{ vatCompany.name }}</strong>{{ vatCompany.address ? ' — ' + vatCompany.address : '' }}
            </p>
          </div>

          <div v-if="addresses.length && !showNewAddress" class="flex gap-3 mt-6">
            <button type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="goToStep('auth')">{{ t('checkout.back') }}</button>
            <button
              class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:bg-gray-300"
              :disabled="!selectedAddressId || vatRequired"
              @click="goToShipping"
            >
              {{ t('checkout.continue') }}
            </button>
          </div>
        </div>

        
        <div v-if="step === 'shipping' && !pagePaiement" class="bg-white rounded-2xl p-8 shadow-sm">
          <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('checkout.shipping_title') }}</h2>

          <div v-if="loading" class="text-center py-8 text-gray-400 text-sm">{{ t('checkout.shipping_loading') }}</div>

          <div v-else class="space-y-3 mb-6">
            <label
              v-for="carrier in carriers"
              :key="carrier.id"
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="selectedCarrierId === carrier.id ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="selectedCarrierId" :value="carrier.id" type="radio" name="carrier" class="accent-primary-600" />
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900">{{ carrier.name }}</p>
                <p class="text-xs text-gray-500">{{ carrier.delay }}</p>
              </div>
              <div class="text-right">
                <template v-if="carrier.isFree || carrier.price === 0">
                  <span class="text-sm font-bold text-primary-600">{{ t('checkout.shipping_free') }}</span>
                </template>
                <template v-else>
                  <p class="text-sm font-bold text-primary-600">{{ formatPrice(carrier.price) }} HT</p>
                  <p v-if="carrier.priceTTC && carrier.priceTTC !== carrier.price" class="text-xs text-gray-500 mt-0.5">{{ formatPrice(carrier.priceTTC) }} TTC</p>
                </template>
              </div>
            </label>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              {{ t('checkout.delivery_comment_label', 'Commentaire pour la livraison') }}
              <span class="text-xs font-normal text-gray-400 ml-1">({{ t('checkout.delivery_comment_optional', 'facultatif') }})</span>
            </label>
            <textarea
              v-model="deliveryComment"
              rows="3"
              maxlength="2000"
              :placeholder="t('checkout.delivery_comment_placeholder', 'Horaires de retrait, accès dépôt, numéro de quai, instructions chauffeur…')"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-600 focus:outline-none resize-none"
            ></textarea>
            <p v-if="deliveryComment.length > 0" class="text-xs text-gray-400 mt-1 text-right">{{ deliveryComment.length }} / 2000</p>
          </div>

          <div class="flex gap-3">
            <button type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="goToStep('address')">{{ t('checkout.back') }}</button>
            <button
              class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:bg-gray-300"
              :disabled="!selectedCarrierId"
              @click="goToPayment"
            >
              {{ t('checkout.continue_payment') }}
            </button>
          </div>
        </div>

        
        <div v-if="step === 'payment' && !pagePaiement" class="bg-white rounded-2xl p-8 shadow-sm">
          <h2 class="text-xl font-bold text-gray-900 mb-6">{{ t('checkout.payment_title') }}</h2>

          
          <div class="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ t('checkout.summary') }}</h3>

            <table class="w-full text-xs text-gray-600">
              <thead>
                <tr class="text-left text-gray-400 uppercase tracking-wide text-[10px]">
                  <th class="font-medium pb-2 pr-2">{{ t('checkout.checkout_table_product', 'Produit') }}</th>
                  <th class="font-medium pb-2 pr-2 hidden sm:table-cell">{{ t('checkout.checkout_table_ref', 'Réf.') }}</th>
                  <th class="font-medium pb-2 pr-2 text-center">{{ t('checkout.checkout_table_qty', 'Qté') }}</th>
                  
                  <th v-if="!recapTTC" class="font-medium pb-2 pr-2 text-right hidden sm:table-cell">{{ t('checkout.checkout_table_unit_price', 'Prix unitaire') }}</th>
                  <th v-if="recapTTC" class="font-medium pb-2 text-right">{{ t('checkout.checkout_table_total', 'Total') }}</th>
                  <th v-else class="font-medium pb-2 text-right">{{ t('checkout.checkout_table_total_ht', 'Total HT') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in items" :key="item.id" class="border-t border-gray-200/60">
                  <td class="py-2 pr-2">{{ item.name }}</td>
                  <td class="py-2 pr-2 text-gray-400 hidden sm:table-cell">{{ item.ref || '—' }}</td>
                  <td class="py-2 pr-2 text-center">{{ item.quantity }}</td>
                  <td v-if="!recapTTC" class="py-2 pr-2 text-right text-gray-500 hidden sm:table-cell">
                    <template v-if="item.pricePerKgFormatted">{{ item.pricePerKgFormatted }} {{ item.unitLabel || 'HT/K' }}</template>
                    <template v-else>{{ formatPrice(item.priceRaw) }} HT</template>
                  </td>
                  <td v-if="recapTTC" class="py-2 text-right" data-montant="ligne">{{ formatPrice(totalLigneTTC(item, lignesTTC)) }}</td>
                  <td v-else class="py-2 text-right">{{ formatPrice(item.priceRaw * item.quantity) }}</td>
                </tr>
              </tbody>
            </table>

            
            <CartFirstOrderBanner v-if="encarts['first-order']" class="mt-3" />

            
            <div v-if="encarts['promo'] || discountCode" class="border-t border-gray-200 mt-3 pt-3">
              <div v-if="discountCode" class="flex items-center justify-between text-xs">
                <span class="text-gray-700">Code promo : <strong>{{ discountCode }}</strong></span>
                <button class="text-[10px] text-gray-400 hover:text-red-500" :disabled="promoLoading" @click="onRemovePromo">{{ t('checkout.checkout_promo_remove', 'Retirer') }}</button>
              </div>
              <form v-else-if="encarts['promo']" class="flex gap-2" @submit.prevent="onApplyPromo">
                <input
                  v-model="promoInput"
                  type="text"
                  :placeholder="t('checkout.checkout_promo_placeholder', 'Code promo')"
                  class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:border-primary-600 focus:outline-none"
                />
                <button
                  type="submit"
                  :disabled="promoLoading || !promoInput.trim()"
                  class="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg transition-colors"
                >{{ promoLoading ? t('checkout.checkout_promo_loading', '…') : t('checkout.checkout_promo_apply', 'Appliquer') }}</button>
              </form>
              
              <p v-if="promoError || promoAttenteErreur" class="text-[10px] text-red-500 mt-1">{{ promoError || promoAttenteErreur }}</p>
            </div>

            
            <div v-if="appliedCorseTva" class="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs">
              <p class="font-semibold text-blue-900">TVA Corse appliquée — 2,1 %</p>
              <p class="text-[11px] text-blue-800 mt-0.5 leading-snug">
                Votre adresse en Corse bénéficie automatiquement du taux de TVA réduit applicable aux produits alimentaires.
              </p>
            </div>

            
            <div v-if="recapTTC" class="border-t border-gray-200 mt-3 pt-3 space-y-1" data-recap="ttc">
              <div class="flex justify-between text-xs text-gray-700">
                <span>{{ t('cart.cart_subtotal', 'Sous-total') }}</span>
                <span data-montant="sous-total">{{ formatPrice(recap.sousTotalTTC) }}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-700">
                <span>{{ t('cart.cart_shipping') }}</span>
                <span v-if="shippingPriceTTC === 0">{{ t('checkout.shipping_free') }}</span>
                <span v-else data-montant="livraison">{{ formatPrice(shippingPriceTTC) }}</span>
              </div>
              <div v-if="recap.remiseTTC > 0" class="flex justify-between text-xs text-gray-700">
                <span>{{ t('cart.summary_discount', 'Code promo') }}</span>
                <span data-montant="remise">−{{ formatPrice(recap.remiseTTC) }}</span>
              </div>
              <div class="flex justify-between text-sm font-bold text-gray-900 pt-1">
                <span class="uppercase">{{ t('checkout.total_ttc') }}</span>
                <span class="text-primary-600" data-montant="total-ttc">{{ formatPrice(finalTotalTTC) }}</span>
              </div>
            </div>
            <div v-else class="border-t border-gray-200 mt-3 pt-3 space-y-1">
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ t('checkout.subtotal_ht') }}</span>
                <span>{{ subtotalFormatted }}</span>
              </div>
              <div v-if="discountCode && discountHT > 0" class="flex justify-between text-xs text-emerald-700">
                <span>{{ t('checkout.checkout_discount_label', 'Remise « {code} »').replace('{code}', discountCode) }}</span>
                <span>− {{ formatPrice(discountHT) }}</span>
              </div>
              <div v-if="discountCode && discountHT > 0" class="flex justify-between text-xs text-gray-500">
                <span>Total HT</span>
                <span>{{ totalFormatted }}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ t('checkout.vat') }}</span>
                <span>{{ formatPrice((totalTTC - totalHT) + (shippingPriceTTC - shippingPrice)) }}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-500">
                <span>Livraison<span v-if="selectedCarrier"> — {{ selectedCarrier.name }}</span></span>
                <span v-if="shippingPrice === 0">{{ t('checkout.shipping_free') }}</span>
                <span v-else>{{ formatPrice(shippingPrice) }} HT<template v-if="shippingPriceTTC !== shippingPrice"> · {{ formatPrice(shippingPriceTTC) }} TTC</template></span>
              </div>
              <div class="flex justify-between text-sm font-bold text-gray-900 pt-1">
                <span>{{ t('checkout.total_ttc') }}</span>
                <span class="text-primary-600">{{ formatPrice(finalTotalTTC) }}</span>
              </div>
            </div>
          </div>

          
          <div class="space-y-3 mb-6">
            <label
              v-if="enabledPayments.bankwire"
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="paymentMethod === 'bankwire' ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="paymentMethod" value="bankwire" type="radio" name="payment" class="accent-primary-600" />
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ t('checkout.bankwire_title') }}</p>
                <p class="text-xs text-gray-500">{{ t('checkout.bankwire_desc') }}</p>
              </div>
            </label>
            <label
              v-if="enabledPayments.systempay"
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="paymentMethod === 'systempay' ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="paymentMethod" value="systempay" type="radio" name="payment" class="accent-primary-600" />
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ t('checkout.systempay_title') }}</p>
                <p class="text-xs text-gray-500">{{ t('checkout.systempay_desc') }}</p>
              </div>
            </label>
            <label
              v-if="enabledPayments.payplug"
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="paymentMethod === 'payplug' ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="paymentMethod" value="payplug" type="radio" name="payment" class="accent-primary-600" />
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ t('checkout.pay_card_payplug', 'Carte bancaire') }}</p>
                <p class="text-xs text-gray-500">{{ t('checkout.pay_card_payplug_desc', 'Paiement sécurisé par carte bancaire (PayPlug / Groupe BPCE)') }}</p>
              </div>
            </label>
            <label
              v-if="enabledPayments.stripe"
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="paymentMethod === 'stripe' ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="paymentMethod" value="stripe" type="radio" name="payment" class="accent-primary-600" />
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ t('checkout.pay_card_stripe', 'Carte bancaire') }}</p>
                <p class="text-xs text-gray-500">{{ t('checkout.pay_card_stripe_desc', 'Paiement sécurisé par carte (Visa, Mastercard, American Express)') }}</p>
              </div>
            </label>
            <label
              v-if="enabledPayments.paypal"
              class="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="paymentMethod === 'paypal' ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="paymentMethod" value="paypal" type="radio" name="payment" class="accent-primary-600" />
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ t('checkout.pay_paypal', 'PayPal') }}</p>
                <p class="text-xs text-gray-500">{{ t('checkout.pay_paypal_desc', 'Vous serez redirigé vers PayPal pour régler en toute sécurité') }}</p>
              </div>
            </label>
            <label
              v-if="enabledPayments.klarna && finalTotalTTC >= enabledPayments.klarnaMinAmount"
              class="flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors"
              :class="paymentMethod === 'klarna' ? 'border-primary-600 bg-primary-600/5' : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="paymentMethod" value="klarna" type="radio" name="payment" class="accent-primary-600 mt-1" />
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ t('checkout.pay_klarna', 'Payer en 3 ou 4 fois') }}</p>
                <p class="text-xs text-gray-500">{{ t('checkout.pay_klarna_desc', 'Étalez votre paiement sans frais supplémentaires') }}</p>
                <p class="text-[11px] text-gray-400 mt-1 leading-snug">{{ t('checkout.klarna_notice', 'Paiement fractionné proposé par Klarna. Un crédit vous engage et doit être remboursé.') }}</p>
              </div>
            </label>
          </div>

          <label v-if="conditions.required && conditions.slug" class="my-6 flex items-start gap-3 text-sm text-gray-700 cursor-pointer" data-cgv="historique">
            <input v-model="conditionsAcceptees" type="checkbox" class="mt-0.5 w-4 h-4 accent-primary-600 shrink-0" />
            <span>
              {{ t('checkout.terms_accept', 'En cochant cette case, j’affirme avoir lu et approuvé') }}
              <NuxtLink :to="localePath('/' + conditions.slug)" target="_blank" class="text-primary-600 underline hover:text-primary-700">{{ t('checkout.terms_link', 'les conditions générales de vente') }}</NuxtLink>.
            </span>
          </label>

          
          <div
            v-if="underMinimum"
            class="my-6 p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900"
          >
            <strong>{{ t('checkout.minimum_not_reached_title', 'Minimum de commande non atteint') }}</strong>
            <p class="mt-1">
              {{ minimumMessage }}
            </p>
          </div>

          <div class="flex gap-3">
            <button type="button" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm" @click="goToStep('shipping')">{{ t('checkout.back') }}</button>
            <button
              class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              :disabled="loading || underMinimum || conditionsManquantes"
              @click="onPlaceOrder"
            >
              {{ loading ? t('checkout.placing_order') : t('checkout.confirm_order') }}
            </button>
          </div>
        </div>

        
        <div v-if="step === 'confirmation' && createdOrder" class="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div class="w-16 h-16 bg-primary-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          
          <CheckoutAvisGoogleOptin v-if="!PAIEMENT_CHEZ_PRESTATAIRE.has(paymentMethod)" :order-id="createdOrder.id" :reference="createdOrder.reference" />
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ t('checkout.confirmed_title') }}</h2>
          <p class="text-sm text-gray-500 mb-6">
            Votre commande <strong class="text-gray-900">#{{ createdOrder.reference }}</strong> a été enregistrée.
          </p>

          <div class="bg-gray-50 rounded-xl p-4 text-left mb-6 max-w-md mx-auto">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">{{ t('checkout.label_reference') }}</span>
                <span class="font-semibold">#{{ createdOrder.reference }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">{{ t('checkout.label_status') }}</span>
                <span class="font-semibold text-orange-600">{{ createdOrder.status }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">{{ t('checkout.label_payment') }}</span>
                <span class="font-semibold">{{ createdOrder.payment }}</span>
              </div>
              
              <div v-if="!recapTTC" class="flex justify-between border-t border-gray-200 pt-2">
                <span class="text-gray-500">{{ t('checkout.subtotal_ht') }}</span>
                <span class="font-bold text-primary-600">{{ formatPrice(createdOrder.totalPaidHT) }}</span>
              </div>
              <div class="flex justify-between" :class="recapTTC ? 'border-t border-gray-200 pt-2' : ''">
                <span class="text-gray-500">{{ t('checkout.total_ttc') }}</span>
                <span class="font-bold text-primary-600" data-montant="confirmation-ttc">{{ formatPrice(createdOrder.totalPaidTTC) }}</span>
              </div>
            </div>
          </div>

          <div v-if="paymentMethod === 'bankwire'" class="bg-blue-50 rounded-xl p-4 text-left mb-6 max-w-md mx-auto text-sm text-blue-800">
            <p class="font-semibold mb-2">{{ t('checkout.bankwire_instructions_title') }}</p>
            <p class="mb-3">{{ t('checkout.bankwire_instructions_body').replace('%s', createdOrder.reference) }}</p>

            
            <div v-if="bankwireDetails && (bankwireDetails.details || bankwireDetails.owner)" class="bg-white border border-blue-200 rounded-lg p-3 my-3 text-xs space-y-1.5 font-mono">
              <div v-if="bankwireDetails.owner" class="flex flex-col">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_owner', 'Bénéficiaire') }}</span>
                <span class="text-blue-900 font-semibold">{{ bankwireDetails.owner }}</span>
              </div>
              <div v-if="bankwireDetails.details" class="flex flex-col">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_details', 'Coordonnées') }}</span>
                <span class="text-blue-900 whitespace-pre-line">{{ bankwireDetails.details }}</span>
              </div>
              <div v-if="bankwireDetails.address" class="flex flex-col">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_address', 'Adresse banque') }}</span>
                <span class="text-blue-900 whitespace-pre-line">{{ bankwireDetails.address }}</span>
              </div>
              <div class="flex flex-col pt-2 border-t border-blue-100">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_reference', 'Référence à indiquer') }}</span>
                <span class="text-blue-900 font-bold">#{{ createdOrder.reference }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] text-blue-500 uppercase tracking-wide">{{ t('checkout.checkout_bankwire_label_amount', 'Montant') }}</span>
                <span class="text-blue-900 font-bold">{{ formatPrice(createdOrder.totalPaidTTC) }}</span>
              </div>
            </div>

            <p class="mt-1 text-xs text-blue-600">{{ t('checkout.bankwire_instructions_note') }}</p>
          </div>

          <div class="flex gap-3 justify-center">
            <NuxtLink to="/" class="px-6 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50">
              {{ t('checkout.back_to_shop') }}
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>
  </NuxtLayout>
</template>
