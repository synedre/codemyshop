<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ tHub('hub.ui.crm_freight.title', 'Franco de port') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ rules.length > 1 ? tHub('hub.ui.crm_freight.rules_other', '{n} règles', { n: rules.length }) : tHub('hub.ui.crm_freight.rules_one', '{n} règle', { n: rules.length }) }} · {{ activeCount > 1 ? tHub('hub.ui.crm_freight.active_other', '{n} actives', { n: activeCount }) : tHub('hub.ui.crm_freight.active_one', '{n} active', { n: activeCount }) }}</p>
      </div>
      <div class="flex gap-2">
        <button @click="openCreate" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold">{{ tHub('hub.ui.crm_freight.new_rule', '+ Nouvelle règle') }}</button>
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">{{ tHub('hub.ui.crm_freight.refresh', 'Actualiser') }}</button>
      </div>
    </header>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      
      <section class="bg-primary-50/40 dark:bg-slate-800/30 border border-primary-100 dark:border-slate-700 rounded-xl p-4">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300 mb-3">{{ tHub('hub.ui.crm_freight.sim_title', '🧮 Simulateur panier') }}</h2>
        <div class="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <label class="text-xs">
            <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.amount_ht', 'Montant HT') }}</span>
            <input v-model.number="sim.amount" type="number" step="0.01" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <label class="text-xs">
            <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.weight_kg', 'Poids (kg)') }}</span>
            <input v-model.number="sim.weight" type="number" step="0.1" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <label class="text-xs">
            <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.pallets', 'Palettes') }}</span>
            <input v-model.number="sim.pallets" type="number" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <label class="text-xs">
            <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.group_id', 'Groupe (id)') }}</span>
            <input v-model.number="sim.group" type="number" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <label class="text-xs">
            <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.carrier', 'Carrier') }}</span>
            <input v-model.number="sim.carrier" type="number" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
          </label>
          <button @click="resolve" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold">{{ tHub('hub.ui.crm_freight.resolve', 'Résoudre') }}</button>
        </div>
        <div v-if="simResult" class="mt-3 flex items-start gap-3">
          <span class="text-sm font-bold px-3 py-1 rounded-full" :class="simResult.franco ? 'bg-success-100 text-success-700' : 'bg-gray-200 text-gray-600'">
            {{ simResult.franco ? tHub('hub.ui.crm_freight.is_franco', '✓ FRANCO') : tHub('hub.ui.crm_freight.paid_shipping', '✕ Port payant') }}
          </span>
          <div v-if="simResult.winner" class="text-xs text-gray-700 dark:text-slate-300">
            <p class="font-semibold">{{ simResult.winner.label }}</p>
            <p class="text-gray-500 mt-0.5">{{ tHub('hub.ui.crm_freight.threshold_line', '{label} ≥ {value} · priorité {priority}', { label: thresholdLabel(simResult.winner.thresholdType), value: simResult.winner.thresholdValue, priority: simResult.winner.priority }) }}</p>
            <p v-if="simResult.eligible.length > 1" class="text-[10px] text-amber-600 mt-0.5">{{ tHub('hub.ui.crm_freight.eligible_rules', '{n} règles éligibles, la prioritaire gagne.', { n: simResult.eligible.length }) }}</p>
          </div>
        </div>
      </section>

      
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{{ tHub('hub.ui.crm_freight.rules_title', '🚚 Règles franco') }}</h2>
        <div v-if="loading" class="h-24 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div v-else-if="!rules.length" class="py-10 text-center text-xs text-gray-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
          {{ tHub('hub.ui.crm_freight.no_rules', 'Aucune règle franco. Crées-en une pour activer la résolution.') }}
        </div>
        <table v-else class="w-full text-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <thead class="bg-gray-50 dark:bg-slate-800/50">
            <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
              <th class="px-4 py-2.5 font-medium">{{ tHub('hub.ui.crm_freight.col_rule', 'Règle') }}</th>
              <th class="px-4 py-2.5 font-medium">{{ tHub('hub.ui.crm_freight.scope', 'Scope') }}</th>
              <th class="px-4 py-2.5 font-medium">{{ tHub('hub.ui.crm_freight.col_threshold', 'Seuil') }}</th>
              <th class="px-4 py-2.5 font-medium text-right">{{ tHub('hub.ui.crm_freight.col_priority', 'Priorité') }}</th>
              <th class="px-4 py-2.5 font-medium text-center">{{ tHub('hub.ui.crm_freight.col_active', 'Actif') }}</th>
              <th class="px-4 py-2.5 font-medium text-right">{{ tHub('hub.ui.crm_freight.col_actions', 'Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rules" :key="r.id" class="border-t border-gray-50 dark:border-slate-800/50 hover:bg-primary-50/20">
              <td class="px-4 py-2 font-semibold text-gray-800 dark:text-slate-100">{{ r.label }}</td>
              <td class="px-4 py-2 text-xs">
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">{{ r.scope }}</span>
                <span v-if="r.scope !== 'all'" class="ml-1 text-gray-600 dark:text-slate-400">{{ r.scopeLabel || `#${r.scopeId}` }}</span>
              </td>
              <td class="px-4 py-2 text-xs font-mono">{{ thresholdLabel(r.thresholdType) }} ≥ {{ r.thresholdValue }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs">{{ r.priority }}</td>
              <td class="px-4 py-2 text-center">
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="r.active ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'">
                  {{ r.active ? '✓' : '—' }}
                </span>
              </td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-1">
                  <button @click="openEdit(r)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded hover:text-primary-600" :title="tHub('hub.ui.crm_freight.edit', 'Éditer')">✎</button>
                  <button @click="deleteRule(r)" class="text-[10px] px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded hover:text-danger-500" :title="tHub('hub.ui.crm_freight.delete', 'Supprimer')">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="modalOpen = false">
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ editId ? tHub('hub.ui.crm_freight.edit_rule', 'Éditer la règle') : tHub('hub.ui.crm_freight.new_rule_title', 'Nouvelle règle') }}</h2>
          <button @click="modalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form @submit.prevent="submit" class="p-5 space-y-3">
          <label class="text-xs block">
            <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.label_req', 'Libellé *') }}</span>
            <input v-model="form.label" required maxlength="128" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" :placeholder="tHub('hub.ui.crm_freight.label_ph', 'Franco dès 500 € HT groupe Restau')" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.scope', 'Scope') }}</span>
              <select v-model="form.scope" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5">
                <option value="all">{{ tHub('hub.ui.crm_freight.scope_all', 'all (tous)') }}</option>
                <option value="customer_group">customer_group</option>
                <option value="carrier">carrier</option>
                <option value="zone">zone</option>
              </select>
            </label>
            <label class="text-xs" v-if="form.scope !== 'all'">
              <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.scope_id', 'ID du scope') }}</span>
              <input v-model.number="form.scopeId" type="number" min="1" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.threshold_type', 'Type de seuil') }}</span>
              <select v-model="form.thresholdType" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5">
                <option value="amount_ht">amount_ht (€)</option>
                <option value="weight_kg">weight_kg</option>
                <option value="pallets">pallets</option>
              </select>
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.threshold_value_req', 'Valeur seuil *') }}</span>
              <input v-model.number="form.thresholdValue" type="number" step="0.001" min="0" required class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.col_priority', 'Priorité') }}</span>
              <input v-model.number="form.priority" type="number" min="0" class="w-full mt-1 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs flex items-center gap-2 mt-4">
              <input v-model="form.active" type="checkbox" :true-value="1" :false-value="0" />
              <span class="text-gray-500 dark:text-slate-400">{{ tHub('hub.ui.crm_freight.col_active', 'Actif') }}</span>
            </label>
          </div>
          <p v-if="error" class="text-xs text-danger-500">{{ error }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="modalOpen = false" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">{{ tHub('hub.ui.crm_freight.cancel', 'Annuler') }}</button>
            <button type="submit" :disabled="saving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 font-semibold disabled:opacity-50">{{ saving ? tHub('hub.ui.crm_freight.saving', 'Enreg…') : (editId ? tHub('hub.ui.crm_freight.save', 'Enregistrer') : tHub('hub.ui.crm_freight.create', 'Créer')) }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

interface FreightRule {
  id: number; label: string; scope: string; scopeId: number; scopeLabel: string | null
  thresholdType: string; thresholdValue: number; priority: number; active: number
}

const { t: tHub } = useHubT()

const rules = ref<FreightRule[]>([])
const loading = ref(true)
const activeCount = computed(() => rules.value.filter(r => r.active).length)

const sim = ref({ amount: 500, weight: 50, pallets: 1, group: 0, carrier: 0 })
const simResult = ref<{ franco: boolean; winner: FreightRule | null; eligible: FreightRule[] } | null>(null)

const modalOpen = ref(false)
const editId = ref<number | null>(null)
const saving = ref(false)
const error = ref('')
const form = ref({
  label: '', scope: 'all', scopeId: 0, thresholdType: 'amount_ht',
  thresholdValue: 0, priority: 0, active: 1 as 0 | 1,
})

function thresholdLabel(t: string): string {
  if (t === 'amount_ht') return tHub('hub.ui.crm_freight.amount_ht', 'Montant HT')
  if (t === 'weight_kg') return tHub('hub.ui.crm_freight.weight_kg', 'Poids (kg)')
  if (t === 'pallets') return tHub('hub.ui.crm_freight.pallets', 'Palettes')
  return t
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; rules: FreightRule[] }>('/api/bo/freight')
    rules.value = res.rules || []
  } catch (e) {
    console.error('freight load failed', e)
  } finally {
    loading.value = false
  }
}

async function resolve() {
  try {
    const res = await $fetch<any>('/api/bo/freight/resolve', {
      query: sim.value,
    })
    simResult.value = { franco: res.franco, winner: res.winner, eligible: res.eligible }
  } catch (e: any) {
    alert(tHub('hub.ui.crm_freight.err_generic', 'Erreur : {msg}', { msg: e?.data?.statusMessage || e?.message }))
  }
}

function openCreate() {
  editId.value = null
  error.value = ''
  form.value = { label: '', scope: 'all', scopeId: 0, thresholdType: 'amount_ht', thresholdValue: 0, priority: 0, active: 1 }
  modalOpen.value = true
}
function openEdit(r: FreightRule) {
  editId.value = r.id
  error.value = ''
  form.value = {
    label: r.label, scope: r.scope, scopeId: Number(r.scopeId),
    thresholdType: r.thresholdType, thresholdValue: Number(r.thresholdValue),
    priority: Number(r.priority), active: r.active ? 1 : 0,
  }
  modalOpen.value = true
}
async function submit() {
  saving.value = true
  error.value = ''
  try {
    if (editId.value) {
      await $fetch(`/api/bo/freight/${editId.value}`, { method: 'PUT', body: form.value })
    } else {
      await $fetch('/api/bo/freight', { method: 'POST', body: form.value })
    }
    modalOpen.value = false
    await load()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || tHub('hub.ui.crm_freight.unknown_error', 'Erreur inconnue')
  } finally {
    saving.value = false
  }
}
async function deleteRule(r: FreightRule) {
  if (!confirm(tHub('hub.ui.crm_freight.delete_confirm', 'Supprimer la règle "{name}" ?', { name: r.label }))) return
  try {
    await $fetch(`/api/bo/freight/${r.id}`, { method: 'DELETE' })
    await load()
  } catch (e: any) {
    alert(tHub('hub.ui.crm_freight.err_generic', 'Erreur : {msg}', { msg: e?.data?.statusMessage || e?.message }))
  }
}

onMounted(load)
</script>
