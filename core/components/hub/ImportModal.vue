<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    @click.self="close"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ title }}</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ subtitle }}</p>
        </div>
        <button @click="close" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      
      <div class="flex-1 overflow-auto px-6 py-5 space-y-5">

        
        <div v-if="!rawSheetRows.length && !importing && !result">
          <label
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
            :class="dragOver ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20' : 'border-gray-200 dark:border-slate-700'"
            class="block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary-400 transition-colors"
          >
            <svg class="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <p class="mt-3 text-sm text-gray-600 dark:text-slate-300">{{ t('hub.import.drop_zone_text') }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ t('hub.import.drop_zone_hint') }}</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              class="hidden"
              @change="onFileInput"
            />
          </label>
          <p v-if="fileTypeError" class="mt-2 text-[11px] text-red-600 flex items-start gap-1.5">
            <svg class="w-4 h-4 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            {{ fileTypeError }}
          </p>
          <p class="text-[11px] text-gray-400 mt-3">
            {{ t('hub.import.recognized_headers_label') }}
            <span class="font-mono">{{ recognizedHeaders }}</span>.
          </p>
          <p v-if="templateUrl" class="mt-3">
            <a
              :href="templateUrl"
              download
              class="inline-flex items-center gap-1.5 text-xs text-primary-700 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 underline-offset-2 hover:underline"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              {{ templateLabelText }}
            </a>
          </p>
        </div>

        
        <div v-else-if="rawSheetRows.length && !importing && !result" class="space-y-5">

          
          <div class="flex items-center justify-between bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800 rounded-lg px-4 py-3">
            <div>
              <p class="text-xs font-medium text-gray-800 dark:text-slate-100">{{ fileName }}</p>
              <p class="text-[11px] text-gray-400">{{ fileInfoText }}</p>
            </div>
            <button @click="reset" class="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 underline">
              {{ t('hub.import.change_file') }}
            </button>
          </div>

          
          <div
            v-if="rawSheetRows.length > 1"
            class="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 space-y-3"
          >
            <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">
              {{ t('hub.import.row_config_title') }}
            </h3>
            <div class="flex flex-wrap items-center gap-4">
              
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500 shrink-0">{{ t('hub.import.header_row_label') }}</label>
                <select
                  v-model.number="headerRow"
                  @change="applyHeaderConfig"
                  class="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                >
                  <option
                    v-for="(row, idx) in rawSheetRows.slice(0, 8)"
                    :key="idx"
                    :value="idx"
                  >
                    {{ t('hub.import.row_n', { n: idx + 1 }) }} — {{ row.slice(0, 3).join(' / ') }}{{ row.length > 3 ? '…' : '' }}
                  </option>
                </select>
              </div>
              
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500 shrink-0">{{ t('hub.import.data_start_row_label') }}</label>
                <select
                  v-model.number="dataStartRow"
                  @change="applyHeaderConfig"
                  class="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                >
                  <option
                    v-for="n in Math.min(rawSheetRows.length, 8)"
                    :key="n"
                    :value="n"
                    :disabled="n <= headerRow"
                  >
                    {{ t('hub.import.row_n', { n: n + 1 }) }}
                  </option>
                </select>
              </div>
            </div>
            <p class="text-[10px] text-gray-400">{{ t('hub.import.row_config_hint') }}</p>
          </div>

          
          <div
            v-if="entity && (savedMappings.length || loadingMappings)"
            class="flex items-center gap-3 bg-primary-50/40 dark:bg-primary-950/10 border border-primary-100 dark:border-primary-900/30 rounded-lg px-4 py-2.5"
          >
            <span class="text-xs text-gray-600 dark:text-slate-300 shrink-0">{{ t('hub.import.saved_mapping_label') }}</span>
            <select
              v-model.number="selectedMappingId"
              :disabled="loadingMappings"
              @change="applyMapping"
              class="flex-1 text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50"
            >
              <option :value="null">— {{ t('hub.import.no_mapping_selected') }} —</option>
              <option v-for="m in savedMappings" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <button
              v-if="selectedMappingId"
              @click="deleteSelectedMapping"
              class="text-[11px] text-red-400 hover:text-red-600 transition-colors shrink-0"
              :title="t('hub.import.delete_mapping')"
            >✕</button>
          </div>

          
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide">
                {{ t('hub.import.column_mapping_title') }}
              </h3>
              <span class="text-[10px] font-medium text-gray-400 dark:text-slate-500 shrink-0">
                {{ t('hub.import.mapped_count', { mapped: mappedCount, total: targetFields.length }) }}
              </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
              <div v-for="field in targetFields" :key="field.key" class="flex items-center gap-2">
                <label class="text-xs text-gray-500 dark:text-slate-400 w-32 shrink-0 truncate" :title="field.label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <select
                  v-model="mapping[field.key]"
                  class="flex-1 min-w-0 text-xs border rounded px-2 py-1.5 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-colors"
                  :class="mapping[field.key]
                    ? 'border-emerald-300 dark:border-emerald-800/60 text-gray-800 dark:text-slate-100'
                    : field.required
                      ? 'border-red-300 dark:border-red-900/50 text-gray-400 dark:text-slate-500'
                      : 'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500'"
                >
                  <option :value="undefined">— {{ t('hub.import.ignore') }} —</option>
                  <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
                </select>
                <span
                  v-if="autoMapped[field.key]"
                  class="text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 rounded px-1.5 py-0.5 shrink-0"
                  :title="t('hub.import.auto_mapped_tooltip')"
                >{{ t('hub.import.auto_badge') }}</span>
              </div>
            </div>
            <p v-if="!matchingKeyOK" class="text-[11px] text-red-600 mt-2">
              ⚠ {{ t('hub.import.matching_key_required', { keys: matchingKeysLabel }) }}
            </p>
          </div>

          
          <div>
            <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-200 uppercase tracking-wide mb-2">
              {{ t('hub.import.preview_title') }}
            </h3>
            <div class="overflow-auto border border-gray-100 dark:border-slate-800 rounded-lg">
              <table class="w-full text-xs">
                <thead class="bg-gray-50 dark:bg-slate-950/60">
                  <tr>
                    <th v-for="h in csvHeaders" :key="h" class="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                      {{ h }}
                      <span v-if="reverseMap[h]" class="text-[9px] text-primary-600 dark:text-primary-400 font-normal ml-1">→ {{ reverseMap[h] }}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in parsedRows.slice(0, 5)" :key="idx" class="border-t border-gray-100 dark:border-slate-800">
                    <td v-for="h in csvHeaders" :key="h" class="px-3 py-2 text-gray-700 dark:text-slate-200 whitespace-nowrap max-w-[200px] truncate" :title="String(row[h] ?? '')">
                      {{ row[h] ?? '' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          
          <div v-if="langOptions.length" class="flex items-center gap-3">
            <label class="text-xs font-medium text-gray-700 dark:text-slate-200 whitespace-nowrap">
              {{ t('hub.import.target_lang', 'Langue cible') }}
            </label>
            <select
              v-model.number="selectedLang"
              @change="langTouched = true"
              class="text-xs rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:ring-primary-500 focus:border-primary-500"
            >
              <option v-for="l in langOptions" :key="l.id" :value="l.id">{{ l.label }}</option>
            </select>
            <span class="text-[11px] text-gray-500 dark:text-slate-400">
              {{ t('hub.import.target_lang_hint', 'Les noms / descriptions sont importés dans cette langue.') }}
            </span>
          </div>

          
          <div v-if="allowCreateMissing" class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg px-4 py-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" v-model="createMissing" class="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <div class="flex-1">
                <p class="text-xs font-medium text-amber-900 dark:text-amber-200">{{ createMissingLabelText }}</p>
                <p class="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">{{ createMissingHintText }}</p>
              </div>
            </label>
          </div>

          
          <div v-if="entity" class="border-t border-gray-100 dark:border-slate-800 pt-3">
            <div v-if="!showSaveForm">
              <button
                @click="showSaveForm = true"
                class="text-[11px] text-primary-600 dark:text-primary-400 hover:underline"
              >
                + {{ t('hub.import.save_mapping_btn') }}
              </button>
            </div>
            <div v-else class="flex items-center gap-2 flex-wrap">
              <input
                v-model="saveMappingName"
                type="text"
                :placeholder="t('hub.import.save_mapping_placeholder')"
                class="flex-1 min-w-0 text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                @keydown.enter="saveCurrentMapping"
                @keydown.escape="showSaveForm = false"
              />
              <button
                @click="saveCurrentMapping"
                :disabled="!saveMappingName.trim() || savingMapping"
                class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium shrink-0"
              >
                {{ savingMapping ? t('hub.import.saving') : t('hub.import.save_btn') }}
              </button>
              <button
                @click="showSaveForm = false"
                class="text-xs text-gray-400 hover:text-gray-600 shrink-0"
              >
                {{ t('hub.import.cancel') }}
              </button>
            </div>
            <p v-if="saveError" class="text-[11px] text-red-600 mt-1">{{ saveError }}</p>
          </div>
        </div>

        
        <div v-else-if="importing" class="py-12 text-center">
          <svg class="w-10 h-10 mx-auto animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
          <p class="text-sm text-gray-600 dark:text-slate-300 mt-3">
            {{ t('hub.import.importing', { n: parsedRows.length }) }}
          </p>
        </div>

        
        <div v-else-if="result" class="space-y-4">
          <div class="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg p-4">
            <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{{ t('hub.import.done_title') }}</p>
            <div class="grid grid-cols-4 gap-2 mt-3 text-center">
              <div>
                <p class="text-xl font-bold text-gray-800 dark:text-slate-100">{{ result.stats.total }}</p>
                <p class="text-[10px] uppercase tracking-wide text-gray-400">{{ t('hub.import.stat_total') }}</p>
              </div>
              <div>
                <p class="text-xl font-bold text-emerald-600 dark:text-emerald-400">{{ result.stats.updated }}</p>
                <p class="text-[10px] uppercase tracking-wide text-gray-400">{{ t('hub.import.stat_updated') }}</p>
              </div>
              <div>
                <p class="text-xl font-bold text-blue-600 dark:text-blue-400">{{ result.stats.created }}</p>
                <p class="text-[10px] uppercase tracking-wide text-gray-400">{{ t('hub.import.stat_created') }}</p>
              </div>
              <div>
                <p class="text-xl font-bold text-amber-600 dark:text-amber-400">{{ result.stats.skipped }}</p>
                <p class="text-[10px] uppercase tracking-wide text-gray-400">{{ t('hub.import.stat_skipped') }}</p>
              </div>
            </div>
          </div>
          
          <div
            v-if="allowCreateMissing && !createMissing && result.stats.skipped > 0 && result.stats.created === 0 && result.stats.updated === 0"
            class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-4"
          >
            <p class="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {{ t('hub.import.all_skipped_title', { n: result.stats.skipped }) }}
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {{ t('hub.import.all_skipped_hint') }}
            </p>
            <button
              @click="retryWithCreate"
              class="mt-3 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              {{ t('hub.import.all_skipped_retry') }}
            </button>
          </div>

          <div v-if="result.stats.errors?.length" class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg p-4">
            <p class="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
              {{ result.stats.errors.length }} {{ t('hub.import.errors_label') }}
            </p>
            <ul class="text-[11px] text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-auto">
              <li v-for="(e, i) in result.stats.errors.slice(0, 20)" :key="i">
                {{ t('hub.import.error_row', { row: e.row }) }} : {{ e.reason }}
              </li>
            </ul>
          </div>
        </div>

      </div>

      
      <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-gray-50/50 dark:bg-slate-950/40">
        <button
          v-if="!importing"
          @click="close"
          class="text-xs px-4 py-2 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 transition-colors"
        >
          {{ result ? t('hub.import.btn_close') : t('hub.import.btn_cancel') }}
        </button>
        <button
          v-if="parsedRows.length && !importing && !result"
          @click="runImport"
          :disabled="!matchingKeyOK"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ t('hub.import.btn_import', { n: parsedRows.length, s: parsedRows.length > 1 ? 's' : '' }) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import type { ImportMapping } from '~/server/utils/import-mapping'

interface TargetField {
  key: string
  label: string
  required?: boolean
}

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  subtitle: string
  
  endpoint: string
  targetFields: TargetField[]
  fieldAliases: Record<string, string[]>
  
  matchingKeys: string[]
  allowCreateMissing?: boolean
  createMissingLabel?: string
  createMissingHint?: string
  

  entity?: string
  

  xlsxHeaderRow?: number
  

  xlsxDataStartRow?: number
  

  templateUrl?: string
  templateLabel?: string
  

  langOptions?: Array<{ id: number; label: string }>
  
  defaultLang?: number
}>(), {
  allowCreateMissing: true,
  createMissingLabel: 'Créer les lignes manquantes',
  createMissingHint: 'Insère une nouvelle ligne si la clé (référence/email/slug/nom) n\'existe pas encore. Désactivé par défaut pour rester safe.',
  entity: '',
  xlsxHeaderRow: 0,
  xlsxDataStartRow: 1,
  templateUrl: '',
  templateLabel: 'Télécharger le modèle CSV',
  langOptions: () => [],
  defaultLang: 0,
})

