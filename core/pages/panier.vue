
<script setup lang="ts">
import { phasePanier } from '~/utils/cart-render-phase'
import { inviteFideliteVisible } from '~/utils/cart-loyalty-prompt'
import { sourceComplement, sourceRecommandations } from '~/utils/cart-recommendations'
import { ligneDetaillee } from '~/utils/cart-line-layout'
import { recapTTCActif, recapPanier, ligneEnTTC } from '~/utils/cart-totals'
import { classesCtaActif } from '~/utils/cart-checkout-cta'
import { gabaritDuTunnel, sectionsDeContenu, type LigneGabarit } from '~/utils/gabarit-tunnel'
import { itemsAideVisibles } from '~/utils/cart-help'

definePageMeta({ layout: false })
const { localePath } = useLocalePath()

const { data: encartsLignes } = await useFetch<{ sections?: (LigneGabarit & { payload?: any })[] }>('/api/page-sections', {
  
  
  
  
  
  
  query: { parent_type: 'cart', parent_id: 0, all: 1 },
  key: 'gabarit-panier',
  default: () => ({ sections: [] }),
})
const encarts = computed(() => gabaritDuTunnel('cart', encartsLignes.value?.sections ?? []))

const sectionsContenu = computed(() => sectionsDeContenu('cart', encartsLignes.value?.sections ?? []))

const aideSection = computed(() => (encartsLignes.value?.sections ?? []).find((s) => s.type === 'cart-help' && s.active !== false && s.active !== 0))

const { registerContext, clearContext } = useEditorContext()
onMounted(() => registerContext('cart'))
onUnmounted(() => clearContext())

const _cfg = useRuntimeConfig()
const _clientId = String((_cfg.public as any).clientId ?? '')
const _brand = String((_cfg.public as any).brandName ?? '')

const { items, updateQuantity, removeFromCart, totalHT, totalTTC, subtotalTTC, totalFormatted, totalTTCFormatted, subtotalHT, subtotalFormatted, totalItems, cartLoading, cartHydrated, discountCode, discountHT, applyPromoCode, promoEnAttente, isServerMode, initServerCart, loadCartById, appliedCorseTva } = useServerCart(_clientId)

const phase = computed(() => phasePanier(cartHydrated.value, cartLoading.value, items.value.length))

const inviteFidelite = computed(() => inviteFideliteVisible(_cfg.public as Record<string, any>, loggedIn.value))

const recoSource = computed(() => sourceRecommandations(_cfg.public as Record<string, any>))

const recoFill = computed(() => sourceComplement(_cfg.public as Record<string, any>))

const ligneDet = computed(() => ligneDetaillee(_cfg.public as Record<string, any>))

const carteArticles = computed(() => (_cfg.public as Record<string, any>).cartItemsCard === true)

const ctaClasses = computed(() => classesCtaActif(_cfg.public as Record<string, any>))

const recapTTC = computed(() => recapTTCActif(_cfg.public as Record<string, any>, isB2b.value))
const recap = computed(() => recapPanier({
  serveur: isServerMode.value
    ? { subtotalTTC: subtotalTTC.value, totalTTC: totalTTC.value, totalHT: totalHT.value }
    : null,
  lignes: items.value,
  
  lignesTTC: !isB2b.value,
  remiseAttente: promoEnAttente.value,
}))

const totalHTSeuils = computed(() => (recapTTC.value ? recap.value.totalHT : totalHT.value))
const { t } = useHubT()
const { loggedIn, customer, checkSession } = useCustomerAuth()
const aideItems = computed(() => itemsAideVisibles(aideSection.value?.payload?.items, loggedIn.value))

const route = useRoute()
const router = useRouter()
const recoverCartId = computed(() => {
  const n = Number(route.query.recover)
  return Number.isFinite(n) && n > 0 ? n : null
})
const cartToken = computed(() => {
  const t = String(route.query.cart_token || '').trim()
  return /^[a-f0-9]{32,64}$/i.test(t) ? t : null
})

