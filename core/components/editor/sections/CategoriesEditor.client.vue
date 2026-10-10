
<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        {{ tHub('hub.ui.editor_categories_editor.title', 'Catégories ({count})', { count: items.length }) }}
      </span>
      <button @click="addItem" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {{ tHub('hub.ui.editor_categories_editor.add', 'Catégorie') }}
      </button>
    </div>

    <div v-for="(item, i) in items" :key="i" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div class="flex items-center gap-1 px-2.5 py-2 bg-gray-50/70 border-b border-gray-100">
        <button @click="moveItem(i, i - 1)" :disabled="i === 0"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
          </svg>
        </button>
        <button @click="moveItem(i, i + 1)" :disabled="i === items.length - 1"
          class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <button @click="expandedItem = expandedItem === i ? null : i" class="flex-1 flex items-center gap-2 px-1 text-left">
          <span class="text-xs font-semibold text-gray-800 truncate">{{ i18nt(item.label) || `${tHub('hub.ui.editor_categories_editor.item_n', 'Catégorie {n}', { n: i + 1 })}` }}</span>
          <span v-if="item._langs?.length" class="shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
            :title="tHub('hub.ui.editor_categories_editor.only_site_title', 'Visible uniquement sur le site {langs}', { langs: langsLabel(item._langs) })">
            {{ tHub('hub.ui.editor_categories_editor.only_lang', '{langs} seul.', { langs: langsLabel(item._langs) }) }}
          </span>
        </button>
        <button @click="removeItem(i)" class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" :title="tHub('hub.ui.editor_categories_editor.delete', 'Supprimer')">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="expandedItem === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      <div v-if="expandedItem === i" class="p-3 space-y-3">
        
        <p v-if="item._langs?.length" class="text-[11px] leading-snug text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
          {{ tHub('hub.ui.editor_categories_editor.only_site_note', 'Cette carte ne s\'affiche que sur le site {langs}. Elle n\'apparaît pas dans les autres langues.', { langs: langsLabel(item._langs) }) }}
        </p>
        
        <EditorImageField
          :label="tHub('hub.ui.editor_categories_editor.image_label', 'Image d\'ambiance')"
          :hint="tHub('hub.ui.editor_categories_editor.image_hint', 'photo éditoriale pleine carte')"
          :model-value="item._image_auto ? '' : item.image"
          :fallback-preview="item._image_auto ? item.image : null"
          :auto-cover="!!item._image_auto"
          dest="universe"
          placeholder="/universe/exemple.webp"
          :expected-size="mediaDimensionHint('categories', 'image', payload?.variant)"
          @update:model-value="updateItem(i, 'image', $event)"
        />
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_categories_editor.label', 'Libellé') }}</label>
          <EditorI18nField
            :model-value="item.label"
            :langs="langs"
            :placeholder="tHub('hub.ui.editor_categories_editor.label_ph', 'Ma catégorie')"
            @update:model-value="updateItem(i, 'label', $event)"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_categories_editor.link', 'Lien') }}</label>
          <input :value="item.href ?? ''" @input="updateItem(i, 'href', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="/categorie/exemple" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_categories_editor.tagline', 'Tagline') }} <span class="font-normal normal-case text-gray-400">{{ tHub('hub.ui.editor_categories_editor.tagline_opt', '(phrase éditoriale, optionnel)') }}</span></label>
          <EditorI18nField
            :model-value="item.tagline ?? item.description"
            :langs="langs"
            :placeholder="tHub('hub.ui.editor_categories_editor.tagline_ph', 'Une phrase courte qui présente la catégorie')"
            @update:model-value="updateItem(i, 'tagline', $event)"
          />
          <p class="text-[10px] text-gray-400 mt-1">{{ tHub('hub.ui.editor_categories_editor.tagline_hint', 'Affichée en bas de la carte image d\'ambiance. 1 ligne courte (~60 car.).') }}</p>
        </div>
      </div>
    </div>

    <p v-if="!items.length" class="text-xs text-gray-400 text-center py-4">{{ tHub('hub.ui.editor_categories_editor.empty', 'Aucune catégorie — cliquez sur + Catégorie') }}</p>
  </div>
</template>

<script setup lang="ts">
import type { ClientLang } from '~/server/api/client-langs.get'
import { mediaDimensionHint } from '~/utils/section-media-dimensions'
import { patchItemAt } from '~/utils/editor-item-patch'

const props = defineProps<{
  payload: any
  langs: ClientLang[]
}>()

const emit = defineEmits<{
  'update:payload': [value: any]
}>()

const { t: i18nt } = useI18nField()
const { t: tHub } = useHubT()

const langsLabel = (langs: string[]) => langs.map(l => l.toUpperCase()).join(' / ')

const localPayload = computed(() => props.payload ?? { items: [] })
const items = computed(() => localPayload.value.items ?? [])
const expandedItem = ref<number | null>(null)

function emitPayload(items: any[]) {
  emit('update:payload', { ...localPayload.value, items })
}

function updateItem(index: number, key: string, value: any) {
  
  
  
  emitPayload(patchItemAt(items.value, index, key, value))
}

function addItem() {
  const updated = [...items.value, { image: '', label: '', href: '' }]
  emitPayload(updated)
  expandedItem.value = updated.length - 1
}

function removeItem(index: number) {
  const updated = [...items.value]
  updated.splice(index, 1)
  emitPayload(updated)
  if (expandedItem.value === index) expandedItem.value = null
}

function moveItem(from: number, to: number) {
  if (to < 0 || to >= items.value.length) return
  const updated = [...items.value]
  const [item] = updated.splice(from, 1)
  updated.splice(to, 0, item)
  emitPayload(updated)
  expandedItem.value = to
}
</script>
