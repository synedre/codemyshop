
<template>
  <div class="flex min-h-0 overflow-hidden h-[calc(100vh-7rem)] bg-white dark:bg-slate-900">
    
    <aside class="w-56 shrink-0 flex flex-col border-r border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
      <header class="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
        <h2 class="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">{{ t('hub.ui.chatbot_scenario.scenarios', 'Scénarios') }}</h2>
      </header>
      <div class="flex-1 overflow-y-auto py-2">
        <button
          v-for="sc in scenarios"
          :key="sc.key"
          @click="selectedScenario = sc.key"
          class="w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center justify-between"
          :class="selectedScenario === sc.key
            ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
            : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/60'"
        >
          <span>{{ sc.label }}</span>
          <span class="text-[10px] text-gray-400 dark:text-slate-500">{{ sc.count }}</span>
        </button>
      </div>
      <footer class="px-4 py-3 border-t border-gray-100 dark:border-slate-800">
        <button
          @click="reload"
          class="w-full text-[11px] py-1.5 px-3 rounded-md border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          ↻ {{ t('hub.ui.chatbot_scenario.refresh', 'Rafraîchir') }}
        </button>
      </footer>
    </aside>

    
    <section class="w-80 shrink-0 flex flex-col border-r border-gray-100 dark:border-slate-800">
      <header class="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <h3 class="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">{{ t('hub.ui.chatbot_scenario.nodes', 'Nodes') }}</h3>
        <button
          @click="newNode"
          class="text-[11px] py-1 px-2 rounded-md bg-primary-600 text-white hover:bg-primary-700"
        >
          + {{ t('hub.ui.chatbot_scenario.new', 'Nouveau') }}
        </button>
      </header>
      <div class="flex-1 overflow-y-auto">
        <p v-if="loading" class="text-xs text-gray-400 px-4 py-8 text-center">{{ t('hub.ui.chatbot_scenario.loading', 'Chargement…') }}</p>
        <p v-else-if="visibleNodes.length === 0" class="text-xs text-gray-400 px-4 py-8 text-center">{{ t('hub.ui.chatbot_scenario.no_node', 'Aucun node.') }}</p>
        <ul v-else class="divide-y divide-gray-100 dark:divide-slate-800">
          <li v-for="n in visibleNodes" :key="n.idNode">
            <button
              @click="selectNode(n)"
              class="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
              :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedNode?.idNode === n.idNode }"
            >
              <div class="flex items-center justify-between gap-2 mb-0.5">
                <code class="text-[11px] font-mono text-gray-800 dark:text-slate-100 truncate">{{ n.nodeKey }}</code>
                <span class="shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                  :class="n.type === 'buttons'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'">
                  {{ n.type }}
                </span>
                <span v-if="n.terminal" class="shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-semibold">
                  ⏹ {{ t('hub.ui.chatbot_scenario.end', 'Fin') }}
                </span>
              </div>
              <p class="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2">
                {{ truncateText(getQuestion(n, 1), 80) }}
              </p>
              <p v-if="optionsForNode(n.idNode).length" class="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                {{ optionsForNode(n.idNode).length > 1 ? t('hub.ui.chatbot_scenario.options_count_other', '{n} options', { n: optionsForNode(n.idNode).length }) : t('hub.ui.chatbot_scenario.options_count_one', '{n} option', { n: optionsForNode(n.idNode).length }) }}
              </p>
            </button>
          </li>
        </ul>
      </div>
    </section>

    
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div v-if="!selectedNode && !creatingNode" class="flex-1 flex items-center justify-center text-xs text-gray-400">
        {{ t('hub.ui.chatbot_scenario.select_hint', 'Sélectionnez un node pour l\'éditer ou cliquez sur « Nouveau ».') }}
      </div>
      <template v-else>
        <header class="px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">
            {{ creatingNode ? '➕ ' + t('hub.ui.chatbot_scenario.new_node', 'Nouveau node') : `✏️ ${form.nodeKey}` }}
          </h3>
          <div class="flex gap-2">
            <button
              v-if="!creatingNode"
              @click="deleteNode"
              :disabled="saving"
              class="text-[11px] py-1.5 px-3 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
            >
              🗑 {{ t('hub.ui.chatbot_scenario.delete', 'Supprimer') }}
            </button>
            <button
              @click="saveNode"
              :disabled="saving"
              class="text-[11px] py-1.5 px-3 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {{ saving ? '…' : '💾 ' + t('hub.ui.chatbot_scenario.save', 'Enregistrer') }}
            </button>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs">
              <span class="block text-gray-600 dark:text-slate-400 mb-0.5">{{ t('hub.ui.chatbot_scenario.lbl_node_key', 'node_key (unique)') }}</span>
              <input v-model="form.nodeKey" type="text" :placeholder="t('hub.ui.chatbot_scenario.ph_node_key', 'ex: product_q1_name')" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1.5 font-mono" />
            </label>
            <label class="text-xs">
              <span class="block text-gray-600 dark:text-slate-400 mb-0.5">scenario_root</span>
              <input v-model="form.scenarioRoot" type="text" :placeholder="t('hub.ui.chatbot_scenario.ph_scenario_root', 'ex: product, pricing, order')" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="block text-gray-600 dark:text-slate-400 mb-0.5">{{ t('hub.ui.chatbot_scenario.lbl_type', 'type') }}</span>
              <select v-model="form.type" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1.5">
                <option value="buttons">buttons</option>
                <option value="text">text</option>
              </select>
            </label>
            <label class="text-xs">
              <span class="block text-gray-600 dark:text-slate-400 mb-0.5">{{ t('hub.ui.chatbot_scenario.lbl_position_lc', 'position') }}</span>
              <input v-model.number="form.position" type="number" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1.5" />
            </label>
            <label class="text-xs">
              <span class="block text-gray-600 dark:text-slate-400 mb-0.5">{{ t('hub.ui.chatbot_scenario.lbl_capture', 'capture') }} <span class="text-gray-400">{{ t('hub.ui.chatbot_scenario.optional', '(optionnel)') }}</span></span>
              <select v-model="form.capture" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1.5">
                <option value="">{{ t('hub.ui.chatbot_scenario.none', '— aucune —') }}</option>
                <option value="firstname">firstname</option>
                <option value="lastname">lastname</option>
                <option value="fullname">fullname</option>
                <option value="email">email</option>
                <option value="phone">phone</option>
                <option value="company">company</option>
                <option value="siret">siret</option>
              </select>
            </label>
            <label class="text-xs">
              <span class="block text-gray-600 dark:text-slate-400 mb-0.5">{{ t('hub.ui.chatbot_scenario.lbl_next_question', 'next_question (next node_key si type=text)') }}</span>
              <input v-model="form.nextQuestion" type="text" :placeholder="t('hub.ui.chatbot_scenario.ph_next_question', 'ex: product_q2_route')" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1.5 font-mono" />
            </label>
            <label class="text-xs col-span-2 flex items-center gap-2">
              <input v-model="form.terminal" type="checkbox" class="rounded" />
              <span class="text-gray-700 dark:text-slate-300">{{ t('hub.ui.chatbot_scenario.terminal', 'Terminal (ferme la conversation)') }}</span>
            </label>
          </div>

          
          <div class="border-t border-gray-100 dark:border-slate-800 pt-4">
            <h4 class="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 mb-2">{{ t('hub.ui.chatbot_scenario.translated_messages', 'Messages traduits') }}</h4>
            <div class="space-y-3">
              <div v-for="lang in [1, 2, 3]" :key="lang" class="space-y-1">
                <span class="text-[10px] uppercase tracking-wider text-gray-400">{{ langLabel(lang) }}</span>
                <textarea
                  v-model="form.langs[lang].question"
                  rows="3"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1.5 font-mono"
                  :placeholder="t('hub.ui.chatbot_scenario.ph_question', 'Message bot affiché à l\'utilisateur (markdown supporté)')"
                />
                <input
                  v-model="form.langs[lang].recapLabel"
                  type="text"
                  :placeholder="t('hub.ui.chatbot_scenario.ph_recap_label', 'Recap label (court, ex: « Téléphone »)')"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1.5"
                />
              </div>
            </div>
          </div>

          
          <div v-if="form.type === 'buttons' && !creatingNode" class="border-t border-gray-100 dark:border-slate-800 pt-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{{ t('hub.ui.chatbot_scenario.options_title', 'Options (boutons)') }}</h4>
              <button
                @click="newOption"
                class="text-[11px] py-1 px-2 rounded-md bg-primary-600 text-white hover:bg-primary-700"
              >
                + {{ t('hub.ui.chatbot_scenario.option', 'Option') }}
              </button>
            </div>
            <div class="space-y-2">
              <div v-for="opt in nodeOptions" :key="opt.idOption" class="border border-gray-200 dark:border-slate-700 rounded-md p-3 bg-gray-50 dark:bg-slate-950 space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <label class="text-xs">
                    <span class="block text-gray-500 dark:text-slate-500 mb-0.5">{{ t('hub.ui.chatbot_scenario.lbl_position', 'Position') }}</span>
                    <input v-model.number="opt.position" type="number" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1" />
                  </label>
                  <label class="text-xs">
                    <span class="block text-gray-500 dark:text-slate-500 mb-0.5">→ next_node_key</span>
                    <input v-model="opt.nextNodeKey" type="text" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1 font-mono" :placeholder="t('hub.ui.chatbot_scenario.ph_node_key', 'ex: product_q1_name')" />
                  </label>
                </div>
                <label v-for="lang in [1, 2, 3]" :key="lang" class="block text-xs">
                  <span class="text-[10px] uppercase tracking-wider text-gray-400">{{ langLabel(lang) }}</span>
                  <input v-model="optionLangText(opt, lang).labelText" type="text" class="w-full text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-900 rounded px-2 py-1" :placeholder="t('hub.ui.chatbot_scenario.ph_button_label', 'Label du bouton')" />
                </label>
                <div class="flex gap-2 justify-end">
                  <button @click="saveOption(opt)" :disabled="saving" class="text-[10px] py-1 px-2 rounded bg-primary-600 text-white hover:bg-primary-700">
                    💾 {{ t('hub.ui.chatbot_scenario.save_short', 'Sauver') }}
                  </button>
                  <button @click="deleteOption(opt)" :disabled="saving" class="text-[10px] py-1 px-2 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400">
                    🗑
                  </button>
                </div>
              </div>
              <p v-if="nodeOptions.length === 0" class="text-xs text-gray-400 italic px-3 py-2">
                {{ t('hub.ui.chatbot_scenario.no_options', 'Pas encore d\'options. Cliquez sur « + Option » pour en ajouter.') }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
interface NodeLang { idLang: number; question: string; recapLabel: string }
interface OptionLang { idLang: number; labelText: string }
interface FlowNode {
  idNode: number; nodeKey: string; type: string; capture: string; nextQuestion: string
  terminal: boolean; scenarioRoot: string; position: number; langs: NodeLang[]
}
interface FlowOption { idOption: number; idNode: number; position: number; nextNodeKey: string; langs: OptionLang[] }

const { t } = useHubT()
const nodes = ref<FlowNode[]>([])
const options = ref<FlowOption[]>([])
const loading = ref(false)
const saving = ref(false)
const selectedScenario = ref<string>('global')
const selectedNode = ref<FlowNode | null>(null)
const creatingNode = ref(false)

const emptyForm = () => ({
  nodeKey: '', type: 'text', capture: '', nextQuestion: '', terminal: false,
  scenarioRoot: '', position: 0,
  langs: { 1: { question: '', recapLabel: '' }, 2: { question: '', recapLabel: '' }, 3: { question: '', recapLabel: '' } } as Record<number, { question: string; recapLabel: string }>,
})
const form = ref(emptyForm())

const scenarios = computed(() => {
  const counts: Record<string, number> = {}
  for (const n of nodes.value) counts[n.scenarioRoot || '_root'] = (counts[n.scenarioRoot || '_root'] || 0) + 1
  const order = ['global', 'product', 'pricing', 'order', 'human', '_root']
  const labels: Record<string, string> = {
    global: '🏠 ' + t('hub.ui.chatbot_scenario.sc_global', 'Accueil'), product: '📦 ' + t('hub.ui.chatbot_scenario.sc_product', 'Produit'), pricing: '💰 ' + t('hub.ui.chatbot_scenario.sc_pricing', 'Prix / devis'),
    order: '🚚 ' + t('hub.ui.chatbot_scenario.sc_order', 'Commande'), human: '🧑 ' + t('hub.ui.chatbot_scenario.sc_human', 'Humain'), _root: '🌐 ' + t('hub.ui.chatbot_scenario.sc_root', 'Hors scénario'),
  }
  const all = Array.from(new Set([...order, ...Object.keys(counts)]))
  return all.filter((k) => counts[k] !== undefined).map((k) => ({
    key: k, label: labels[k] || k, count: counts[k] || 0,
  }))
})

const visibleNodes = computed(() => {
  return nodes.value
    .filter((n) => (n.scenarioRoot || '_root') === selectedScenario.value)
    .sort((a, b) => a.position - b.position)
})

const nodeOptions = computed(() => {
  if (!selectedNode.value) return []
  return options.value
    .filter((o) => o.idNode === selectedNode.value!.idNode)
    .sort((a, b) => a.position - b.position)
})

function optionsForNode(idNode: number) {
  return options.value.filter((o) => o.idNode === idNode)
}

function getQuestion(n: FlowNode, idLang: number): string {
  return n.langs.find((l) => l.idLang === idLang)?.question || n.langs[0]?.question || ''
}

function truncateText(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function langLabel(idLang: number): string {
  return ({ 1: '🇫🇷 Français', 2: '🇬🇧 English', 3: '🇩🇪 Deutsch' } as Record<number, string>)[idLang] || `lang ${idLang}`
}

function selectNode(n: FlowNode) {
  selectedNode.value = n
  creatingNode.value = false
  form.value = {
    nodeKey: n.nodeKey, type: n.type, capture: n.capture, nextQuestion: n.nextQuestion,
    terminal: n.terminal, scenarioRoot: n.scenarioRoot, position: n.position,
    langs: {
      1: { question: getQuestion(n, 1), recapLabel: n.langs.find((l) => l.idLang === 1)?.recapLabel || '' },
      2: { question: getQuestion(n, 2), recapLabel: n.langs.find((l) => l.idLang === 2)?.recapLabel || '' },
      3: { question: getQuestion(n, 3), recapLabel: n.langs.find((l) => l.idLang === 3)?.recapLabel || '' },
    },
  }
}

function newNode() {
  selectedNode.value = null
  creatingNode.value = true
  form.value = emptyForm()
  form.value.scenarioRoot = selectedScenario.value === '_root' ? '' : selectedScenario.value
}

async function reload() {
  loading.value = true
  try {
    const data = await $fetch<{ nodes: FlowNode[]; options: FlowOption[] }>('/api/bo/chatbot/flow')
    nodes.value = data.nodes
    options.value = data.options
    if (selectedNode.value) {
      const updated = nodes.value.find((n) => n.idNode === selectedNode.value!.idNode)
      if (updated) selectNode(updated)
      else selectedNode.value = null
    }
  } finally { loading.value = false }
}

async function saveNode() {
  saving.value = true
  try {
    const payload = {
      nodeKey: form.value.nodeKey,
      type: form.value.type,
      capture: form.value.capture || null,
      nextQuestion: form.value.nextQuestion || null,
      terminal: form.value.terminal,
      scenarioRoot: form.value.scenarioRoot || null,
      position: form.value.position || 0,
      langs: [1, 2, 3].map((id) => ({
        idLang: id,
        question: form.value.langs[id]?.question || '',
        recapLabel: form.value.langs[id]?.recapLabel || null,
      })),
    }
    if (creatingNode.value) {
      const res = await $fetch<{ idNode: number }>('/api/bo/chatbot/node', { method: 'POST', body: payload })
      await reload()
      const created = nodes.value.find((n) => n.idNode === res.idNode)
      if (created) selectNode(created)
    } else {
      await $fetch(`/api/bo/chatbot/node/${selectedNode.value!.idNode}`, { method: 'PUT', body: payload })
      await reload()
    }
  } catch (err: any) {
    alert(t('hub.ui.chatbot_scenario.err_generic', 'Erreur : {msg}', { msg: err?.data?.message || err?.message || t('hub.ui.chatbot_scenario.err_unknown', 'inconnue') }))
  } finally { saving.value = false }
}

async function deleteNode() {
  if (!selectedNode.value) return
  if (!confirm(t('hub.ui.chatbot_scenario.confirm_delete_node', 'Supprimer le node "{key}" ?', { key: selectedNode.value.nodeKey }))) return
  saving.value = true
  try {
    await $fetch(`/api/bo/chatbot/node/${selectedNode.value.idNode}`, { method: 'DELETE' })
    selectedNode.value = null
    await reload()
  } catch (err: any) {
    alert(t('hub.ui.chatbot_scenario.err_generic', 'Erreur : {msg}', { msg: err?.data?.message || err?.message || t('hub.ui.chatbot_scenario.err_unknown', 'inconnue') }))
  } finally { saving.value = false }
}

async function newOption() {
  if (!selectedNode.value) return
  saving.value = true
  try {
    const nextPos = (nodeOptions.value.length || 0) + 1
    await $fetch('/api/bo/chatbot/option', {
      method: 'POST',
      body: {
        idNode: selectedNode.value.idNode,
        position: nextPos,
        nextNodeKey: nodes.value[0]?.nodeKey || 'global',
        langs: [{ idLang: 1, labelText: 'Nouveau bouton' }],
      },
    })
    await reload()
  } catch (err: any) {
    alert(t('hub.ui.chatbot_scenario.err_generic', 'Erreur : {msg}', { msg: err?.data?.message || err?.message || t('hub.ui.chatbot_scenario.err_unknown', 'inconnue') }))
  } finally { saving.value = false }
}

function optionLangText(opt: FlowOption, idLang: number) {
  let l = opt.langs.find((x) => x.idLang === idLang)
  if (!l) {
    l = { idLang, labelText: '' }
    opt.langs.push(l)
  }
  return l
}

async function saveOption(opt: FlowOption) {
  saving.value = true
  try {
    await $fetch(`/api/bo/chatbot/option/${opt.idOption}`, {
      method: 'PUT',
      body: {
        position: opt.position,
        nextNodeKey: opt.nextNodeKey,
        langs: [1, 2, 3].map((id) => ({ idLang: id, labelText: optionLangText(opt, id).labelText || '' })),
      },
    })
    await reload()
  } catch (err: any) {
    alert(t('hub.ui.chatbot_scenario.err_generic', 'Erreur : {msg}', { msg: err?.data?.message || err?.message || t('hub.ui.chatbot_scenario.err_unknown', 'inconnue') }))
  } finally { saving.value = false }
}

async function deleteOption(opt: FlowOption) {
  if (!confirm(t('hub.ui.chatbot_scenario.confirm_delete_option', 'Supprimer cette option ?'))) return
  saving.value = true
  try {
    await $fetch(`/api/bo/chatbot/option/${opt.idOption}`, { method: 'DELETE' })
    await reload()
  } catch (err: any) {
    alert(t('hub.ui.chatbot_scenario.err_generic', 'Erreur : {msg}', { msg: err?.data?.message || err?.message || t('hub.ui.chatbot_scenario.err_unknown', 'inconnue') }))
  } finally { saving.value = false }
}

onMounted(() => reload())
</script>