async function bootstrapCart() {
  if (!loggedIn.value || !customer.value) return
  if (recoverCartId.value) {
    await loadCartById(recoverCartId.value, customer.value.customerId)
  } else if (magicCartId.value) {
    await loadCartById(magicCartId.value, customer.value.customerId)
  } else if (!isServerMode.value) {
    await initServerCart(customer.value.customerId)
  }
}

const magicCartId   = ref<number | null>(null)
interface MagicPreview {
  firstname: string; lastname: string; email: string; phone: string
  company: string; siret: string
  isNewAccount: boolean; itemsCount: number
}
const magicPreview  = ref<null | MagicPreview>(null)
const magicPassword = ref('')
const magicLoading  = ref(false)
const magicError    = ref<string | null>(null)

async function bootstrapMagicLink() {
  if (!cartToken.value) return
  try {
    const r = await $fetch<any>('/api/cart-token/preview', { query: { token: cartToken.value } })
    magicPreview.value = {
      firstname:    r.firstname || '',
      lastname:     r.lastname  || '',
      email:        r.email     || '',
      phone:        r.phone     || '',
      company:      r.company   || '',
      siret:        r.siret     || '',
      isNewAccount: !!r.isNewAccount,
      itemsCount:   Number(r.itemsCount || 0),
    }
    magicCartId.value = Number(r.cartId || 0) || null
  } catch (err: any) {
    magicError.value = err?.data?.statusMessage || err?.message || 'Lien invalide ou expiré'
  }
}

async function onMagicLogin() {
  if (!cartToken.value || magicLoading.value) return
  magicLoading.value = true
  magicError.value = null
  try {
    const r = await $fetch<any>('/api/cart-token/login', {
      method: 'POST',
      body:   { token: cartToken.value, password: magicPassword.value },
    })
    if (r?.success) {
      
      await checkSession()
      magicPreview.value = null
      magicPassword.value = ''
      router.replace({ query: {} })
      
    }
  } catch (err: any) {
    magicError.value = err?.data?.statusMessage || err?.message || 'Connexion impossible'
  } finally {
    magicLoading.value = false
  }
}

onMounted(async () => {
  await checkSession()
  if (!loggedIn.value && recoverCartId.value) {
    
    const next = `/panier?recover=${recoverCartId.value}`
    router.push(`/connexion?next=${encodeURIComponent(next)}`)
    return
  }
  if (cartToken.value) {
    await bootstrapMagicLink()
  }
  await bootstrapCart()
})
watch(loggedIn, async (v) => {
  if (v && customer.value) await bootstrapCart()
})

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
    promoError.value = err?.data?.message || err?.message || t('cart.cart_promo_invalid')
  } finally {
    promoLoading.value = false
  }
}

const { data: salesPolicy } = await useFetch<{ purchaseMinimumHt: number; freeFromHt: number }>('/api/catalogue/sales-policy', {
  default: () => ({ purchaseMinimumHt: 0, freeFromHt: 0 }),
})
const purchaseMinimumHt   = computed(() => Number(salesPolicy.value?.purchaseMinimumHt || 0))
const freeShippingThreshold = computed(() => Number(salesPolicy.value?.freeFromHt || 0))
const freeShipping          = computed(() => freeShippingThreshold.value > 0 && totalHTSeuils.value >= freeShippingThreshold.value)
const underMinimum = computed(() => purchaseMinimumHt.value > 0 && totalHTSeuils.value < purchaseMinimumHt.value)
const minDelta = computed(() => Math.max(0, purchaseMinimumHt.value - totalHTSeuils.value))

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const { isB2b } = useB2bVisibility()

useListingBodyId('cart')

useHead({ title: _brand ? `${t('cart.head_title', 'Panier')} — ${_brand}` : t('cart.head_title', 'Panier') })
</script>

