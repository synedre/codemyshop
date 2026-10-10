
<script setup lang="ts">
import type { OrderData, AddressData } from '~/server/connectors/base'

import { useDisplayTimeZone } from '../../composables/useDisplayTimeZone'

const displayTz = useDisplayTimeZone()

definePageMeta({
  layout: false,
  ssr: false,
  
  
  
  
  
  
  
  
  
  
  middleware: [
    (to) => {
      const config = useRuntimeConfig()
      if ((config.public as any).accountLayout !== 'sidebar') return
      if ((config.public as any).accountDashboard === true) return
      
      
      
      const base = to.path.replace(/\/+$/, '')
      return navigateTo(`${base}/commandes`, { replace: true })
    },
  ],
})
const { localePath } = useLocalePath()

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const { loggedIn, customer, checkSession, logout } = useCustomerAuth()

const orders = ref<OrderData[]>([])
const addresses = ref<AddressData[]>([])
const wishlistCount = ref(0)
const loading = ref(true)

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: displayTz }) : ''

async function loadData() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo(localePath('/connexion'))
  }
  loading.value = true
  try {
    const [ordersRes, addrsRes, wlRes] = await Promise.all([
      $fetch<OrderData[]>('/api/orders', { query: { customerId: customer.value!.customerId, clientId, limit: 5 } }),
      $fetch<AddressData[]>('/api/catalogue/customer/addresses', { query: { customerId: customer.value!.customerId } }),
      $fetch<any>('/api/wishlist/lists').catch(() => null),
    ])
    orders.value = ordersRes || []
    addresses.value = addrsRes || []
    const lists = wlRes?.lists || wlRes?.data?.lists || []
    wishlistCount.value = Array.isArray(lists) ? lists.reduce((s: number, l: any) => s + Number(l.item_count || l.itemCount || 0), 0) : 0
  } catch {  }
  finally { loading.value = false }
}

const { isDashboardAccount } = useAccountLayout()

const reorderApi = isDashboardAccount.value ? useReorder(clientId) : null
const reordering = computed(() => !!reorderApi?.reordering.value)
type DashboardFavorite = { id: number, name: string, url: string, image?: string }
const lastOrder = ref<OrderData | null>(null)
const defaultAddress = ref<AddressData | null>(null)
const loyaltyBalance = ref<number | null>(null)
const favorites = ref<DashboardFavorite[] | null>(null)

const giftcardImage = (_cfg.public as any).accountDashboardGiftcard
const giftcard = ref<{ image: string } | null>(null)

const loyaltyHowToRaw = (_cfg.public as any).accountLoyaltyHowTo
const loyaltyHowTo = typeof loyaltyHowToRaw === 'string' && loyaltyHowToRaw.startsWith('/') ? loyaltyHowToRaw : undefined

async function loadGiftcard(): Promise<{ image: string } | null> {
  if (typeof giftcardImage !== 'string' || !giftcardImage) return null
  const res = await $fetch<{ enabled?: boolean }>('/api/giftcard/status').catch(() => null)
  return res?.enabled === true ? { image: giftcardImage } : null
}

function pickDefaultAddress(list: Array<AddressData & { isDefaultBilling?: boolean }>): AddressData | null {
  return list.find(a => a.isDefaultBilling) ?? list[0] ?? null
}

async function loadFavorites(): Promise<DashboardFavorite[] | null> {
  const res = await $fetch<any>('/api/wishlist/lists').catch(() => null)
  if (!res || !Array.isArray(res.lists)) return null
  const list = res.lists.find((l: any) => l.is_default) ?? res.lists[0]
  if (!list || !Number(list.item_count)) return []
  const items = await $fetch<any>(`/api/wishlist/lists/${list.id_wishlist}/items`).catch(() => null)
  if (!items || !Array.isArray(items.items)) return []
  return items.items.slice(0, 4).map((i: any) => ({
    id: Number(i.id_wishlist_product ?? i.id_product),
    name: String(i.product_name || ''),
    url: String(i.url || ''),
    image: i.cover_url || (i.id_image ? `/${i.id_image}-home_default/${encodeURIComponent(i.link_rewrite || 'product')}.jpg` : undefined),
  }))
}

async function loadDashboard() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo(localePath('/connexion'))
  }
  loading.value = true
  try {
    const [ordersRes, addrsRes, loyaltyRes, favs, gift] = await Promise.all([
      $fetch<OrderData[]>('/api/orders', { query: { clientId, limit: 1 } }).catch(() => []),
      $fetch<AddressData[]>('/api/catalogue/customer/addresses').catch(() => []),
      $fetch<{ balance: number }>('/api/loyalty/account').catch(() => null),
      loadFavorites(),
      loadGiftcard(),
    ])
    lastOrder.value = ordersRes?.[0] ?? null
    defaultAddress.value = pickDefaultAddress(addrsRes || [])
    loyaltyBalance.value = loyaltyRes && Number.isFinite(Number(loyaltyRes.balance)) ? Number(loyaltyRes.balance) : null
    favorites.value = favs
    giftcard.value = gift
  } finally { loading.value = false }
}

