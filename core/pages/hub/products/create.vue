<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">

    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0">
      <NuxtLink
        to="/hub/products"
        class="text-gray-400 hover:text-primary-600 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
      </NuxtLink>
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.product.create.title', 'Nouveau produit') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ t('hub.product.create.step_indicator', 'Étape {step} / {total} — {label}', { step: String(step), total: '4', label: STEPS[step - 1].title }) }}</p>
      </div>
    </header>

    
    <div class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-3 shrink-0">
      <div class="flex items-center gap-0 max-w-lg">
        <template v-for="(s, i) in STEPS" :key="s.id">
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              :class="step > s.id
                ? 'bg-success-500 text-white'
                : step === s.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400'"
            >
              <svg v-if="step > s.id" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else>{{ s.id }}</span>
            </div>
            <span
              class="text-xs font-medium hidden sm:block"
              :class="step === s.id ? 'text-primary-600' : step > s.id ? 'text-success-600' : 'text-gray-400'"
            >
              {{ s.title }}
            </span>
          </div>
          <div v-if="i < STEPS.length - 1" class="flex-1 mx-3 h-px" :class="step > s.id ? 'bg-success-300' : 'bg-gray-200'" />
        </template>
      </div>
    </div>

    
    <div class="flex-1 overflow-auto">
      <div class="max-w-2xl mx-auto px-6 py-8">

        
        <div v-if="step === 1" class="space-y-5">

          
          <div v-if="loadingForm" class="flex items-center justify-center py-16 gap-3 text-gray-400">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span class="text-sm">{{ t('hub.product.create.loading_form', 'Chargement du formulaire…') }}</span>
          </div>

          
          <div
            v-if="!loadingForm && formData.categories.length === 0"
            class="flex items-start gap-3 bg-warning-50 border border-warning-200 rounded-xl px-4 py-3 text-sm text-warning-800"
          >
            <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p class="font-medium">{{ t('hub.product.create.module_missing_title', 'Module non chargé ou catalogue inaccessible') }}</p>
              <p class="text-xs text-warning-700 mt-0.5">{{ t('hub.product.create.module_missing_hint', 'Vérifiez que le module productextra est installé et que la boutique est accessible.') }}</p>
            </div>
          </div>

          <div v-if="!loadingForm" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h2 class="text-sm font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold">1</span>
              {{ t('hub.product.create.step1_title', 'Informations de base') }}
            </h2>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                {{ t('hub.product.create.name_label', 'Nom du produit') }} <span class="text-danger-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                class="input-field"
                :placeholder="t('hub.product.create.name_placeholder', 'Ex : Huile d\'olive extra vierge 5L')"
                @blur="autoRef"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">{{ t('hub.product.create.reference_label', 'Référence produit') }}</label>
              <input
                v-model="form.reference"
                type="text"
                class="input-field"
                :placeholder="t('hub.product.create.reference_placeholder', 'Ex : REF-PROD-001')"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                {{ t('hub.product.create.category_label', 'Catégorie par défaut') }} <span class="text-danger-500">*</span>
              </label>
              <select v-model="form.id_category_default" class="input-field">
                <option value="">{{ t('hub.product.create.category_placeholder', '— Choisir une catégorie —') }}</option>
                <option
                  v-for="cat in formData.categories"
                  :key="cat.id_category"
                  :value="cat.id_category"
                >
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">{{ t('hub.product.create.brand_label', 'Marque / Fabricant') }}</label>
              <select v-model="form.id_manufacturer" class="input-field">
                <option value="0">{{ t('hub.product.create.brand_none', '— Sans marque —') }}</option>
                <option
                  v-for="brand in formData.manufacturers"
                  :key="brand.id_manufacturer"
                  :value="brand.id_manufacturer"
                >
                  {{ brand.name }}
                </option>
              </select>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="form.active = form.active ? 0 : 1"
                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
                :class="form.active ? 'bg-success-500' : 'bg-gray-200'"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white dark:bg-slate-900 shadow transform transition-transform"
                  :class="form.active ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
              <span class="text-xs text-gray-600">
                {{ form.active
                  ? t('hub.product.create.active_visible', 'Produit actif (visible en boutique)')
                  : t('hub.product.create.active_hidden', 'Produit inactif (masqué)') }}
              </span>
            </div>
          </div>

          <p v-if="stepError" class="text-xs text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {{ stepError }}
          </p>
          <div class="flex justify-end">
            <button @click="nextStep" :disabled="loadingForm" class="btn-primary">
              {{ t('hub.product.create.next_price', 'Suivant — Prix & Stock') }}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        
        <div v-if="step === 2" class="space-y-5">
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h2 class="text-sm font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold">2</span>
              {{ t('hub.product.create.step2_title', 'Prix & Stock') }}
            </h2>

            <div class="grid grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                  {{ t('hub.product.create.price_ht_label', 'Prix HT') }} <span class="text-danger-500">*</span>
                </label>
                <div class="relative">
                  <input
                    v-model="form.price"
                    type="number"
                    min="0"
                    step="0.01"
                    class="input-field pr-8"
                    placeholder="0.00"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">€</span>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">{{ t('hub.product.create.tax_label', 'Règle de taxes') }}</label>
                <select v-model="form.id_tax_rules_group" class="input-field">
                  <option value="0">{{ t('hub.product.create.tax_none', '— Sans taxe (0%) —') }}</option>
                  <option
                    v-for="tax in formData.tax_rules"
                    :key="tax.id_tax_rules_group"
                    :value="tax.id_tax_rules_group"
                  >
                    {{ tax.name }}
                  </option>
                </select>
              </div>
            </div>

            
            <div class="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <span class="text-xs text-primary-700 font-medium">
                {{ t('hub.product.create.price_ttc_label', 'Prix TTC estimé{rate}', { rate: selectedTaxRate !== null ? t('hub.ui.products_create.vat_suffix', ' (TVA {rate}%)', { rate: selectedTaxRate }) : '' }) }}
              </span>
              <span class="text-sm font-bold text-primary-700">
                {{ formatPrice(estimatedTTC) }}
              </span>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">{{ t('hub.product.create.quantity_label', 'Quantité en stock') }}</label>
              <input
                v-model="form.quantity"
                type="number"
                min="0"
                class="input-field"
                placeholder="0"
              />
              <p class="text-xs text-gray-400 mt-1">
                <span v-if="form.quantity <= 0" class="text-danger-500">{{ t('hub.product.create.stock_out', 'Rupture de stock — le produit ne sera pas commandable') }}</span>
                <span v-else-if="form.quantity < 5" class="text-warning-600">{{ t('hub.product.create.stock_low', 'Stock faible') }}</span>
                <span v-else class="text-success-600">{{ t('hub.product.create.stock_ok', 'Stock suffisant') }}</span>
              </p>
            </div>

            
            <template v-if="isFood">
              <div class="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-4">
                <p class="text-[10px] uppercase tracking-wide font-semibold text-gray-400">{{ t('hub.pricing.unit_pricing_section', 'Prix unitaire (au poids / à la pièce)') }}</p>

                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">{{ t('hub.pricing.unity_label', 'Unité de vente') }}</label>
                  <select v-model="form.unity" class="input-field">
                    <option value="">{{ t('hub.pricing.unity_none', '— Prix colis (pas de prix unitaire)') }}</option>
                    <option value="Par kg">{{ t('hub.pricing.unity_kg', 'Par kg') }}</option>
                    <option value="Par pièce">{{ t('hub.pricing.unity_piece', 'Par pièce') }}</option>
                    <option value="Par L">{{ t('hub.pricing.unity_liter', 'Par litre') }}</option>
                  </select>
                </div>

                <div v-if="form.unity">
                  <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                    {{
                      form.unity === 'Par kg'
                        ? t('hub.pricing.unit_ratio_kg', 'Poids colis (kg)')
                        : form.unity === 'Par L'
                          ? t('hub.pricing.unit_ratio_liter', 'Volume colis (L)')
                          : t('hub.pricing.unit_ratio_piece', 'Colisage (pièces par colis)')
                    }}
                  </label>
                  <div class="relative">
                    <input
                      v-model.number="form.unit_price_ratio"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0"
                      class="input-field pr-12"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {{ form.unity === 'Par kg' ? 'kg' : form.unity === 'Par L' ? 'L' : t('hub.pricing.unit_ratio_suffix_piece', 'pcs') }}
                    </span>
                  </div>
                </div>

                <div v-if="form.unity === 'Par kg'">
                  <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">{{ t('hub.pricing.weight_label', 'Poids total colis (kg)') }}</label>
                  <div class="relative">
                    <input
                      v-model.number="form.weight"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      class="input-field pr-8"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>
                  </div>
                  <p class="text-[10px] text-gray-400 mt-1">{{ t('hub.pricing.weight_hint', 'Poids total pour le calcul du prix au kg.') }}</p>
                </div>
              </div>
            </template>
          </div>

          <div class="flex justify-between">
            <button @click="step = 1" class="btn-secondary">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              {{ t('hub.product.create.back', 'Retour') }}
            </button>
            <button @click="nextStep" class="btn-primary">
              {{ t('hub.product.create.next_descriptions', 'Suivant — Descriptions') }}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        
        <div v-if="step === 3" class="space-y-5">

          
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold">3</span>
                  {{ t('hub.product.create.step3_title', 'IA Copywriting') }}
                </h2>
                <p class="text-xs text-gray-400 mt-1 ml-8">
                  {{ aiMode === 'centaure'
                    ? t('hub.product.create.centaure_hint', 'Copier le prompt, coller dans votre LLM, coller la réponse.')
                    : t('hub.product.create.api_hint', 'Génération automatique via API (file d\'attente).') }}
                </p>
              </div>
              
              <div class="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button
                  @click="aiMode = 'centaure'"
                  :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', aiMode === 'centaure' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                >{{ t('hub.product.create.mode_centaure', 'Centaure') }}</button>
                <button
                  @click="aiMode = 'api'"
                  :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', aiMode === 'api' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                >{{ t('hub.product.create.mode_api', 'API') }}</button>
              </div>
            </div>

            
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                {{ t('hub.product.create.ai_context_label', 'Contexte pour l\'IA') }}
                <span class="text-gray-400 font-normal ml-1">{{ t('hub.product.create.ai_context_hint', '— Brief transmis au LLM pour générer les descriptions') }}</span>
              </label>
              <textarea
                v-model="form.ai_context"
                rows="5"
                class="input-field resize-y font-mono text-xs leading-relaxed"
                :placeholder="t('hub.product.create.ai_context_placeholder', 'Décris ton produit : pour qui ? quel problème résout-il ? avantages uniques, ton éditorial, mots-clés SEO à intégrer…')"
              />
              <p class="text-xs text-gray-400 mt-1">{{ (form.ai_context || '').length }} {{ t('hub.product.create.chars', 'caractères') }}</p>
            </div>

            
            <div v-if="aiMode === 'centaure'" class="space-y-3">
              <button
                type="button"
                @click="generateProductCentaurePrompt"
                :disabled="!form.name"
                class="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium"
              >
                {{ t('hub.product.create.generate_prompt', 'Générer le prompt') }}
              </button>

              <div v-if="centaurePrompt" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-medium text-gray-600 dark:text-slate-300">{{ t('hub.product.create.prompt_label', 'Prompt (copier dans Claude, Gemini ou ChatGPT)') }}</span>
                  <button
                    @click="copyProductCentaurePrompt"
                    class="text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors"
                    :class="centaurePromptCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 hover:bg-gray-200'"
                  >
                    {{ centaurePromptCopied ? t('hub.product.create.copied', 'Copié !') : t('hub.product.create.copy', 'Copier') }}
                  </button>
                </div>
                <textarea
                  :value="centaurePrompt"
                  readonly
                  rows="6"
                  class="w-full text-[11px] font-mono bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none cursor-text select-all"
                  @focus="($event.target as HTMLTextAreaElement).select()"
                />
              </div>

              <div v-if="centaurePrompt" class="space-y-2">
                <span class="text-[11px] font-medium text-gray-600 dark:text-slate-300">{{ t('hub.product.create.paste_response', 'Réponse du LLM (coller ici)') }}</span>
                <textarea
                  v-model="centaureResponse"
                  rows="8"
                  :placeholder='t("hub.product.create.paste_placeholder", "Collez la réponse JSON du LLM ici : { \"description\": \"...\", \"description_short\": \"...\" }")'
                  class="w-full text-[11px] font-mono bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
                <button
                  v-if="centaureResponse.trim()"
                  @click="applyProductCentaureResponse"
                  class="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  {{ t('hub.product.create.apply_descriptions', 'Appliquer Description courte + Description longue') }}
                </button>
                <p v-if="centaureStatus" class="text-[10px]" :class="centaureStatusClass">{{ centaureStatus }}</p>
              </div>
            </div>

            
            <div v-if="aiMode === 'api'" class="mt-4 space-y-3">
              <p class="text-xs text-gray-400 italic">{{ t('hub.product.create.api_coming', 'Mode API non disponible sur la page de création — utilisez le mode Centaure ou complétez les descriptions manuellement.') }}</p>
            </div>
          </div>

          
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200">{{ t('hub.product.create.descriptions_title', 'Descriptions') }}</h3>
              <span v-if="aiGenerated" class="inline-flex items-center gap-1 text-xs bg-success-50 text-success-700 px-2 py-0.5 rounded-full border border-success-200">
                <span class="w-1.5 h-1.5 rounded-full bg-success-400" />
                {{ t('hub.product.create.ai_generated', 'Générées par IA — modifiables') }}
              </span>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                {{ t('hub.product.create.desc_short_label', 'Description courte') }}
                <span class="text-gray-400 font-normal ml-1">{{ t('hub.product.create.desc_short_hint', '— Accroche (HTML autorisé)') }}</span>
              </label>
              <textarea
                v-model="form.description_short"
                rows="3"
                class="input-field resize-y text-xs"
                :placeholder="t('hub.product.create.desc_short_placeholder', '<p>Une phrase d\'accroche percutante qui donne envie d\'acheter…</p>')"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                {{ t('hub.product.create.desc_long_label', 'Description longue') }}
                <span class="text-gray-400 font-normal ml-1">{{ t('hub.product.create.desc_long_hint', '— Contenu détaillé (HTML autorisé)') }}</span>
              </label>
              <textarea
                v-model="form.description"
                rows="8"
                class="input-field resize-y text-xs"
                :placeholder="t('hub.product.create.desc_long_placeholder', '<p>Description complète : avantages, caractéristiques, cas d\'usage…</p>')"
              />
            </div>
          </div>

          
          <div class="bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
            <h3 class="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">{{ t('hub.product.create.recap_title', 'Récapitulatif') }}</h3>
            <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div><dt class="text-gray-400">{{ t('hub.product.create.recap_name', 'Nom') }}</dt><dd class="font-medium text-gray-800 dark:text-slate-100 truncate">{{ form.name }}</dd></div>
              <div><dt class="text-gray-400">{{ t('hub.product.create.recap_ref', 'Référence') }}</dt><dd class="font-medium text-gray-800 dark:text-slate-100">{{ form.reference || '—' }}</dd></div>
              <div><dt class="text-gray-400">{{ t('hub.product.create.recap_price', 'Prix HT') }}</dt><dd class="font-medium text-gray-800 dark:text-slate-100">{{ formatPrice(form.price) }}</dd></div>
              <div><dt class="text-gray-400">{{ t('hub.product.create.recap_stock', 'Stock') }}</dt><dd class="font-medium text-gray-800 dark:text-slate-100">{{ form.quantity }}</dd></div>
              <div><dt class="text-gray-400">{{ t('hub.product.create.recap_status', 'Statut') }}</dt><dd class="font-medium" :class="form.active ? 'text-success-600' : 'text-gray-500'">{{ form.active ? t('hub.product.create.status_active', 'Actif') : t('hub.product.create.status_inactive', 'Inactif') }}</dd></div>
            </dl>
          </div>

          <p v-if="saveError" class="text-xs text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {{ saveError }}
          </p>

          <div class="flex justify-between">
            <button @click="step = 2" class="btn-secondary">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              {{ t('hub.product.create.back', 'Retour') }}
            </button>
            <button @click="saveProduct" :disabled="saving" class="btn-primary">
              <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {{ saving ? t('hub.product.create.saving', 'Création en cours…') : t('hub.product.create.save_and_faq', 'Créer et ajouter la FAQ') }}
            </button>
          </div>

        </div>

        
        <div v-if="step === 4" class="space-y-5">
          <div class="bg-success-50 border border-success-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <svg class="w-5 h-5 text-success-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-success-800">{{ t('hub.product.create.success_title', 'Produit #{id} créé avec succès !', { id: String(savedProductId) }) }}</p>
              <p class="text-xs text-success-700 mt-0.5">{{ t('hub.product.create.success_faq_hint', 'Ajoutez maintenant des questions fréquentes pour booster le référencement de ce produit.') }}</p>
              <p v-if="nonTraduites.length" class="text-xs text-amber-700 mt-1" role="status" data-creation="non-traduite">
                {{ t('hub.product.create.not_translated', 'Pas encore traduit en : {langues}. Le texte français y est repris en attendant.', { langues: nonTraduites.join(', ').toUpperCase() }) }}
              </p>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
            <AdminFaqEditor parent-type="product" :parent-id="savedProductId" />
          </div>

          <div class="flex justify-end">
            <NuxtLink to="/hub/products" class="btn-primary">
              {{ t('hub.product.create.finish', 'Terminer') }}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </NuxtLink>
          </div>
        </div>

      </div>
    </div>

    
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-2 opacity-0" leave-active-class="transition duration-150" leave-to-class="translate-y-2 opacity-0">
        <div
          v-if="toast"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          :class="toast.type === 'success' ? 'bg-success-600 text-white' : 'bg-danger-600 text-white'"
        >
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()
const { isFood } = useTenantProfile()