const emit = defineEmits<{ close: []; done: [stats: any] }>()

const { t } = useT()

const { t: tHub } = useHubT()

const createMissingLabelText = computed(() => {
  switch (props.createMissingLabel) {
    case 'Créer les lignes manquantes': return tHub('hub.ui.import_modal.create_missing_rows', 'Créer les lignes manquantes')
    case 'Créer les fournisseurs manquants': return tHub('hub.ui.import_modal.create_missing_suppliers', 'Créer les fournisseurs manquants')
    case 'Créer les articles manquants': return tHub('hub.ui.import_modal.create_missing_articles', 'Créer les articles manquants')
    default: return props.createMissingLabel
  }
})
const createMissingHintText = computed(() =>
  props.createMissingHint === 'Insère une nouvelle ligne si la clé (référence/email/slug/nom) n\'existe pas encore. Désactivé par défaut pour rester safe.'
    ? tHub('hub.ui.import_modal.create_missing_hint', 'Insère une nouvelle ligne si la clé (référence/email/slug/nom) n\'existe pas encore. Désactivé par défaut pour rester safe.')
    : props.createMissingHint,
)
const templateLabelText = computed(() =>
  props.templateLabel === 'Télécharger le modèle CSV'
    ? tHub('hub.ui.import_modal.template_label', 'Télécharger le modèle CSV')
    : props.templateLabel,
)