async function onReorder() {
  if (lastOrder.value && reorderApi) await reorderApi.reorder(lastOrder.value.items)
}

async function onLogout() {
  await logout()
  navigateTo('/')
}

onMounted(() => (isDashboardAccount.value ? loadDashboard() : loadData()))

useHead({ title: `${t('account.head_title', 'Mon compte')} — ${String((_cfg.public as any).brandName ?? '')}` })
</script>

<template>
  <NuxtLayout name="white-label">
    
    <AccountShell v-if="isDashboardAccount" :title="t('account.dashboard_title', 'Tableau de bord')">
      <div v-if="loading" class="py-12 text-gray-400 text-sm">{{ t('account.account_loading', 'Chargement…') }}</div>
      <AccountDashboard
        v-else
        :customer="customer"
        :address="defaultAddress"
        :loyalty-balance="loyaltyBalance"
        :last-order="lastOrder"
        :favorites="favorites"
        :giftcard="giftcard"
        :loyalty-how-to="loyaltyHowTo"
        :reordering="reordering"
        @reorder="onReorder"
      />
    </AccountShell>

    
    <div v-else class="min-h-screen bg-gray-50">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ t('account.account_title', 'Mon compte') }}</h1>
            <p v-if="customer" class="text-sm text-gray-500">{{ customer?.firstname }} {{ customer?.lastname }} — {{ customer?.email }}</p>
          </div>
          <button class="text-sm text-gray-400 hover:text-red-500" @click="onLogout">{{ t('account.account_logout', 'Se déconnecter') }}</button>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('account.account_loading', 'Chargement…') }}</div>

        <div v-else class="grid md:grid-cols-2 gap-6">

          
          <NuxtLink :to="localePath('/mon-compte/commandes')" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">{{ t('account.account_orders', 'Mes commandes') }}</h2>
            <p class="text-sm text-gray-500">{{ orders.length }} commande{{ orders.length > 1 ? 's' : '' }}</p>
            <div v-if="orders.length" class="mt-3 space-y-1">
              <div v-for="o in orders.slice(0, 3)" :key="o.id" class="flex justify-between text-xs text-gray-400">
                <span>#{{ o.reference }} — {{ formatDate(o.dateAdd) }}</span>
                <span class="font-semibold text-gray-600">{{ formatPrice(o.totalPaidTTC) }}</span>
              </div>
            </div>
          </NuxtLink>

          <NuxtLink :to="localePath('/mon-compte/adresses')" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">{{ t('account.account_addresses', 'Mes adresses') }}</h2>
            <p class="text-sm text-gray-500">{{ addresses.length }} adresse{{ addresses.length > 1 ? 's' : '' }}</p>
            <div v-if="addresses.length" class="mt-3 space-y-1">
              <div v-for="a in addresses.slice(0, 2)" :key="a.id" class="text-xs text-gray-400">
                {{ a.company || `${a.firstname} ${a.lastname}` }} — {{ a.postcode }} {{ a.city }}
              </div>
            </div>
          </NuxtLink>

          <NuxtLink :to="localePath('/mon-compte/profil')" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">{{ t('account.account_profile', 'Mon profil') }}</h2>
            <p class="text-sm text-gray-500">{{ t('account.account_profile_desc', 'Nom, courriel et mot de passe.') }}</p>
          </NuxtLink>

          <NuxtLink :to="localePath('/mon-compte/fidelite')" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">Mes points de fidélité</h2>
            <p class="text-sm text-gray-500">Solde, historique et conversion en bons de réduction.</p>
          </NuxtLink>

          <NuxtLink :to="localePath('/favoris')" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">Mes favoris</h2>
            <p class="text-sm text-gray-500">{{ wishlistCount }} produit{{ wishlistCount > 1 ? 's' : '' }} dans vos listes</p>
          </NuxtLink>

          <NuxtLink to="/" class="bg-white rounded-xl p-6 border border-gray-100 hover:border-primary-600 transition-colors group">
            <h2 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600">{{ t('account.account_back_to_shop', 'Retour à la boutique') }}</h2>
            <p class="text-sm text-gray-500">{{ t('account.account_continue_shopping', 'Poursuivre mes achats') }}</p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