interface Category     { id_category: number; name: string; level: number }
interface Manufacturer { id_manufacturer: number; name: string }
interface TaxRule      { id_tax_rules_group: number; name: string; rate: number }
interface FormData {
  categories:    Category[]
  manufacturers: Manufacturer[]
  tax_rules:     TaxRule[]
}

const STEPS = computed(() => [
  { id: 1, title: t('hub.product.create.step1_label', 'Infos de base') },
  { id: 2, title: t('hub.product.create.step2_label', 'Prix & Stock')  },
  { id: 3, title: t('hub.product.create.step3_label', 'Descriptions')  },
  { id: 4, title: t('hub.product.create.step4_label', 'FAQ SEO')       },
])

const step        = ref(1)
const loadingForm = ref(false)
const saving         = ref(false)
const savedProductId = ref(0)

const nonTraduites = ref<string[]>([])
const aiGenerated = ref(false)
const stepError   = ref('')
const saveError   = ref('')

const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const formData = ref<FormData>({ categories: [], manufacturers: [], tax_rules: [] })

const form = reactive({
  name:                '',
  reference:           '',
  id_category_default: '' as number | '',
  id_manufacturer:     0,
  id_tax_rules_group:  0,
  price:               0,
  quantity:            0,
  active:              1,
  ai_context:          '',
  description_short:   '',
  description:         '',
  
  unity:               '' as string,
  unit_price_ratio:    0 as number,
  weight:              0 as number,
})