const dragOver      = ref(false)
const fileName      = ref('')
const fileType      = ref<'csv' | 'xlsx' | ''>('')
const detectedSep   = ref(',')
const fileTypeError = ref('')

const SUPPORTED_EXTS = ['csv', 'xlsx', 'xls']

const rawSheetRows = ref<string[][]>([])

const headerRow   = ref(0)

const dataStartRow = ref(1)

const csvHeaders = ref<string[]>([])
const parsedRows = ref<Record<string, string>[]>([])

const mapping    = reactive<Record<string, string | undefined>>({})
const autoMapped = reactive<Record<string, boolean>>({})
const createMissing = ref(false)
const importing  = ref(false)
const result     = ref<any>(null)

const selectedLang = ref<number>(
  props.defaultLang || props.langOptions[0]?.id || 1
)

const langTouched = ref(false)
watch(
  () => [props.langOptions, props.defaultLang] as const,
  () => {
    if (langTouched.value || !props.langOptions.length) return
    const target = props.defaultLang || props.langOptions[0]?.id || 1
    if (props.langOptions.some((l) => l.id === target)) selectedLang.value = target
  },
  { immediate: true, deep: true },
)

const savedMappings     = ref<ImportMapping[]>([])
const selectedMappingId = ref<number | null>(null)
const loadingMappings   = ref(false)

