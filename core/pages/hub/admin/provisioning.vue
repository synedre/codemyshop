
<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth' })

const { t: tHub } = useHubT()

useHead({ title: computed(() => tHub('hub.ui.admin_provisioning.page_title', 'Provisioning — Admin Hub')) })

const form = reactive({
  clientId: '',
  clientName: '',
  offer: 'starter' as 'starter' | 'premium',
  domain: '',
  region: 'GRA' as string,
  email: '',
})

const regions = computed(() => [
  { value: 'GRA', label: tHub('hub.ui.admin_provisioning.region_gra', 'Gravelines (Nord)') },
  { value: 'SBG', label: tHub('hub.ui.admin_provisioning.region_sbg', 'Strasbourg (Est)') },
  { value: 'RBX', label: tHub('hub.ui.admin_provisioning.region_rbx', 'Roubaix (Nord)') },
  { value: 'BHS', label: tHub('hub.ui.admin_provisioning.region_bhs', 'Beauharnois (Canada — non souverain)') },
])

const isSubmitting = ref(false)
const deployStatus = ref<'idle' | 'provisioning' | 'success' | 'error'>('idle')
const deployLog = ref<string[]>([])
const errorMessage = ref('')

const isValid = computed(() =>
  form.clientId.trim().length >= 2
  && form.clientName.trim().length >= 2
  && form.domain.trim().includes('.')
  && form.email.trim().includes('@')
  && !form.region.startsWith('BHS') 
)

watch(() => form.clientName, (name) => {
  if (!form.clientId || form.clientId === slugify(form.clientName)) {
    form.clientId = slugify(name)
  }
})

function slugify(str: string): string {
  return str.trim().toLowerCase()
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[ùûü]/g, 'u')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

