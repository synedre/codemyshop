
<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        {{ tHub('hub.ui.editor_narrative_blocks_editor.blocks_count', 'Blocs ({count})', { count: blocks.length }) }}
      </span>
      <button @click="addBlock" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {{ tHub('hub.ui.editor_narrative_blocks_editor.block_btn', 'Bloc') }}
      </button>
    </div>

    <div v-for="(block, i) in blocks" :key="i" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div class="flex items-center gap-1 px-2.5 py-2 bg-gray-50/70 border-b border-gray-100">
        <button @click="moveBlock(i, i - 1)" :disabled="i === 0"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
          </svg>
        </button>
        <button @click="moveBlock(i, i + 1)" :disabled="i === blocks.length - 1"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <button @click="expandedBlock = expandedBlock === i ? null : i" class="flex-1 flex items-center gap-2 px-1 text-left">
          <span class="text-xs font-semibold text-gray-800 truncate">{{ i18nt(block.title) || tHub('hub.ui.editor_narrative_blocks_editor.block_n', 'Bloc {n}', { n: i + 1 }) }}</span>
        </button>
        <button @click="removeBlock(i)" class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" :title="tHub('hub.ui.editor_narrative_blocks_editor.delete', 'Supprimer')">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="expandedBlock === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      <div v-if="expandedBlock === i" class="p-3 space-y-3">
        <div v-if="showSide">
          <label class="field-label">{{ tHub('hub.ui.editor_narrative_blocks_editor.image_side', 'Côté de l\'image') }}</label>
          <div class="flex gap-2">
            <button
              type="button"
              @click="updateBlock(i, 'reverse', false)"
              class="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              :class="!block.reverse ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
            >
              {{ tHub('hub.ui.editor_narrative_blocks_editor.image_left', 'Image à gauche') }}
            </button>
            <button
              type="button"
              @click="updateBlock(i, 'reverse', true)"
              class="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              :class="block.reverse ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
            >
              {{ tHub('hub.ui.editor_narrative_blocks_editor.image_right', 'Image à droite') }}
            </button>
          </div>
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_narrative_blocks_editor.image', 'Image') }}</label>
          <EditorExpectedSize :size="mediaDimensionHint(sectionType, 'image', payload?.variant)" :url="block.image" />
          <div class="flex gap-2">
            <input :value="block.image ?? ''" @input="updateBlock(i, 'image', ($event.target as HTMLInputElement).value)"
              type="text" class="field flex-1" placeholder="/img/narratif/sourcing.jpg" />
            <button
              @click="($refs['blockUpload' + i] as HTMLInputElement)?.click()"
              :disabled="uploading === 'block-' + i"
              class="shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 disabled:opacity-50 transition-colors"
            >
              {{ uploading === 'block-' + i ? '…' : tHub('hub.ui.editor_narrative_blocks_editor.upload', 'Upload') }}
            </button>
            <input :ref="'blockUpload' + i" type="file" accept="image/png,image/jpeg,image/webp" class="hidden"
              @change="handleUpload($event, i)" />
          </div>
          <p v-if="uploadError && uploading === null" class="text-[10px] text-red-500 mt-1">{{ uploadError }}</p>
          <div v-if="block.image" class="mt-1.5 h-16 rounded-lg overflow-hidden bg-gray-100">
            <img :src="block.image" :alt="tHub('hub.ui.editor_narrative_blocks_editor.preview', 'Aperçu')" class="h-full w-full object-cover" />
          </div>
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_narrative_blocks_editor.kicker', 'Kicker') }}</label>
          <EditorI18nField
            :model-value="block.kicker"
            :langs="langs"
            :placeholder="tHub('hub.ui.editor_narrative_blocks_editor.kicker_ph', 'Sourcing direct')"
            @update:model-value="updateBlock(i, 'kicker', $event)"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_narrative_blocks_editor.title', 'Titre') }}</label>
          <EditorI18nField
            :model-value="block.title"
            :langs="langs"
            :placeholder="tHub('hub.ui.editor_narrative_blocks_editor.title_ph', 'De l\'origine au sachet')"
            @update:model-value="updateBlock(i, 'title', $event)"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_narrative_blocks_editor.text', 'Texte') }}</label>
          <EditorI18nField
            :model-value="block.text"
            :langs="langs"
            type="textarea"
            :placeholder="tHub('hub.ui.editor_narrative_blocks_editor.text_ph', 'Description du bloc')"
            @update:model-value="updateBlock(i, 'text', $event)"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_narrative_blocks_editor.cta_text', 'CTA (texte)') }}</label>
            <EditorI18nField
              :model-value="block.cta_label"
              :langs="langs"
              :placeholder="tHub('hub.ui.editor_narrative_blocks_editor.cta_text_ph', 'En savoir plus')"
              @update:model-value="updateBlock(i, 'cta_label', $event)"
            />
          </div>
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_narrative_blocks_editor.cta_link', 'CTA (lien)') }}</label>
            <input :value="block.cta_to ?? ''" @input="updateBlock(i, 'cta_to', ($event.target as HTMLInputElement).value)"
              type="text" class="field" placeholder="/page/notre-demarche" />
          </div>
        </div>

        
        <div class="px-3 pb-3">
          <button
            type="button"
            class="w-full text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 py-1"
            @click="vitrineOuverte[i] = !vitrineOuverte[i]"
          >
            {{ vitrineOuverte[i] ? '▾' : '▸' }}
            {{ t('builder.products.legend', 'Produits mis en avant') }}
            <span v-if="nbProduits(block)" class="text-primary-600">({{ nbProduits(block) }})</span>
          </button>

          <div v-if="vitrineOuverte[i]" class="space-y-2 pt-1">
            <EditorProductPicker
              :model-value="block.products?.product_ids ?? []"
              @update:model-value="updateVitrine(i, 'product_ids', $event)"
            />
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="field-label">{{ t('builder.products.category', 'Catégorie (repli)') }}</label>
                <input
                  :value="block.products?.id_category ?? ''"
                  type="number" class="field" placeholder="—"
                  @input="updateVitrine(i, 'id_category', numeroOuVide(($event.target as HTMLInputElement).value))"
                />
              </div>
              <div>
                <label class="field-label">{{ t('builder.products.limit', 'Nombre affiché') }}</label>
                <input
                  :value="block.products?.limit ?? ''"
                  type="number" min="1" max="12" class="field" placeholder="3"
                  @input="updateVitrine(i, 'limit', numeroOuVide(($event.target as HTMLInputElement).value))"
                />
              </div>
            </div>
            <p class="text-[10px] text-gray-400">
              {{ t('builder.products.hint', 'Sans produit choisi, la vitrine suit la catégorie. L’ordre ci-dessus est celui de l’affichage.') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <p v-if="!blocks.length" class="text-xs text-gray-400 text-center py-4">{{ tHub('hub.ui.editor_narrative_blocks_editor.empty', 'Aucun bloc — cliquez sur + Bloc') }}</p>
  </div>
</template>

<script setup lang="ts">
import type { ClientLang } from '~/server/api/client-langs.get'
import { mediaDimensionHint } from '~/utils/section-media-dimensions'

const props = withDefaults(defineProps<{
  payload: any
  langs: ClientLang[]
  
  showSide?: boolean
  

  sectionType?: string
}>(), {
  showSide: false,
  sectionType: 'narrative-blocks',
})

const emit = defineEmits<{
  'update:payload': [value: any]
}>()

const { t: i18nt } = useI18nField()
const { t: tHub } = useHubT()

const localPayload = computed(() => props.payload ?? { blocks: [] })
const blocks = computed(() => localPayload.value.blocks ?? [])
const expandedBlock = ref<number | null>(null)
const uploading = ref<string | null>(null)
const uploadError = ref('')

async function handleUpload(e: Event, index: number) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const key = `block-${index}`
  uploading.value = key
  uploadError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'narratif')
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', {
      method: 'POST',
      body: fd,
    })
    if (res?.url) updateBlock(index, 'image', res.url)
  } catch (err: any) {
    uploadError.value = err?.data?.message || err?.message || tHub('hub.ui.editor_narrative_blocks_editor.upload_error', 'Erreur upload')
  } finally {
    uploading.value = null
    ;(e.target as HTMLInputElement).value = ''
  }
}