const showSaveForm    = ref(false)
const saveMappingName = ref('')
const savingMapping   = ref(false)
const saveError       = ref('')

function initMapping() {
  for (const f of props.targetFields) mapping[f.key] = undefined
}
initMapping()

const recognizedHeaders = computed(() =>
  props.targetFields.map(f => f.label.toLowerCase()).join(', ')
)

const matchingKeysLabel = computed(() => {
  const labels = props.matchingKeys
    .map(k => props.targetFields.find(f => f.key === k)?.label || k)
  if (labels.length <= 1) return labels[0] || ''
  return labels.slice(0, -1).join(', ') + ' ou ' + labels[labels.length - 1]
})

const reverseMap = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  for (const f of props.targetFields) {
    const col = mapping[f.key]
    if (col) m[col] = f.label
  }
  return m
})

const matchingKeyOK = computed(() => props.matchingKeys.some(k => !!mapping[k]))

const mappedCount = computed(() => props.targetFields.filter(f => !!mapping[f.key]).length)

const fileInfoText = computed(() => {
  const n = parsedRows.value.length
    if (fileType.value === 'csv') {
    return n > 1
      ? tHub('hub.ui.import_modal.file_info_csv_other', '{count} lignes détectées — séparateur {sep}', { count: n, sep: detectedSep.value })
      : tHub('hub.ui.import_modal.file_info_csv_one', '{count} ligne détectée — séparateur {sep}', { count: n, sep: detectedSep.value })
  }
  return n > 1
    ? tHub('hub.ui.import_modal.file_info_xlsx_other', '{count} lignes détectées — Excel', { count: n })
    : tHub('hub.ui.import_modal.file_info_xlsx_one', '{count} ligne détectée — Excel', { count: n })
})

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[_\-\s]+/g, ' ')
    .trim()
}

