<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.logistique_transporteurs.title', 'Transporteurs') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ carriers.length > 1 ? t('hub.ui.logistique_transporteurs.count_other', '{n} transporteurs configurés', { n: carriers.length }) : t('hub.ui.logistique_transporteurs.count_one', '{n} transporteur configuré', { n: carriers.length }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" v-model="showAll" @change="load" class="rounded border-gray-300" />
          {{ t('hub.ui.logistique_transporteurs.show_inactive', 'Afficher les inactifs') }}
        </label>
        <button @click="load" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">{{ t('hub.ui.logistique_transporteurs.refresh', 'Actualiser') }}</button>
      </div>
    </header>

    <div class="flex-1 overflow-auto p-6">
      
      <section class="max-w-3xl mb-6 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5">
        <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.offer_policy.title', 'Retours et préparation') }}</h2>
        <p class="text-xs text-gray-400 mt-0.5 mb-4">{{ t('hub.offer_policy.hint', 'Annoncés sur chaque fiche produit aux moteurs et aux assistants d\'achat. Laissez vide ce que vous ne voulez pas annoncer.') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label for="op-return-days" class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.offer_policy.return_days', 'Délai de retour (jours)') }}</label>
            <input id="op-return-days" v-model="policy.CS_RETURN_DAYS" inputmode="numeric" placeholder="30" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" />
            <p class="text-[11px] text-gray-400 mt-1">{{ t('hub.offer_policy.return_days_hint', '0 = retours refusés') }}</p>
          </div>
          <div>
            <label for="op-return-fees" class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.offer_policy.return_fees', 'Frais de retour') }}</label>
            <select id="op-return-fees" v-model="policy.CS_RETURN_FEES" :disabled="!policy.CS_RETURN_DAYS || policy.CS_RETURN_DAYS === '0'" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50">
              <option value="">{{ t('hub.offer_policy.return_fees_unset', 'Non précisé') }}</option>
              <option value="free">{{ t('hub.offer_policy.return_fees_free', 'Offerts') }}</option>
              <option value="customer">{{ t('hub.offer_policy.return_fees_customer', 'À la charge du client') }}</option>
            </select>
          </div>
          <div>
            <label for="op-return-method" class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.offer_policy.return_method', 'Mode de retour') }}</label>
            <select id="op-return-method" v-model="policy.CS_RETURN_METHOD" :disabled="!policy.CS_RETURN_DAYS || policy.CS_RETURN_DAYS === '0'" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50">
              <option value="">{{ t('hub.offer_policy.return_method_unset', 'Non précisé') }}</option>
              <option value="mail">{{ t('hub.offer_policy.return_method_mail', 'Renvoi par colis') }}</option>
              <option value="store">{{ t('hub.offer_policy.return_method_store', 'Retour en magasin') }}</option>
            </select>
          </div>
          <div>
            <label for="op-handling" class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.offer_policy.handling', 'Préparation (jours ouvrés)') }}</label>
            <input id="op-handling" v-model="policy.CS_SHIPPING_HANDLING_DAYS" placeholder="1-2" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" />
            <p class="text-[11px] text-gray-400 mt-1">{{ t('hub.offer_policy.handling_hint', 'Avant la remise au transporteur : « 1 » ou « 1-2 »') }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-4">
          <button @click="savePolicy" :disabled="policySaving" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40">
            {{ policySaving ? t('hub.offer_policy.saving', 'Enregistrement…') : t('hub.offer_policy.save', 'Enregistrer') }}
          </button>
          <p v-if="policyStatus" role="status" class="text-xs" :class="policyError ? 'text-red-600' : 'text-emerald-600'">{{ policyStatus }}</p>
        </div>
      </section>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="!carriers.length" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <p class="text-sm">{{ t('hub.ui.logistique_transporteurs.empty', 'Aucun transporteur') }}</p>
      </div>

      <div v-else class="space-y-4 max-w-3xl">
        <div v-for="c in carriers" :key="c.id_carrier"
          class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5">

          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                :class="c.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H6.375m11.25-4.5V6.375a1.125 1.125 0 0 0-1.125-1.125H3.375a1.125 1.125 0 0 0-1.125 1.125v11.25M18.75 14.25h2.625c.621 0 1.125-.504 1.125-1.125V9m-4.875 0h4.875M18.75 9l2.55-3.825a.818.818 0 0 0-.132-1.05A.818.818 0 0 0 20.625 4H18" />
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ c.name }}</h3>
                <p class="text-xs text-gray-400">{{ c.delay || t('hub.ui.logistique_transporteurs.delay_unset', 'Délai non renseigné') }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="c.is_free" class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600">{{ t('hub.ui.logistique_transporteurs.free', 'Gratuit') }}</span>
              <span v-else class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">{{ t('hub.ui.logistique_transporteurs.paid', 'Payant') }}</span>
              <span v-if="c.is_click_collect" class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-violet-50 text-violet-600">Click &amp; Collect</span>
              <button @click="toggleActive(c)" :disabled="saving === c.id_carrier"
                class="text-[11px] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                :class="c.active ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'">
                {{ c.active ? t('hub.ui.logistique_transporteurs.active', 'Actif') : t('hub.ui.logistique_transporteurs.inactive', 'Inactif') }}
              </button>
            </div>
          </div>

          
          <div v-if="editingId === c.id_carrier" class="border-t border-gray-100 dark:border-slate-700 pt-4 mt-4 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.logistique_transporteurs.name', 'Nom') }}</label>
                <input v-model="editForm.name" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.logistique_transporteurs.delay', 'Délai de livraison') }}</label>
                <input v-model="editForm.delay" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" :placeholder="t('hub.ui.logistique_transporteurs.delay_ph', '2-3 jours ouvrés')" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.logistique_transporteurs.max_weight', 'Poids max (kg)') }}</label>
                <input v-model.number="editForm.maxWeight" type="number" class="w-full text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 dark:bg-slate-900 dark:text-slate-100" />
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <input type="checkbox" v-model="editForm.isFree" class="rounded border-gray-300" />
                  {{ t('hub.ui.logistique_transporteurs.free_delivery', 'Livraison gratuite') }}
                </label>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex items-center">
                <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <input type="checkbox" v-model="editForm.isClickCollect" class="rounded border-gray-300" />
                  {{ t('hub.ui.logistique_transporteurs.click_collect_pickup', 'Click & Collect (retrait)') }}
                </label>
              </div>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <button @click="saveEdit(c)" :disabled="saving === c.id_carrier" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40">
                {{ saving === c.id_carrier ? t('hub.ui.logistique_transporteurs.saving', 'Enregistrement…') : t('hub.ui.logistique_transporteurs.save', 'Enregistrer') }}
              </button>
              <button @click="editingId = null" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-colors">{{ t('hub.ui.logistique_transporteurs.cancel', 'Annuler') }}</button>
            </div>
          </div>

          
          <div v-else class="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3 mt-3">
            <div class="flex items-center gap-4 text-xs text-gray-500">
              <span v-if="c.zones">{{ t('hub.ui.logistique_transporteurs.zones', 'Zones : {zones}', { zones: c.zones }) }}</span>
              <span v-if="c.max_weight">{{ t('hub.ui.logistique_transporteurs.max_kg', 'Max {kg} kg', { kg: c.max_weight }) }}</span>
              <span v-if="c.deliveryRanges?.length">{{ c.deliveryRanges.length > 1 ? t('hub.ui.logistique_transporteurs.ranges_other', '{n} tranches de prix', { n: c.deliveryRanges.length }) : t('hub.ui.logistique_transporteurs.ranges_one', '{n} tranche de prix', { n: c.deliveryRanges.length }) }}</span>
            </div>
            <button @click="startEdit(c)" class="text-xs text-primary-600 hover:text-primary-700 transition-colors">{{ t('hub.ui.logistique_transporteurs.edit', 'Modifier') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'hub-auth', ssr: false })

const { t } = useHubT()

const carriers = ref<any[]>([])
const loading = ref(false)
const showAll = ref(false)
const editingId = ref<number | null>(null)
const saving = ref<number | null>(null)
const editForm = reactive({ name: '', delay: '', maxWeight: 0, isFree: false, isClickCollect: false })

function startEdit(c: any) {
  editingId.value = c.id_carrier
  editForm.name = c.name
  editForm.delay = c.delay || ''
  editForm.maxWeight = c.max_weight || 0
  editForm.isFree = !!c.is_free
  editForm.isClickCollect = !!c.is_click_collect
}

async function saveEdit(c: any) {
  saving.value = c.id_carrier
  try {
    await $fetch(`/api/bo/carriers/${c.id_carrier}`, { method: 'PUT', body: editForm })
    editingId.value = null
    await load()
  } finally { saving.value = null }
}

async function toggleActive(c: any) {
  saving.value = c.id_carrier
  try {
    await $fetch(`/api/bo/carriers/${c.id_carrier}`, { method: 'PUT', body: { active: !c.active } })
    await load()
  } finally { saving.value = null }
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/carriers/manage', { query: { all: showAll.value ? '1' : '0' } })
    carriers.value = data.carriers ?? []
  } finally { loading.value = false }
}

const policy = reactive({ CS_RETURN_DAYS: '', CS_RETURN_FEES: '', CS_RETURN_METHOD: '', CS_SHIPPING_HANDLING_DAYS: '' })
const policySaving = ref(false)
const policyStatus = ref('')
const policyError = ref(false)

async function loadPolicy() {
  try {
    Object.assign(policy, await $fetch<typeof policy>('/api/hub/configuration/offer-policy'))
  } catch {  }
}

async function savePolicy() {
  policySaving.value = true
  policyStatus.value = ''
  try {
    Object.assign(policy, await $fetch<typeof policy>('/api/hub/configuration/offer-policy', { method: 'POST', body: { ...policy } }))
    policyError.value = false
    policyStatus.value = t('hub.offer_policy.saved', 'Enregistré')
  } catch (err: any) {
    policyError.value = true
    policyStatus.value = err?.statusCode === 400
      ? t('hub.offer_policy.invalid', 'Valeur non reconnue : un nombre de jours (« 30 »), et pour la préparation « 1 » ou « 1-2 ».')
      : t('hub.offer_policy.error', 'Enregistrement impossible, réessayez.')
  } finally { policySaving.value = false }
}

onMounted(() => { load(); loadPolicy() })
</script>
