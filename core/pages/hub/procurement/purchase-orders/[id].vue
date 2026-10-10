
<template>
  <div class="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/hub/procurement/purchase-orders" class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 inline-flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            {{ tHub('hub.ui.procurement_purchase_orders_detail.back', 'BC') }}
          </NuxtLink>
          <span class="text-gray-300 dark:text-slate-700">/</span>
          <h1 v-if="data?.order" class="text-lg font-bold font-mono">{{ data.order.reference }}</h1>
          <span v-if="data?.order" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: data.order.stateColor }" />
            {{ data.order.stateName }}
          </span>
        </div>
        <div v-if="data?.order" class="flex items-center gap-2">
          <button v-if="!data.order.enclosed" @click="cancel" :disabled="saving"
            class="text-xs font-semibold text-danger-600 hover:text-danger-700 disabled:opacity-40 px-3 py-1.5">
            {{ data.order.editable ? tHub('hub.ui.procurement_purchase_orders_detail.delete_draft', 'Supprimer brouillon') : tHub('hub.ui.procurement_purchase_orders_detail.cancel_po', 'Annuler BC') }}
          </button>
        </div>
      </div>
    </header>

    <div class="p-6 max-w-6xl mx-auto space-y-6">
      <div v-if="loading" class="text-xs text-gray-400">{{ tHub('hub.ui.procurement_purchase_orders_detail.loading', 'Chargement…') }}</div>

      <template v-else-if="data?.order">
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ tHub('hub.ui.procurement_purchase_orders_detail.supplier', 'Fournisseur') }}</p>
            <NuxtLink :to="`/hub/procurement/suppliers/${data.order.idSupplier}`" class="text-sm font-bold hover:text-primary-600">{{ data.order.supplierName }}</NuxtLink>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ tHub('hub.ui.procurement_purchase_orders_detail.warehouse', 'Entrepôt') }}</p>
            <p class="text-sm font-bold">{{ data.order.warehouseName }}</p>
          </div>
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ tHub('hub.ui.procurement_purchase_orders_detail.total_ttc', 'Total TTC') }}</p>
            <p class="text-lg font-extrabold">{{ fmtEur(data.order.totalTTC) }}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">{{ tHub('hub.ui.procurement_purchase_orders_detail.totals_line', 'HT {ht} · TVA {tax}', { ht: fmtEur(data.order.totalHT), tax: fmtEur(data.order.totalTax) }) }}</p>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-sm font-bold">{{ tHub('hub.ui.procurement_purchase_orders_detail.workflow', 'Workflow') }}</h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ tHub('hub.ui.procurement_purchase_orders_detail.workflow_hint', 'Transition vers un autre état') }}</p>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-500">{{ tHub('hub.ui.procurement_purchase_orders_detail.delivery', 'Livraison') }}</label>
              <input :value="deliveryInput" @change="updateDelivery($event.target.value)" type="date"
                class="text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900" />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-for="s in data.states" :key="s.id"
              @click="transitionState(s.id)"
              :disabled="s.id === data.order.stateId || saving"
              class="text-[11px] font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 border transition-colors"
              :class="s.id === data.order.stateId
                ? 'bg-primary-600 text-white border-primary-600 cursor-default'
                : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-primary-400 hover:text-primary-600'">
              <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: s.color }" />
              {{ s.name }}
            </button>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold">{{ tHub('hub.ui.procurement_purchase_orders_detail.lines', 'Lignes') }}</h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ data.order.receiptState ? tHub('hub.ui.procurement_purchase_orders_detail.lines_receipt', '{n} produit(s) · Saisie réception active', { n: data.lines.length }) : tHub('hub.ui.procurement_purchase_orders_detail.lines_ordered', '{n} produit(s) · Quantités commandées', { n: data.lines.length }) }}</p>
            </div>
            <button v-if="data.order.receiptState && receiptDirty" @click="saveReceipts" :disabled="saving"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-success-600 hover:bg-success-700 text-white disabled:opacity-40">
              {{ tHub('hub.ui.procurement_purchase_orders_detail.save_receipt', 'Enregistrer réception') }}
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-500">{{ tHub('hub.ui.procurement_purchase_orders_detail.col_product', 'Produit') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.procurement_purchase_orders_detail.col_unit', 'PU HT') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.procurement_purchase_orders_detail.col_expected', 'Attendu') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.procurement_purchase_orders_detail.col_received', 'Reçu') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.procurement_purchase_orders_detail.col_total_ht', 'Total HT') }}</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-500">{{ tHub('hub.ui.procurement_purchase_orders_detail.col_vat', 'TVA') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                <tr v-for="l in data.lines" :key="l.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-2">
                    <p class="font-semibold">{{ l.name }}</p>
                    <p class="text-[10px] text-gray-400 font-mono">{{ l.reference || `#${l.idProduct}` }}<span v-if="l.supplierRef"> · {{ l.supplierRef }}</span></p>
                  </td>
                  <td class="px-4 py-2 text-right tabular-nums">{{ fmtEur(l.unitPriceTE) }}</td>
                  <td class="px-4 py-2 text-right tabular-nums font-bold">{{ l.quantityExpected }}</td>
                  <td class="px-4 py-2 text-right">
                    <input v-if="data.order.receiptState" v-model.number="receipts[l.id]"
                      type="number" min="0" :max="l.quantityExpected"
                      @change="receiptDirty = true"
                      class="w-20 text-xs border border-gray-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-900 text-right tabular-nums" />
                    <span v-else class="tabular-nums" :class="l.quantityReceived >= l.quantityExpected ? 'text-success-600 font-bold' : l.quantityReceived > 0 ? 'text-amber-600' : 'text-gray-400'">
                      {{ l.quantityReceived }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-right font-bold tabular-nums">{{ fmtEur(l.priceTE) }}</td>
                  <td class="px-4 py-2 text-right tabular-nums text-gray-500">{{ fmtEur(l.taxValue) }}<span class="text-[10px] text-gray-400 ml-1">({{ l.taxRate }}%)</span></td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50 dark:bg-slate-800/50 font-bold">
                <tr>
                  <td colspan="4" class="px-4 py-3 text-right text-gray-600 dark:text-slate-300">{{ tHub('hub.ui.procurement_purchase_orders_detail.col_total_ht', 'Total HT') }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ fmtEur(data.order.totalHT) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ fmtEur(data.order.totalTax) }}</td>
                </tr>
                <tr>
                  <td colspan="4" class="px-4 py-2 text-right text-gray-600 dark:text-slate-300">{{ tHub('hub.ui.procurement_purchase_orders_detail.total_ttc', 'Total TTC') }}</td>
                  <td colspan="2" class="px-4 py-2 text-right tabular-nums text-sm">{{ fmtEur(data.order.totalTTC) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <h2 class="text-sm font-bold">{{ tHub('hub.ui.procurement_purchase_orders_detail.history', 'Historique') }}</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ tHub('hub.ui.procurement_purchase_orders_detail.history_hint', 'Transitions d\'état et acteurs') }}</p>
          </div>
          <ul class="divide-y divide-gray-100 dark:divide-slate-800">
            <li v-for="h in data.history" :key="h.id" class="px-6 py-3 flex items-center justify-between text-xs">
              <div class="flex items-center gap-3">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: h.stateColor }" />
                <span class="font-semibold">{{ h.stateName }}</span>
                <span class="text-gray-400">{{ tHub('hub.ui.procurement_purchase_orders_detail.by', 'par {name}', { name: h.employee || 'Hub AC' }) }}</span>
              </div>
              <span class="text-gray-500 tabular-nums">{{ fmtDateTime(h.dateAdd) }}</span>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })
const { t: tHub } = useHubT()

const route = useRoute()
const data = ref<any>(null)
const loading = ref(true)
const saving = ref(false)

const receipts = ref<Record<number, number>>({})
const receiptDirty = ref(false)

const deliveryInput = computed(() => {
  const d = data.value?.order?.deliveryDate
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
})

const fmtEur = (v: number) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

async function load() {
  loading.value = true
  try {
    data.value = await $fetch(`/api/bo/procurement/purchase-orders/${route.params.id}`)
    
    receipts.value = {}
    for (const l of data.value?.lines || []) receipts.value[l.id] = l.quantityReceived
    receiptDirty.value = false
  } catch { data.value = null }
  finally { loading.value = false }
}

async function transitionState(stateId: number) {
  if (saving.value) return
  saving.value = true
  try {
    await $fetch(`/api/bo/procurement/purchase-orders/${route.params.id}`, {
      method: 'PUT', body: { stateId },
    })
    await load()
  } catch (e: any) { alert(e?.statusMessage || tHub('hub.ui.procurement_purchase_orders_detail.err_transition', 'Erreur transition')) }
  finally { saving.value = false }
}

async function updateDelivery(value: string) {
  saving.value = true
  try {
    await $fetch(`/api/bo/procurement/purchase-orders/${route.params.id}`, {
      method: 'PUT', body: { deliveryDate: value || null },
    })
    await load()
  } catch (e: any) { alert(e?.statusMessage || tHub('hub.ui.procurement_purchase_orders_detail.err_generic', 'Erreur')) }
  finally { saving.value = false }
}

async function saveReceipts() {
  saving.value = true
  try {
    await $fetch(`/api/bo/procurement/purchase-orders/${route.params.id}`, {
      method: 'PUT', body: { receipts: receipts.value },
    })
    await load()
  } catch (e: any) { alert(e?.statusMessage || tHub('hub.ui.procurement_purchase_orders_detail.err_generic', 'Erreur')) }
  finally { saving.value = false }
}

async function cancel() {
  const editable = data.value?.order?.editable
  const msg = editable
    ? tHub('hub.ui.procurement_purchase_orders_detail.confirm_delete', 'Supprimer définitivement ce BC brouillon ?')
    : tHub('hub.ui.procurement_purchase_orders_detail.confirm_cancel', 'Annuler ce BC ? Il passera en état "Commande annulée".')
  if (!confirm(msg)) return
  saving.value = true
  try {
    const res = await $fetch<any>(`/api/bo/procurement/purchase-orders/${route.params.id}`, { method: 'DELETE' })
    if (res?.hardDelete) navigateTo('/hub/procurement/purchase-orders')
    else await load()
  } catch (e: any) { alert(e?.statusMessage || tHub('hub.ui.procurement_purchase_orders_detail.err_generic', 'Erreur')) }
  finally { saving.value = false }
}

onMounted(load)
</script>