function runAutoMap(headers: string[]) {
  for (const k of Object.keys(mapping)) mapping[k] = undefined
  for (const k of Object.keys(autoMapped)) delete autoMapped[k]

  for (const header of headers) {
    const norm = normalize(header)
    for (const [field, aliases] of Object.entries(props.fieldAliases)) {
      if (mapping[field]) continue
      if (aliases.some(a => normalize(a) === norm)) {
        mapping[field] = header
        autoMapped[field] = true
        break
      }
    }
  }
}

function applyHeaderConfig() {
  const raw = rawSheetRows.value
  if (!raw.length) return

  const hIdx = Math.max(0, Math.min(headerRow.value, raw.length - 1))
  const dIdx = Math.max(hIdx + 1, dataStartRow.value)

  
  
  const rawHeaders = (raw[hIdx] || []).map(c => String(c ?? '').trim())
  
  const headers = rawHeaders.filter(Boolean)

  csvHeaders.value = headers

  
  parsedRows.value = raw.slice(dIdx)
    .filter(row => row.some(c => String(c ?? '').trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {}
      rawHeaders.forEach((h, i) => {
        if (h) obj[h] = String(row[i] ?? '').trim()
      })
      return obj
    })

  
  runAutoMap(headers)

  
  
  
  
  
  
  
  
  
  
  if (hIdx > 0 && raw[0]) {
    const cibleRow = raw[0]
    for (let i = 0; i < cibleRow.length; i++) {
      const key = String(cibleRow[i] ?? '').trim()
      if (!key || !rawHeaders[i]) continue
      
      if (Object.prototype.hasOwnProperty.call(mapping, key) && !mapping[key]) {
        mapping[key] = rawHeaders[i]
        autoMapped[key] = true
        continue
      }
      
      const normKey = normalize(key)
      for (const [field, aliases] of Object.entries(props.fieldAliases)) {
        if (mapping[field]) continue
        if (aliases.some(a => normalize(a) === normKey)) {
          mapping[field] = rawHeaders[i]
          autoMapped[field] = true
          break
        }
      }
    }
  }
}