const aiMode = ref<'centaure' | 'api'>('centaure')

const centaurePrompt = ref('')
const centaureResponse = ref('')
const centaurePromptCopied = ref(false)
const centaureStatus = ref<string | null>(null)
const centaureStatusClass = ref('text-gray-400')

function generateProductCentaurePrompt() {
  const name = form.name?.trim() || ''
  const ctx  = (form.ai_context || '').trim()

  
  
  
  

  centaurePrompt.value = `Tu rédiges la fiche produit e-commerce pour : **${name}**.

${ctx ? `## Contexte fourni\n${ctx}\n` : ''}
## Tâches

1. **Description courte** (~150-250 caractères, balise <p> unique, HTML autorisé) :
   - Accroche percutante qui donne envie d'acheter.
   - Met en avant le bénéfice principal et la cible.
   - 1 \`<strong>\` sur le bénéfice clé.

2. **Description longue** (400-800 mots, HTML structuré) :
   - 3 à 5 \`<h2>\` thématiques (avantages, caractéristiques, usage, public cible, FAQ rapide…).
   - \`<p>\` de 60-100 mots par section.
   - Au moins 1 \`<ul>\` avec 3-5 points clés concrets.
   - Ton expert et factuel, adapté au secteur visible dans le contexte.
   - Pas de chiffres inventés.

## Format de réponse

**JSON valide uniquement**, sans texte autour, sans bloc \`\`\`. Structure exacte :

{
  "description_short": "<p>Accroche percutante ici.</p>",
  "description": "<h2>Titre section</h2><p>…</p><ul><li>…</li></ul>"
}`
}