async function launchProvisioning() {
  if (!isValid.value || isSubmitting.value) return

  isSubmitting.value = true
  deployStatus.value = 'provisioning'
  deployLog.value = []
  errorMessage.value = ''

  deployLog.value.push(`[${new Date().toLocaleTimeString()}] ${tHub('hub.ui.admin_provisioning.log_start', 'Démarrage du provisioning {offer} pour {client}...', { offer: form.offer.toUpperCase(), client: form.clientId })}`)

  try {
    const data = await $fetch<{ success: boolean; steps: string[]; error?: string }>('/api/admin/provision', {
      method: 'POST',
      body: {
        clientId: form.clientId.trim(),
        clientName: form.clientName.trim(),
        offer: form.offer,
        domain: form.domain.trim(),
        region: form.region,
        email: form.email.trim(),
      },
    })

    if (data.success) {
      deployStatus.value = 'success'
      deployLog.value.push(...(data.steps || []))
      deployLog.value.push(`[${new Date().toLocaleTimeString()}] ${tHub('hub.ui.admin_provisioning.log_done', '✓ Provisioning terminé')}`)
    } else {
      deployStatus.value = 'error'
      errorMessage.value = data.error || tHub('hub.ui.admin_provisioning.err_unknown', 'Erreur inconnue')
      deployLog.value.push(`[${new Date().toLocaleTimeString()}] ${tHub('hub.ui.admin_provisioning.log_error', '✗ Erreur : {error}', { error: data.error })}`)
    }
  } catch (err: any) {
    deployStatus.value = 'error'
    errorMessage.value = err?.data?.message || err?.message || tHub('hub.ui.admin_provisioning.err_network', 'Erreur réseau')
    deployLog.value.push(`[${new Date().toLocaleTimeString()}] ✗ ${errorMessage.value}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-extrabold text-gray-900 dark:text-white">{{ tHub('hub.ui.admin_provisioning.title', 'Provisioning Client') }}</h1>
      <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">{{ tHub('hub.ui.admin_provisioning.lead', 'Déployer un nouveau client CodeMyShop en un clic.') }}</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

      
      <div class="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
        <h2 class="text-base font-bold text-gray-900 dark:text-white mb-6">{{ tHub('hub.ui.admin_provisioning.config', 'Configuration') }}</h2>

        <div class="space-y-5">
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{{ tHub('hub.ui.admin_provisioning.client_name', 'Nom du client') }} *</label>
            <input v-model="form.clientName" type="text" :placeholder="tHub('hub.ui.admin_provisioning.client_name_ph', 'Ex : Ma Boutique')"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all">
          </div>

          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{{ tHub('hub.ui.admin_provisioning.client_id', 'Client ID (slug)') }} *</label>
            <input v-model="form.clientId" type="text" :placeholder="tHub('hub.ui.admin_provisioning.client_id_ph', 'ma-boutique')"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all">
          </div>

          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{{ tHub('hub.ui.admin_provisioning.client_email', 'Email du client') }} *</label>
            <input v-model="form.email" type="email" :placeholder="tHub('hub.ui.admin_provisioning.client_email_ph', 'contact@exemple.fr')"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all">
          </div>

          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{{ tHub('hub.ui.admin_provisioning.offer_type', 'Type d\'offre') }} *</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                class="px-4 py-3 rounded-lg text-sm font-semibold border transition-all text-left"
                :class="form.offer === 'starter'
                  ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-slate-900/50 border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400'"
                @click="form.offer = 'starter'"
              >
                <span class="block">Starter</span>
                <span class="text-xs font-normal opacity-70">{{ tHub('hub.ui.admin_provisioning.starter_desc', 'Mutualisé — Lead Gen') }}</span>
              </button>
              <button
                class="px-4 py-3 rounded-lg text-sm font-semibold border transition-all text-left"
                :class="form.offer === 'premium'
                  ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-slate-900/50 border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400'"
                @click="form.offer = 'premium'"
              >
                <span class="block">Premium</span>
                <span class="text-xs font-normal opacity-70">{{ tHub('hub.ui.admin_provisioning.premium_desc', 'Dédié — E-commerce') }}</span>
              </button>
            </div>
          </div>

          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{{ tHub('hub.ui.admin_provisioning.target_domain', 'Domaine cible') }} *</label>
            <input v-model="form.domain" type="text" :placeholder="tHub('hub.ui.admin_provisioning.target_domain_ph', 'exemple.fr')"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all">
          </div>

          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{{ tHub('hub.ui.admin_provisioning.region_ovh', 'Région OVH') }} *</label>
            <select v-model="form.region"
              class="w-full bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all appearance-none">
              <option v-for="r in regions" :key="r.value" :value="r.value" class="bg-white dark:bg-slate-800">{{ r.label }}</option>
            </select>
            <p v-if="form.region === 'BHS'" class="text-xs text-red-500 mt-1">{{ tHub('hub.ui.admin_provisioning.region_warning', 'Région non souveraine — déconseillé pour les clients français.') }}</p>
          </div>

          
          <button
            class="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-lg transition-all mt-2"
            :disabled="!isValid || isSubmitting"
            @click="launchProvisioning"
          >
            <span v-if="!isSubmitting">{{ tHub('hub.ui.admin_provisioning.launch', 'Lancer le Déploiement Souverain') }}</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ tHub('hub.ui.admin_provisioning.provisioning', 'Provisioning en cours...') }}
            </span>
          </button>
        </div>
      </div>

      
      <div class="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
        <h2 class="text-base font-bold text-gray-900 dark:text-white mb-4">{{ tHub('hub.ui.admin_provisioning.log_title', 'Journal de déploiement') }}</h2>

        
        <div v-if="form.clientId" class="bg-gray-50 dark:bg-slate-900/30 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-4 space-y-2">
          <div class="flex justify-between text-xs">
            <span class="text-gray-500 dark:text-slate-500">{{ tHub('hub.ui.admin_provisioning.sum_client', 'Client') }}</span>
            <span class="font-mono text-gray-900 dark:text-white">{{ form.clientId }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-500 dark:text-slate-500">{{ tHub('hub.ui.admin_provisioning.sum_offer', 'Offre') }}</span>
            <span class="font-semibold" :class="form.offer === 'premium' ? 'text-accent-600 dark:text-accent-400' : 'text-primary-600 dark:text-primary-400'">
              {{ form.offer === 'premium' ? tHub('hub.ui.admin_provisioning.premium_label', 'Premium (VPS dédié)') : tHub('hub.ui.admin_provisioning.starter_label', 'Starter (mutualisé)') }}
            </span>
          </div>
          <div v-if="form.domain" class="flex justify-between text-xs">
            <span class="text-gray-500 dark:text-slate-500">{{ tHub('hub.ui.admin_provisioning.sum_domain', 'Domaine') }}</span>
            <span class="text-gray-900 dark:text-white">{{ form.domain }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-500 dark:text-slate-500">{{ tHub('hub.ui.admin_provisioning.sum_region', 'Région') }}</span>
            <span class="text-gray-900 dark:text-white">{{ regions.find(r => r.value === form.region)?.label }}</span>
          </div>
        </div>

        
        <div class="bg-gray-900 dark:bg-black/30 rounded-lg p-4 font-mono text-xs text-emerald-400 min-h-[200px] max-h-[400px] overflow-y-auto">
          <div v-if="deployLog.length === 0" class="text-slate-600">
            {{ tHub('hub.ui.admin_provisioning.log_waiting', 'En attente du lancement...') }}
          </div>
          <div v-for="(line, i) in deployLog" :key="i" class="mb-1">
            {{ line }}
          </div>
          <span v-if="deployStatus === 'provisioning'" class="inline-block w-2 h-4 bg-emerald-400 animate-pulse" />
        </div>

        
        <div class="mt-4">
          <span v-if="deployStatus === 'success'" class="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {{ tHub('hub.ui.admin_provisioning.badge_done', 'Déployé') }}
          </span>
          <span v-else-if="deployStatus === 'error'" class="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span class="w-1.5 h-1.5 bg-red-500 rounded-full" /> {{ tHub('hub.ui.admin_provisioning.badge_error', 'Erreur') }}
          </span>
          <span v-else-if="deployStatus === 'provisioning'" class="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> {{ tHub('hub.ui.admin_provisioning.badge_running', 'En cours') }}
          </span>
        </div>
      </div>

    </div>
  </div>
</template>