function parseRawCSV(text: string): { rawRows: string[][]; sep: string } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const countSemi  = (firstLine.match(/;/g)  || []).length
  const countComma = (firstLine.match(/,/g)  || []).length
  const sep = countSemi > countComma ? ';' : ','

  const records: string[][] = []
  let cur: string[] = []
  let field = ''
  let i = 0
  let inQuotes = false

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === sep)  { cur.push(field); field = ''; i++; continue }
    if (ch === '\r') { i++; continue }
    if (ch === '\n') { cur.push(field); records.push(cur); cur = []; field = ''; i++; continue }
    field += ch; i++
  }
  if (field.length || cur.length) { cur.push(field); records.push(cur) }

  
  if (records.length && records[records.length - 1].every(c => c === '')) records.pop()

  return { rawRows: records, sep }
}

async function parseRawXLSX(file: File): Promise<string[][]> {
  const xlsx = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = xlsx.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return []
  const allRows = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  return allRows.map(row =>
    (row as unknown[]).map(c => String(c ?? '').trim())
  )
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) handleFile(f)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (f) handleFile(f)
}

async function handleFile(f: File) {
  fileTypeError.value = ''
  fileName.value = f.name
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''

  if (!SUPPORTED_EXTS.includes(ext)) {
    let hint = ''
    if (ext === 'numbers') hint = ' ' + t('hub.import.numbers_export_hint', '(Dans Numbers : Fichier → Exporter vers → CSV ou Excel)')
    else if (ext === 'ods') hint = ' ' + t('hub.import.ods_export_hint', '(Dans LibreOffice : Fichier → Enregistrer sous → .csv ou .xlsx)')
    fileTypeError.value = t('hub.import.unsupported_format', `Le format .${ext} n'est pas supporté. Veuillez utiliser CSV ou XLSX.`) + hint
    return
  }

  if (ext === 'xlsx' || ext === 'xls') {
    fileType.value = 'xlsx'
    rawSheetRows.value = await parseRawXLSX(f)
    
    headerRow.value   = props.xlsxHeaderRow
    dataStartRow.value = props.xlsxDataStartRow > props.xlsxHeaderRow
      ? props.xlsxDataStartRow
      : props.xlsxHeaderRow + 1
  } else {
    fileType.value = 'csv'
    const { rawRows, sep } = parseRawCSV(await f.text())
    rawSheetRows.value = rawRows
    detectedSep.value  = sep
    headerRow.value    = 0
    dataStartRow.value = 1
  }

  applyHeaderConfig()
}

async function runImport() {
  importing.value = true
  try {
    const cleanMapping: Record<string, string> = {}
    for (const [k, v] of Object.entries(mapping)) if (v) cleanMapping[k] = v

    const res = await $fetch<any>(props.endpoint, {
      method: 'POST',
      body: {
        rows: parsedRows.value,
        mapping: cleanMapping,
        createMissing: createMissing.value,
        ...(props.langOptions.length ? { idLang: selectedLang.value } : {}),
      },
    })
    result.value = res
    emit('done', res?.stats)
  } catch (err: any) {
    result.value = {
      stats: {
        total: parsedRows.value.length,
        updated: 0, created: 0, skipped: 0,
        errors: [{ row: 0, reason: err?.data?.message || err?.data?.statusMessage || err?.message || 'Erreur inconnue' }],
      },
    }
  } finally {
    importing.value = false
  }
}

