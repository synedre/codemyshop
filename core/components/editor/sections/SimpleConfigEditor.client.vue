
<template>
  <div class="space-y-3">

    <fieldset v-if="textFields.length" class="border border-gray-200 rounded-xl p-3 space-y-3">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_simple_config_editor.contents', 'Contenus') }}</legend>
      <div v-for="field in textFields" :key="field.path.join('.')">
        <label class="field-label">{{ fieldLabel(field) }}</label>
        <EditorI18nField
          :model-value="field.value"
          :langs="langs"
          :type="isLongText(field) ? 'textarea' : 'text'"
          :placeholder="fieldLabel(field)"
          @update:model-value="updateText(field.path, $event)"
        />
      </div>
    </fieldset>

    
    <fieldset v-if="mediaFields.length" class="border border-gray-200 rounded-xl p-3 space-y-3">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
        {{ t('builder.media.legend', 'Photos') }}
      </legend>
      <template v-for="field in mediaFields" :key="field.path.join('.')">
        
        <div v-if="field.isVideo">
          <label class="field-label">{{ mediaLabel(field) }}</label>
          <input
            :value="field.value"
            type="text" class="field"
            placeholder="/static/uploads/…"
            @input="updateMedia(field.path, ($event.target as HTMLInputElement).value)" />
        </div>
        <EditorImageField
          v-else
          :label="mediaLabel(field)"
          :model-value="field.value"
          :dest="sectionType"
          :expected-size="mediaDimensionHint(sectionType, field.key, localPayload.variant)"
          @update:model-value="updateMedia(field.path, $event)"
        />
      </template>
    </fieldset>

    
    <fieldset v-if="linkFields.length" class="border border-gray-200 rounded-xl p-3 space-y-3">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
        {{ t('builder.link.legend', 'Liens') }}
      </legend>
      <EditorLinkField
        v-for="field in linkFields"
        :key="field.path.join('.')"
        :label="linkLabel(field)"
        :model-value="field.value"
        @update:model-value="updateLink(field.path, $event)"
      />
    </fieldset>

    
    <fieldset v-if="hasLimit" class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_simple_config_editor.display', 'Affichage') }}</legend>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_simple_config_editor.limit', 'Nombre de produits affichés') }}</label>
        <input
          :value="localPayload.limit ?? 8"
          @input="updateField('limit', Number(($event.target as HTMLInputElement).value))"
          type="number" min="1" max="50" class="field" />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_simple_config_editor.featured_side', 'Côté du produit mis en avant') }}</label>
        <div class="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            type="button"
            @click="updateField('featuredPosition', 'left')"
            :class="[
              'flex-1 py-1.5 font-medium transition-colors',
              currentFeaturedPosition === 'left'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            ]"
          >{{ tHub('hub.ui.editor_simple_config_editor.left', '← Gauche') }}</button>
          <button
            type="button"
            @click="updateField('featuredPosition', 'right')"
            :class="[
              'flex-1 py-1.5 font-medium transition-colors',
              currentFeaturedPosition === 'right'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            ]"
          >{{ tHub('hub.ui.editor_simple_config_editor.right', 'Droite →') }}</button>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">{{ tHub('hub.ui.editor_simple_config_editor.featured_hint', 'Le produit phare (carte large) sera placé de ce côté ; les 4 autres sur la grille opposée.') }}</p>
      </div>
    </fieldset>

    
    <fieldset v-if="sectionType === 'instagram'" class="border border-gray-200 rounded-xl p-3 space-y-2">
      <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Instagram</legend>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_simple_config_editor.ig_link', 'Lien Instagram') }}</label>
        <input
          :value="localPayload.url ?? ''"
          @input="updateField('url', ($event.target as HTMLInputElement).value)"
          type="url" class="field" placeholder="https://instagram.com/mon-compte" />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_simple_config_editor.ig_handle', 'Handle (@)') }}</label>
        <input
          :value="localPayload.handle ?? ''"
          @input="updateField('handle', ($event.target as HTMLInputElement).value)"
          type="text" class="field" placeholder="@mon_compte" />
      </div>
    </fieldset>

    
    <div v-if="!hasLimit && sectionType !== 'instagram' && !textFields.length && !mediaFields.length && !linkFields.length" class="py-6 text-center">
      <p class="text-xs text-gray-400">{{ tHub('hub.ui.editor_simple_config_editor.no_config', 'Cette section n\'a pas de configuration avancée.') }}</p>
      <p class="text-[10px] text-gray-300 mt-1">{{ tHub('hub.ui.editor_simple_config_editor.no_config_hint', 'Vous pouvez modifier son titre et sous-titre ci-dessus.') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { listSectionTextFields, setSectionTextValue, type SectionTextField, type SectionTextPath } from '~/utils/section-text-fields'
import { listSectionMediaFields, setSectionMediaValue, type SectionMediaField, type SectionMediaPath } from '~/utils/section-media-fields'
import { listSectionLinkFields, setSectionLinkValue, type SectionLinkField, type SectionLinkPath } from '~/utils/section-link-fields'
import { mediaDimensionHint } from '~/utils/section-media-dimensions'

interface ClientLang { id_lang: number; iso_code: string; name: string; is_default: boolean }

const props = defineProps<{
  payload: any
  sectionType: string
  langs?: ClientLang[]
}>()

const emit = defineEmits<{
  'update:payload': [value: any]
}>()

const localPayload = computed(() => props.payload ?? {})
const langs = computed(() => props.langs?.length
  ? props.langs
  : [{ id_lang: 1, iso_code: 'fr', name: 'Français', is_default: true }])
const textFields = computed(() => listSectionTextFields(localPayload.value))
const mediaFields = computed(() => listSectionMediaFields(localPayload.value))
const linkFields = computed(() => listSectionLinkFields(localPayload.value))
const { t } = useT()
const { t: tHub } = useHubT()

const LABELS = computed<Record<string, string>>(() => ({
  alt: tHub('hub.ui.editor_simple_config_editor.lbl_alt', 'Texte alternatif'),
  author: tHub('hub.ui.editor_simple_config_editor.lbl_author', 'Auteur'),
  badge: tHub('hub.ui.editor_simple_config_editor.lbl_badge', 'Badge'),
  cta_label: tHub('hub.ui.editor_simple_config_editor.lbl_cta_label', 'Bouton'),
  cta_label_2: tHub('hub.ui.editor_simple_config_editor.lbl_cta_label_2', 'Second bouton'),
  description: tHub('hub.ui.editor_simple_config_editor.lbl_description', 'Description'),
  footer: tHub('hub.ui.editor_simple_config_editor.lbl_footer', 'Texte inférieur'),
  header: tHub('hub.ui.editor_simple_config_editor.lbl_header', 'Texte supérieur'),
  image_alt: tHub('hub.ui.editor_simple_config_editor.lbl_image_alt', 'Texte alternatif'),
  intro: tHub('hub.ui.editor_simple_config_editor.lbl_intro', 'Introduction'),
  kicker: tHub('hub.ui.editor_simple_config_editor.lbl_kicker', 'Accroche'),
  label: tHub('hub.ui.editor_simple_config_editor.lbl_label', 'Libellé'),
  link_label: tHub('hub.ui.editor_simple_config_editor.lbl_link_label', 'Libellé du lien'),
  name: tHub('hub.ui.editor_simple_config_editor.lbl_name', 'Nom'),
  note: tHub('hub.ui.editor_simple_config_editor.lbl_note', 'Note'),
  price: tHub('hub.ui.editor_simple_config_editor.lbl_price', 'Prix'),
  quote: tHub('hub.ui.editor_simple_config_editor.lbl_quote', 'Citation'),
  role: tHub('hub.ui.editor_simple_config_editor.lbl_role', 'Fonction'),
  role_label: tHub('hub.ui.editor_simple_config_editor.lbl_role_label', 'Libellé du poste'),
  situation: tHub('hub.ui.editor_simple_config_editor.lbl_situation', 'Situation'),
  submit_label: tHub('hub.ui.editor_simple_config_editor.lbl_submit_label', 'Bouton d\'envoi'),
  subtitle: tHub('hub.ui.editor_simple_config_editor.lbl_subtitle', 'Sous-titre'),
  text: tHub('hub.ui.editor_simple_config_editor.lbl_text', 'Texte'),
  title: tHub('hub.ui.editor_simple_config_editor.lbl_title', 'Titre'),
  titleAccent: tHub('hub.ui.editor_simple_config_editor.lbl_title_accent', 'Accent du titre'),
  unit_note: tHub('hub.ui.editor_simple_config_editor.lbl_unit_note', 'Précision du prix'),
  value: tHub('hub.ui.editor_simple_config_editor.lbl_value', 'Valeur'),
  consent_text: tHub('hub.ui.editor_simple_config_editor.lbl_consent_text', 'Texte de consentement'),
  sectionBadge: tHub('hub.ui.editor_simple_config_editor.lbl_section_badge', 'Badge produits'),
}))

function fieldLabel(field: SectionTextField): string {
  const indexes = field.path.filter((part) => typeof part === 'number').map((part) => Number(part) + 1)
  const suffix = indexes.length ? ` ${indexes.join('.')}` : ''
  return `${LABELS.value[field.key] || field.key.replaceAll('_', ' ')}${suffix}`
}

function isLongText(field: SectionTextField): boolean {
  const values = typeof field.value === 'string' ? [field.value] : Object.values(field.value)
  return ['description', 'intro', 'note', 'quote', 'situation', 'text', 'consent_text'].includes(field.key)
    || values.some((value) => value.length > 90)
}

function updateText(path: SectionTextPath, value: any) {
  emit('update:payload', setSectionTextValue(localPayload.value, path, value))
}

const MEDIA_LABELS: Record<string, [string, string]> = {
  image:         ['builder.media.image',        'Photo'],
  image_sm:      ['builder.media.image_sm',     'Photo (mobile)'],
  background:    ['builder.media.background',   'Image de fond'],
  backgroundSm:  ['builder.media.background_sm','Image de fond (mobile)'],
  avatar:        ['builder.media.avatar',       'Portrait'],
  logo:          ['builder.media.logo',         'Logo'],
  src:           ['builder.media.src',          'Fichier'],
  video:         ['builder.media.video',        'Vidéo'],
  videoWebm:     ['builder.media.video_webm',   'Vidéo (WebM)'],
  carriersImage: ['builder.media.carriers',     'Bandeau transporteurs'],
}

function mediaLabel(field: SectionMediaField): string {
  const indexes = field.path.filter((part) => typeof part === 'number').map((part) => Number(part) + 1)
  const suffix = indexes.length ? ` ${indexes.join('.')}` : ''
  const [key, fallback] = MEDIA_LABELS[field.key] ?? ['', field.key.replaceAll('_', ' ')]
  return `${key ? t(key, fallback) : fallback}${suffix}`
}

function updateMedia(path: SectionMediaPath, value: any) {
  emit('update:payload', setSectionMediaValue(localPayload.value, path, value))
}

const LINK_LABELS: Record<string, [string, string]> = {
  href:      ['builder.link.href',      'Lien'],
  url:       ['builder.link.url',       'Adresse'],
  to:        ['builder.link.to',        'Destination'],
  cta_to:    ['builder.link.cta_to',    'Lien du bouton'],
  cta_to_2:  ['builder.link.cta_to_2',  'Lien du second bouton'],
  cta_href:  ['builder.link.cta_href',  'Lien du bouton'],
  imageHref: ['builder.link.image_href','Lien de l\'image'],
}

function linkLabel(field: SectionLinkField): string {
  const indexes = field.path.filter((part) => typeof part === 'number').map((part) => Number(part) + 1)
  const suffix = indexes.length ? ` ${indexes.join('.')}` : ''
  const [key, fallback] = LINK_LABELS[field.key] ?? ['', field.key.replaceAll('_', ' ')]
  return `${key ? t(key, fallback) : fallback}${suffix}`
}

function updateLink(path: SectionLinkPath, value: any) {
  emit('update:payload', setSectionLinkValue(localPayload.value, path, value))
}

const hasLimit = computed(() =>
  ['promotions', 'bestsellers', 'new-products'].includes(props.sectionType),
)

const DEFAULT_FEATURED_POSITION: Record<string, 'left' | 'right'> = {
  promotions:    'right',
  'new-products':'right',
  bestsellers:   'left',
}
const currentFeaturedPosition = computed<'left' | 'right'>(() => {
  const v = localPayload.value.featuredPosition
  if (v === 'left' || v === 'right') return v
  return DEFAULT_FEATURED_POSITION[props.sectionType] ?? 'left'
})

function updateField(key: string, value: any) {
  emit('update:payload', { ...localPayload.value, [key]: value })
}
</script>
