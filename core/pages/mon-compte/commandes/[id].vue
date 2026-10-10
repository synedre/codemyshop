
<script setup lang="ts">
import type { OrderData } from '~/server/connectors/base'

import { useDisplayTimeZone } from '../../../composables/useDisplayTimeZone'

const displayTz = useDisplayTimeZone()

definePageMeta({ layout: false, ssr: false })
const { localePath } = useLocalePath()

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const clientId = String((_cfg.public as any).clientId ?? '')
const route = useRoute()
const { customer, checkSession } = useCustomerAuth()
const { reorder: reorderItems, reordering, refusals } = useReorder(clientId)
const order = ref<OrderData | null>(null)
const loading = ref(true)

const downloading = ref(false)
const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: displayTz, day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

async function downloadInvoice() {
  if (!order.value) return
  downloading.value = true
  try {
    const pdf = await $fetch<Blob>(`/api/orders/${order.value.id}/invoice`, {
      query: { clientId },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(pdf)
    const a = document.createElement('a')
    a.href = url
    a.download = `facture-${order.value.invoiceNumber}-${order.value.reference}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch {  }
  finally { downloading.value = false }
}

async function reorder() {
  if (!order.value) return
  await reorderItems(order.value.items)
}

const REPAYABLE_STATES = [14, 8]
const repaying = ref(false)
const canRepay = computed(() => {
  const o = order.value
  if (!o) return false
  const pay = String(o.payment || '').toLowerCase()
  const isSystempay = pay.includes('systempay') || pay.includes('carte bancaire')
  return REPAYABLE_STATES.includes(Number(o.statusId)) && isSystempay
})

async function resumePayment() {
  if (!order.value || repaying.value) return
  repaying.value = true
  try {
    const formData = await $fetch<{ url: string; fields: Record<string, string> }>('/api/payment/systempay-repay', {
      method: 'POST',
      body: { orderId: order.value.id },
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
    form.submit() 
  } catch (err: any) {
    console.error('[systempay-repay] error:', err?.message)
    repaying.value = false
  }
}

async function loadOrder() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo(localePath('/connexion'))
  }
  loading.value = true
  try {
    order.value = await $fetch<OrderData>(`/api/orders/${route.params.id}`, {
      query: { clientId },
    })
  } catch {  }
  finally { loading.value = false }
}

onMounted(loadOrder)
useHead({ title: computed(() => order.value ? `Commande #${order.value.reference}` : 'Commande') })
</script>

<template>
  <NuxtLayout name="white-label">
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        <div class="flex items-center gap-3 mb-8">
          <NuxtLink :to="localePath('/mon-compte/commandes')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </NuxtLink>
          <h1 class="text-2xl font-bold text-gray-900">{{ t('account.order_title', 'Commande') }} <span v-if="order">#{{ order.reference }}</span></h1>
        </div>

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('account.account_loading', 'Chargement…') }}</div>

        <div v-else-if="order" class="space-y-6">

          
          <div class="bg-white rounded-xl p-6 border border-gray-100">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-gray-500">{{ t('account.order_placed_on', 'Commandée le') }} {{ formatDate(order.dateAdd) }}</p>
                <p class="text-lg font-bold text-gray-900 mt-1">{{ order.status }}</p>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="canRepay"
                  :disabled="repaying"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  @click="resumePayment"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  {{ repaying ? t('account.order_resume_payment_loading', 'Redirection…') : t('account.order_resume_payment', 'Reprendre le paiement') }}
                </button>
                <button
                  v-if="order.invoiceNumber"
                  :disabled="downloading"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-600 hover:text-white transition-colors disabled:opacity-50"
                  @click="downloadInvoice"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" /></svg>
                  {{ downloading ? t('account.orders_downloading', 'Préparation…') : t('account.order_invoice_pdf', 'Facture PDF') }}
                </button>
                <span class="text-sm text-gray-400">{{ order.payment }}</span>
              </div>
            </div>
          </div>

          
          <DeliveryTrackingCard :order-id="order.id" variant="account" />

          
          <div class="bg-white rounded-xl p-6 border border-gray-100">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-gray-500">{{ t('account.order_articles', 'Articles') }}</h2>
              <button
                v-if="order.items.length"
                :disabled="reordering"
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                @click="reorder"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {{ reordering ? t('account.reorder_loading', 'Ajout en cours…') : t('account.reorder_all', 'Recommander ces produits') }}
              </button>
            </div>
            <div v-if="refusals.length" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
              <p class="font-semibold">{{ t('account.reorder_not_added', 'Non ajoutés au panier :') }}</p>
              <ul class="mt-1 list-disc pl-5">
                <li v-for="r in refusals" :key="r.name">{{ r.name }}<span v-if="r.message"> ({{ r.message }})</span></li>
              </ul>
            </div>
            <div v-for="item in order.items" :key="`${item.productId}-${item.combinationId || 0}`" class="flex justify-between py-3 border-b border-gray-50 last:border-0">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900">{{ item.name }}</p>
                <p class="text-[10px] text-gray-400">{{ t('account.order_item_ref', 'Réf.') }} {{ item.reference }} — {{ t('account.order_item_qty', 'Qté') }} {{ item.quantity }}</p>
                <div v-if="item.reductionLabel" class="mt-1 flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-white bg-red-600 rounded-full px-2 py-0.5">{{ item.reductionLabel }}</span>
                  <span v-if="item.priceHTBeforeDiscount" class="text-[11px] text-red-600 line-through">{{ formatPrice(item.priceHTBeforeDiscount) }} HT</span>
                </div>
              </div>
              <p class="text-sm font-semibold text-gray-900 shrink-0">{{ formatPrice(item.priceTTC * item.quantity) }}</p>
            </div>
          </div>

          
          <div class="bg-white rounded-xl p-6 border border-gray-100">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">{{ t('account.order_subtotal_ht', 'Sous-total HT') }}</span><span>{{ formatPrice(order.totalProducts) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">{{ t('account.order_shipping', 'Livraison') }}</span><span>{{ formatPrice(order.totalShipping) }}</span></div>
              <div class="flex justify-between font-bold text-lg border-t border-gray-100 pt-2 mt-2">
                <span>{{ t('account.order_total_ttc', 'Total TTC') }}</span>
                <span class="text-primary-600">{{ formatPrice(order.totalPaidTTC) }}</span>
              </div>
            </div>
          </div>

          
          <div v-if="order.addressDelivery" class="bg-white rounded-xl p-6 border border-gray-100">
            <h2 class="text-sm font-semibold text-gray-500 mb-2">{{ t('account.order_delivery_address', 'Adresse de livraison') }}</h2>
            <div class="text-sm text-gray-700">
              <p class="font-semibold">{{ order.addressDelivery.company || `${order.addressDelivery.firstname} ${order.addressDelivery.lastname}` }}</p>
              <p>{{ order.addressDelivery.address1 }}</p>
              <p>{{ order.addressDelivery.postcode }} {{ order.addressDelivery.city }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