function copyProductCentaurePrompt() {
  navigator.clipboard.writeText(centaurePrompt.value)
  centaurePromptCopied.value = true
  setTimeout(() => { centaurePromptCopied.value = false }, 2000)
}

function applyProductCentaureResponse() {
  const raw = centaureResponse.value.trim()
  if (!raw) return

  let parsed: { description_short?: string; description?: string } | null = null

  
  const stripFences = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  const firstBrace  = stripFences.indexOf('{')
  const lastBrace   = stripFences.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = stripFences.slice(firstBrace, lastBrace + 1)
    try {
      parsed = JSON.parse(candidate)
    } catch {
      
      try {
        const sanitized = candidate.replace(
          /("[\w_]+"\s*:\s*")([\s\S]*?)("\s*(?:,|\}))/g,
          (_m: string, prefix: string, body: string, suffix: string) => {
            const fixed = body
              .replace(/(?<!\\)"/g, '\\"')
              .replace(/\r\n/g, '\\n')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\n')
              .replace(/\t/g, '\\t')
            return `${prefix}${fixed}${suffix}`
          },
        )
        parsed = JSON.parse(sanitized)
      } catch (e2) {
        console.error('[applyProductCentaureResponse] JSON parse failed', e2)
      }
    }
  }

  
  if (!parsed) {
    const stripped = raw.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    if (/^</.test(stripped)) {
      const h2Idx = stripped.search(/<h2[\s>]/i)
      if (h2Idx > 0) {
        parsed = {
          description_short: stripped.slice(0, h2Idx).trim() || undefined,
          description:       stripped.slice(h2Idx).trim(),
        }
      } else {
        
        parsed = { description_short: stripped }
      }
    }
  }

  if (!parsed) {
    const preview = raw.slice(0, 120).replace(/\s+/g, ' ')
    centaureStatus.value = t('hub.product.create.centaure_parse_error', 'Format non reconnu — attendu JSON {description_short, description}. Reçu : "{preview}…"', { preview })
    centaureStatusClass.value = 'text-red-500'
    return
  }

  const applied: string[] = []
  if (parsed.description_short) {
    form.description_short = parsed.description_short.trim()
    applied.push(t('hub.product.create.desc_short_label', 'Description courte'))
    aiGenerated.value = true
  }
  if (parsed.description) {
    form.description = parsed.description.trim()
    applied.push(t('hub.product.create.desc_long_label', 'Description longue'))
    aiGenerated.value = true
  }

  centaureStatus.value = applied.length
    ? t('hub.product.create.centaure_applied', '{fields} appliquées — modifiez si besoin puis créez le produit.', { fields: applied.join(' + ') })
    : t('hub.product.create.centaure_no_field', 'Aucun champ extrait du JSON')
  centaureStatusClass.value = applied.length ? 'text-emerald-600' : 'text-amber-500'
}