async function loadSavedMappings() {
  if (!props.entity) return
  loadingMappings.value = true
  try {
    const data = await $fetch<{ mappings: ImportMapping[] }>('/api/bo/import-mapping', {
      query: { entity: props.entity },
    })
    savedMappings.value = data?.mappings ?? []
  } catch {
    savedMappings.value = []
  } finally {
    loadingMappings.value = false
  }
}

async function applyMapping() {
  if (!selectedMappingId.value) {
    
    runAutoMap(csvHeaders.value)
    return
  }
  try {
    const m = await $fetch<ImportMapping>('/api/bo/import-mapping', {
      query: { id: selectedMappingId.value },
    })
    if (!m) return

    
    const newHeaderRow    = m.headerRow    ?? 0
    const newDataStartRow = m.dataStartRow ?? 1
    headerRow.value    = newHeaderRow
    dataStartRow.value = newDataStartRow
    if (rawSheetRows.value.length) applyHeaderConfig()

    
    for (const k of Object.keys(mapping)) mapping[k] = undefined
    for (const k of Object.keys(autoMapped)) delete autoMapped[k]
    for (const [k, v] of Object.entries(m.mappingJson)) {
      if (Object.prototype.hasOwnProperty.call(mapping, k)) {
        mapping[k] = v
      }
    }
  } catch {
    
  }
}

async function deleteSelectedMapping() {
  if (!selectedMappingId.value) return
  const id = selectedMappingId.value
  try {
    await $fetch(`/api/bo/import-mapping/${id}`, { method: 'DELETE' })
    savedMappings.value     = savedMappings.value.filter(m => m.id !== id)
    selectedMappingId.value = null
  } catch {
    
  }
}

async function saveCurrentMapping() {
  if (!saveMappingName.value.trim() || !props.entity) return
  savingMapping.value = true
  saveError.value = ''
  try {
    const cleanMapping: Record<string, string> = {}
    for (const [k, v] of Object.entries(mapping)) if (v) cleanMapping[k] = v

    const saved = await $fetch<ImportMapping>('/api/bo/import-mapping', {
      method: 'POST',
      body: {
        entity:       props.entity,
        name:         saveMappingName.value.trim(),
        mappingJson:  cleanMapping,
        headerRow:    headerRow.value,
        dataStartRow: dataStartRow.value,
      },
    })

    
    const idx = savedMappings.value.findIndex(m => m.id === saved.id)
    if (idx >= 0) savedMappings.value[idx] = saved
    else savedMappings.value.push(saved)

    selectedMappingId.value = saved.id
    showSaveForm.value  = false
    saveMappingName.value = ''
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || tHub('hub.ui.import_modal.save_error', 'Erreur lors de la sauvegarde')
  } finally {
    savingMapping.value = false
  }
}

function retryWithCreate() {
  createMissing.value = true
  result.value = null
  runImport()
}

function reset() {
  fileName.value    = ''
  fileType.value    = ''
  fileTypeError.value = ''
  rawSheetRows.value = []
  csvHeaders.value  = []
  parsedRows.value  = []
  detectedSep.value = ','
  headerRow.value   = 0
  dataStartRow.value = 1
  result.value      = null
  createMissing.value = false
  showSaveForm.value  = false
  saveMappingName.value = ''
  saveError.value    = ''
  selectedMappingId.value = null
  initMapping()
  for (const k of Object.keys(autoMapped)) delete autoMapped[k]
}

function close() {
  reset()
  emit('close')
}

watch(() => props.open, (v) => {
  if (!v) {
    reset()
  } else {
    loadSavedMappings()
  }
})

watch(() => props.targetFields, () => { initMapping() }, { deep: true })
</script>