<template>
  
  <NuxtLayout name="checkout" prefooter>
    <div class="min-h-screen bg-white">

      
      <div
        v-if="magicPreview && !loggedIn"
        class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 my-4">
          <div>
            <h2 class="text-lg font-bold text-gray-900">
              Bonjour {{ magicPreview.firstname || '' }} 👋
            </h2>
            <p class="text-xs text-gray-500 mt-1">
              <template v-if="magicPreview.isNewAccount">
                Voici vos informations issues de votre demande de devis.
                <span class="block mt-0.5">Choisissez un mot de passe pour activer votre compte et accéder au panier.</span>
              </template>
              <template v-else>
                Vous avez déjà un compte. Indiquez votre mot de passe pour vous connecter.
              </template>
            </p>
          </div>

          
          <div class="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="block text-[10px] uppercase tracking-wider text-gray-400">Prénom</span>
                <span class="block text-gray-800">{{ magicPreview.firstname || '—' }}</span>
              </div>
              <div>
                <span class="block text-[10px] uppercase tracking-wider text-gray-400">Nom</span>
                <span class="block text-gray-800">{{ magicPreview.lastname || '—' }}</span>
              </div>
            </div>
            <div>
              <span class="block text-[10px] uppercase tracking-wider text-gray-400">Email</span>
              <span class="block text-gray-800">{{ magicPreview.email }}</span>
            </div>
            <div v-if="magicPreview.phone">
              <span class="block text-[10px] uppercase tracking-wider text-gray-400">Téléphone</span>
              <span class="block text-gray-800">{{ magicPreview.phone }}</span>
            </div>
            <div v-if="magicPreview.company">
              <span class="block text-[10px] uppercase tracking-wider text-gray-400">Société</span>
              <span class="block text-gray-800">{{ magicPreview.company }}</span>
            </div>
            <div v-if="magicPreview.siret">
              <span class="block text-[10px] uppercase tracking-wider text-gray-400">SIRET</span>
              <span class="block text-gray-800 font-mono">{{ magicPreview.siret }}</span>
            </div>
          </div>

          <form class="space-y-3" @submit.prevent="onMagicLogin">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                {{ magicPreview.isNewAccount ? 'Choisissez un mot de passe' : 'Mot de passe' }}
              </label>
              <input
                v-model="magicPassword"
                type="password"
                autocomplete="new-password"
                required
                minlength="6"
                placeholder="6 caractères minimum"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <p v-if="magicError" class="text-xs text-red-600">{{ magicError }}</p>
            <button
              type="submit"
              :disabled="magicLoading || !magicPassword || magicPassword.length < 6"
              class="w-full text-sm font-semibold px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg"
            >
              {{ magicLoading ? 'Connexion…' : (magicPreview.isNewAccount ? 'Activer mon compte et voir le panier' : 'Se connecter et voir le panier') }}
            </button>
          </form>
          <p class="text-[11px] text-gray-400 text-center">
            <NuxtLink :to="localePath('/mot-de-passe-oublie')" class="hover:underline">Mot de passe oublié&nbsp;?</NuxtLink>
          </p>
        </div>
      </div>

      
      <div class="bg-gray-50 border-b border-gray-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <nav class="flex items-center gap-2 text-xs text-gray-400">
            <NuxtLink to="/" class="hover:text-primary-600">{{ t('cart.breadcrumb_home') }}</NuxtLink>
            <span>/</span>
            <span class="text-gray-700 font-medium">{{ t('cart.breadcrumb_cart') }}</span>
          </nav>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        <h1 v-if="!carteArticles || phase !== 'garni'" class="text-2xl font-bold text-gray-900 mb-8">{{ t('cart.cart_title') }} <span v-if="phase !== 'attente' && totalItems" class="text-gray-400 font-normal text-base">({{ totalItems }} {{ totalItems > 1 ? t('cart.articles') : t('cart.article') }})</span></h1>

        
        <div v-if="phase === 'attente'" class="text-center py-12 text-gray-400 text-sm">{{ t('cart.cart_loading') }}</div>

        <div v-else-if="phase === 'garni'" class="grid lg:grid-cols-3 gap-8">
          
          <div class="lg:col-span-2 space-y-4">
            
            <CartGuestLoyaltyPrompt v-if="encarts['guest-loyalty'] && inviteFidelite" />
            
            <div v-if="carteArticles" class="rounded-t-xl bg-gray-50 px-5 pt-5" data-panier="entete">
              <h1 class="text-2xl font-bold text-gray-900">{{ t('cart.items_card_title', 'Votre panier') }}</h1>
              <p class="mt-1 text-sm text-gray-600">{{ t('cart.items_card_notice', 'Les articles dans votre panier ne sont pas réservés ; validez votre commande dès maintenant pour les acquérir.') }}</p>
            </div>
            
            <template v-if="ligneDet">
              <CartLineDetailed
                v-for="item in items"
                :key="item.lineKey"
                :item="recapTTC ? ligneEnTTC(item, formatPrice) : item"
                :hors-taxe="isB2b"
                @quantity="(n: number) => updateQuantity(item.lineKey, n)"
                @remove="removeFromCart(item.lineKey)"
              />
            </template>
            <div
              v-else
              v-for="item in items"
              :key="item.id"
              class="flex items-start gap-4 p-4 border border-gray-100 rounded-xl"
            >
              <div class="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-contain p-2" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">{{ item.name }}</h3>
                <p v-if="item.variantLabel" class="text-xs text-gray-500 mt-0.5">{{ item.variantLabel }}</p>

                
                <div
                  v-if="item.format || item.packaging || item.caliber"
                  class="mt-1 flex flex-wrap gap-1"
                >
                  <span
                    v-if="item.format"
                    class="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                  >{{ item.format }}</span>
                  <span
                    v-if="item.packaging"
                    class="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700"
                  >{{ item.packaging }}</span>
                  <span
                    v-if="item.caliber"
                    class="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                  >{{ item.caliber }}</span>
                </div>

                <p v-if="item.ref" class="text-[10px] text-gray-400 mt-0.5">{{ t('cart.label_ref') }} {{ item.ref }}</p>

                
                <template v-if="item.pricePerKgFormatted">
                  <div class="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    <span class="text-base font-bold text-primary-600">{{ item.pricePerKgFormatted }}</span>
                    <span class="text-xs font-semibold text-primary-600">{{ item.unitLabel || 'HT/K' }}</span>
                    <span
                      v-if="item.pricePerKgFormattedBeforeDiscount"
                      class="text-xs text-red-600 line-through"
                    >{{ item.pricePerKgFormattedBeforeDiscount }}</span>
                    <span
                      v-if="item.reductionLabel"
                      class="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5"
                    >{{ item.reductionLabel }}</span>
                  </div>
                  <p class="text-[11px] text-gray-500 mt-0.5 leading-tight">
                    <template v-if="item.taxRate">{{ t('cart.label_vat_at', 'TVA à') }} {{ item.taxRate.toString().replace('.', ',') }} %, {{ t('cart.label_for_a_pack', 'soit pour') }} {{ item.quantity === 1 ? t('cart.label_one_pack', 'un colis') : `${item.quantity} ${t('cart.label_packs', 'colis')}` }} :</template>
                    <span class="font-semibold text-gray-700">{{ formatPrice(item.priceRaw * item.quantity) }} {{ t('cart.label_ht') }}</span>
                  </p>
                </template>
                <template v-else>
                  <div class="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    
                    <span class="text-sm font-bold text-primary-600">{{ item.price }}<template v-if="isB2b"> {{ t('cart.label_ht') }}</template></span>
                    <span
                      v-if="item.priceFormattedBeforeDiscount"
                      class="text-xs text-red-600 line-through"
                    >{{ item.priceFormattedBeforeDiscount }}</span>
                    <span
                      v-if="item.reductionLabel"
                      class="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5"
                    >{{ item.reductionLabel }}</span>
                  </div>
                  
                  <p v-if="isB2b" class="text-xs text-gray-400">{{ formatPrice(item.priceRaw * 1.20) }} {{ t('cart.label_ttc') }}</p>
                </template>
                
                <p v-if="item.customization" class="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <span
                    v-if="item.customization.colorHex"
                    class="inline-block w-3 h-3 rounded-full border border-gray-300 shrink-0"
                    :style="{ backgroundColor: item.customization.colorHex }"
                    aria-hidden="true"
                  />
                  <span>{{ item.customization.label || t('product.personalize_cart_line', 'Flocage') }} : «&nbsp;{{ item.customization.text }}&nbsp;»</span>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex items-center border border-gray-200 rounded-lg">
                  <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700" @click="updateQuantity(item.lineKey, item.quantity - 1)">−</button>
                  <span class="w-8 h-8 flex items-center justify-center text-sm font-semibold">{{ item.quantity }}</span>
                  <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700" @click="updateQuantity(item.lineKey, item.quantity + 1)">+</button>
                </div>
                <button class="text-gray-300 hover:text-red-500 transition-colors" @click="removeFromCart(item.lineKey)">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              </div>
            </div>
            <CartHelpLinks v-if="encarts['help'] && aideItems.length" :items="aideItems" />
          </div>

          
          <div class="lg:col-span-1">
            <div class="bg-gray-50 rounded-2xl p-6 sticky top-24">
              <h2 class="text-lg font-bold text-gray-900 mb-4">{{ t('cart.cart_summary') }}</h2>

              
              <CartFirstOrderBanner v-if="encarts['first-order']" class="mb-4" />

              
              <div v-if="appliedCorseTva" class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                <p class="font-semibold text-blue-900">TVA Corse appliquée — 2,1 %</p>
                <p class="text-xs text-blue-800 mt-1">
                  Votre adresse en Corse bénéficie automatiquement du taux de TVA réduit applicable aux produits alimentaires.
                </p>
              </div>

              
              <div v-if="recapTTC" class="space-y-3 text-sm" data-recap="ttc">
                <div class="flex justify-between">
                  <span class="text-gray-700">{{ t('cart.cart_subtotal', 'Sous-total') }}</span>
                  <span class="text-gray-900" data-montant="sous-total">{{ formatPrice(recap.sousTotalTTC) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-700">{{ t('cart.cart_shipping') }}</span>
                  <span class="text-gray-900">{{ freeShipping ? t('cart.cart_shipping_free') : t('cart.cart_shipping_next_step') }}</span>
                </div>
                <div v-if="recap.remiseTTC > 0" class="flex justify-between">
                  <span class="text-gray-700">{{ t('cart.summary_discount', 'Code promo') }}<template v-if="discountCode">&nbsp;« {{ discountCode }} »</template></span>
                  <span class="text-gray-900" data-montant="remise">−{{ formatPrice(recap.remiseTTC) }}</span>
                </div>
              </div>
              <div v-else class="space-y-3 text-sm">
                <div class="flex justify-between">
                  
                  <span class="text-gray-500">{{ isB2b ? t('cart.cart_subtotal_ht') : t('cart.cart_subtotal', 'Sous-total') }}</span>
                  <span class="font-semibold text-gray-900">{{ subtotalFormatted }}</span>
                </div>
                <div v-if="discountCode && discountHT > 0" class="flex justify-between text-emerald-700">
                  <span>Remise « {{ discountCode }} »</span>
                  <span class="font-semibold">−{{ formatPrice(discountHT) }} {{ t('cart.label_ht') }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">{{ t('cart.cart_vat_estimated') }}</span>
                  <span class="text-gray-600">{{ formatPrice(totalTTC - totalHT) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">{{ t('cart.cart_shipping') }}</span>
                  <span :class="freeShipping ? 'text-primary-600 font-semibold' : 'text-gray-900'">
                    {{ freeShipping ? t('cart.cart_shipping_free') : t('cart.cart_shipping_next_step') }}
                  </span>
                </div>
                <div v-if="!freeShipping && freeShippingThreshold > 0" class="text-xs text-gray-400">
                  {{ t('cart.cart_free_shipping_threshold', 'Livraison offerte dès {amount} HT').replace('{amount}', formatPrice(freeShippingThreshold)) }}
                </div>
              </div>

              
              <div v-if="!discountCode" class="border-t border-gray-200 mt-4 pt-4">
                <label v-if="t('cart.cart_promo_label', '')" for="panier-code-promo" class="block text-sm font-semibold text-gray-900 mb-2">{{ t('cart.cart_promo_label', '') }}</label>
                <div class="flex gap-2">
                  <input
                    id="panier-code-promo"
                    v-model="promoInput"
                    type="text"
                    :placeholder="t('cart.cart_promo_placeholder')"
                    class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-600 focus:border-primary-600 outline-none"
                    @keyup.enter="onApplyPromo"
                  />
                  <button
                    :disabled="!promoInput || promoLoading"
                    class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    @click="onApplyPromo"
                  >
                    {{ promoLoading ? '...' : t('cart.cart_promo_apply', 'OK') }}
                  </button>
                </div>
                <p v-if="promoError" class="text-red-500 text-xs mt-1">{{ promoError }}</p>
              </div>

              <CartLoyaltyBlock v-if="encarts['loyalty']" :total-ttc="recapTTC ? recap.totalTTC : totalTTC" />

              <div v-if="recapTTC" class="border-t border-gray-200 mt-4 pt-4">
                <div class="flex justify-between text-lg font-bold">
                  <span class="text-gray-900 uppercase">{{ t('cart.cart_total_ttc') }}</span>
                  <span class="text-primary-600" data-montant="total-ttc">{{ formatPrice(recap.totalTTC) }}</span>
                </div>
              </div>
              <div v-else class="border-t border-gray-200 mt-4 pt-4">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">{{ t('cart.cart_total_ht') }}</span>
                  <span class="font-bold text-gray-900">{{ totalFormatted }}</span>
                </div>
                <div class="flex justify-between text-lg font-bold mt-1">
                  <span class="text-gray-900">{{ t('cart.cart_total_ttc') }}</span>
                  <span class="text-primary-600">{{ totalTTCFormatted }}</span>
                </div>
              </div>

              
              <div
                v-if="underMinimum"
                class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900"
              >
                <strong>{{ t('cart.minimum_not_reached_title', 'Minimum de commande non atteint') }}</strong>
                <p class="mt-1">
                  {{ t('cart.minimum_not_reached_msg', 'Il manque {delta} HT pour atteindre le minimum de {min} HT.').replace('{delta}', formatPrice(minDelta)).replace('{min}', formatPrice(purchaseMinimumHt)) }}
                </p>
              </div>

              <NuxtLink
                v-if="!underMinimum"
                :to="localePath('/commander')"
                :class="ctaClasses"
              >
                {{ t('cart.cart_checkout_button') }}
              </NuxtLink>
              <button
                v-else
                disabled
                class="block w-full mt-3 py-3.5 bg-gray-200 text-gray-500 font-semibold rounded-xl text-sm text-center cursor-not-allowed"
              >
                {{ t('cart.cart_checkout_button') }}
              </button>

              <NuxtLink to="/" class="block mt-3 text-center text-xs text-gray-400 hover:text-primary-600">
                {{ t('cart.cart_continue_shopping') }}
              </NuxtLink>
            </div>
          </div>
        </div>

        
        <div v-else class="text-center py-20">
          <svg class="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
          <p class="text-gray-500 text-sm mb-2">{{ t('cart.cart_empty') }}</p>
          <NuxtLink to="/" class="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl text-sm">
            {{ t('cart.cart_discover_products') }}
          </NuxtLink>
        </div>

        
        <CartRecommendations
          v-if="encarts['recommendations'] && phase === 'garni' && recoSource"
          :source="recoSource"
          :fill="recoFill"
        />
      </div>
    </div>
    
    <PageSections v-if="sectionsContenu.length" :sections="sectionsContenu" />
  </NuxtLayout>
</template>