const selectedTaxRate = computed<number | null>(() => {
  if (!form.id_tax_rules_group) return null
  const rule = formData.value.tax_rules.find(r => r.id_tax_rules_group === form.id_tax_rules_group)
  return rule?.rate ?? null
})

const estimatedTTC = computed(() => {
  const p = Number(form.price) || 0
  if (selectedTaxRate.value === null) return p
  return p * (1 + selectedTaxRate.value / 100)
})

const formatPrice = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

const autoRef = () => {
  if (form.reference || !form.name) return
  form.reference = form.name
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)
}

const nextStep = () => {
  stepError.value = ''
  if (step.value === 1) {
    if (!form.name.trim()) {
      stepError.value = t('hub.product.create.error_name_required', 'Le nom est requis')
      return
    }
    if (!form.id_category_default) form.id_category_default = 2
  }
  if (step.value === 2) {
    if (form.price < 0) {
      stepError.value = t('hub.product.create.error_price_negative', 'Le prix ne peut pas être négatif')
      return
    }
  }
  step.value++
}

const loadFormData = async () => {
  loadingForm.value = true
  try {
    const res = await $fetch<{ success: boolean; categories: any[]; manufacturers: any[]; tax_rules: any[] }>(
      '/api/bo/productextra/form-data',
    )
    if (res.success) {
      formData.value = {
        categories:    res.categories    ?? [],
        manufacturers: res.manufacturers ?? [],
        tax_rules:     res.tax_rules     ?? [],
      }
    }
  } catch {
    
  } finally {
    loadingForm.value = false
    if (!form.id_category_default) {
      form.id_category_default = formData.value.categories[0]?.id_category ?? 2
    }
  }
}