function emitPayload(blocks: any[]) {
  emit('update:payload', { ...localPayload.value, blocks })
}

function updateBlock(index: number, key: string, value: any) {
  const updated = [...blocks.value]
  updated[index] = { ...updated[index], [key]: value }
  emitPayload(updated)
}

const { t } = useT()
const vitrineOuverte = ref<Record<number, boolean>>({})

function nbProduits(block: any): number {
  return Array.isArray(block?.products?.product_ids) ? block.products.product_ids.length : 0
}

function numeroOuVide(v: string): number | undefined {
  const n = Number(v)
  return v.trim() === '' || !Number.isFinite(n) || n <= 0 ? undefined : n
}

function updateVitrine(index: number, key: string, value: any) {
  const courant = blocks.value[index]?.products ?? {}
  const suite: Record<string, any> = { ...courant, [key]: value }
  
  
  if (value === undefined || (Array.isArray(value) && !value.length)) delete suite[key]
  
  
  
  updateBlock(index, 'products', Object.keys(suite).length ? suite : null)
}

function addBlock() {
  const updated = [...blocks.value, { image: '', kicker: '', title: '', text: '', cta_label: '', cta_to: '' }]
  emitPayload(updated)
  expandedBlock.value = updated.length - 1
}

function removeBlock(index: number) {
  const updated = [...blocks.value]
  updated.splice(index, 1)
  emitPayload(updated)
  if (expandedBlock.value === index) expandedBlock.value = null
}

function moveBlock(from: number, to: number) {
  if (to < 0 || to >= blocks.value.length) return
  const updated = [...blocks.value]
  const [item] = updated.splice(from, 1)
  updated.splice(to, 0, item)
  emitPayload(updated)
  expandedBlock.value = to
}
</script>
