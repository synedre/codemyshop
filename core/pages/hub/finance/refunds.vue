<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <h1 class="text-lg font-bold">{{ t('hub.ui.finance_refunds.title', 'Remboursements & Avoirs') }}</h1>
      <p class="text-xs text-gray-500 mt-0.5">{{ t('hub.ui.finance_refunds.subtitle', 'Historique des avoirs émis (ps_order_slip PrestaShop)') }}</p>
    </header>
    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('hub.ui.finance_refunds.kpi_count', 'Avoirs total') }}</p>
          <p class="text-2xl font-extrabold">{{ data?.totalCount ?? 0 }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('hub.ui.finance_refunds.kpi_amount', 'Montant total') }}</p>
          <p class="text-2xl font-extrabold">{{ fmtEur(data?.totalAmount ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('hub.ui.finance_refunds.kpi_last30', '30 derniers jours') }}</p>
          <p class="text-2xl font-extrabold text-danger-600">{{ fmtEur(data?.last30Amount ?? 0) }}</p>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr><th class="px-4 py-3 text-left font-semibold text-gray-500">{{ t('hub.ui.finance_refunds.col_order_ref', 'Référence commande') }}</th><th class="px-4 py-3 text-left font-semibold text-gray-500">{{ t('hub.ui.finance_refunds.col_customer', 'Client') }}</th><th class="px-4 py-3 text-left font-semibold text-gray-500">{{ t('hub.ui.finance_refunds.col_type', 'Type') }}</th><th class="px-4 py-3 text-right font-semibold text-gray-500">{{ t('hub.ui.finance_refunds.col_products', 'Produits') }}</th><th class="px-4 py-3 text-right font-semibold text-gray-500">{{ t('hub.ui.finance_refunds.col_shipping', 'Port') }}</th><th class="px-4 py-3 text-right font-semibold text-gray-500">{{ t('hub.ui.finance_refunds.col_total', 'Total') }}</th><th class="px-4 py-3 text-right font-semibold text-gray-500">{{ t('hub.ui.finance_refunds.col_date', 'Date') }}</th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
              <tr v-if="!loading && !data?.slips.length"><td colspan="7" class="px-4 py-10 text-center text-gray-400">{{ t('hub.ui.finance_refunds.empty', 'Aucun remboursement.') }}</td></tr>
              <tr v-for="s in data?.slips" :key="s.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                <td class="px-4 py-2 font-mono text-[11px]">
                  <NuxtLink :to="`/hub/orders/${s.orderId}`" class="text-primary-600 hover:underline">{{ s.orderRef || '—' }}</NuxtLink>
                </td>
                <td class="px-4 py-2"><p class="font-medium">{{ s.customerName || '—' }}</p><p class="text-[10px] text-gray-400">{{ s.customerEmail }}</p></td>
                <td class="px-4 py-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                    :class="s.partial ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'">
                    {{ s.partial ? t('hub.ui.finance_refunds.type_partial', '{type} partiel', { type: s.type }) : s.type }}
                  </span>
                </td>
                <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(s.productsAmount) }}</td>
                <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(s.shippingAmount) }}</td>
                <td class="px-4 py-2 text-right font-bold tabular-nums">{{ fmtEur(s.amount) }}</td>
                <td class="px-4 py-2 text-right text-gray-500">{{ fmtDate(s.dateAdd) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })
const { t } = useHubT()
const data = ref<any>(null); const loading = ref(true)
const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : ''
async function load() { loading.value = true; try { data.value = await $fetch('/api/bo/finance/refunds') } catch { data.value = null } finally { loading.value = false } }
onMounted(load)
</script>