const showToast = (type: 'success' | 'error', message: string) => {
  toast.value = { type, message }
  setTimeout(() => (toast.value = null), 3500)
}

const saveProduct = async () => {
  saving.value    = true
  saveError.value = ''
  try {
    const body: Record<string, unknown> = {
      name:                form.name,
      reference:           form.reference,
      id_category_default: form.id_category_default,
      id_manufacturer:     form.id_manufacturer,
      id_tax_rules_group:  form.id_tax_rules_group,
      price:               form.price,
      quantity:            form.quantity,
      active:              form.active,
      description_short:   form.description_short,
      description:         form.description,
    }
    
    if (isFood.value) {
      if (form.unity)             body.unity           = form.unity
      if (form.unit_price_ratio)  body.unit_price_ratio = form.unit_price_ratio
      if (form.weight)            body.weight          = form.weight
    }
    const res = await $fetch<{ success: boolean; id_product?: number; error?: string; non_traduites?: string[] }>(
      '/api/bo/productextra/products',
      { method: 'POST', body },
    )
    if (res.success) {
      savedProductId.value = res.id_product ?? 0
      nonTraduites.value = res.non_traduites ?? []
      step.value = 4
    } else {
      saveError.value = res.error || t('hub.product.create.error_save', 'Erreur lors de la création')
    }
  } catch {
    saveError.value = t('hub.product.create.error_network', 'Erreur réseau — réessayez')
  } finally {
    saving.value = false
  }
}

onMounted(loadFormData)
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition-shadow bg-white dark:bg-slate-900;
}
.btn-primary {
  @apply flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply flex items-center gap-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 text-gray-600 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors;
}
</style>
