<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      <NuxtLink to="/hub/products" class="text-gray-400 hover:text-primary-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
      </NuxtLink>
      <div v-if="product" class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100 truncate">{{ product.name || t('hub.ui.product.unnamed', 'Produit sans nom') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">#{{ product.id }} — {{ product.reference || '—' }} — {{ product.categoryName || t('hub.ui.product.no_category', 'Sans catégorie') }}</p>
      </div>
      <div v-else class="flex-1" />
      <div class="flex items-center gap-2">
        
        <HubLangSelector :aria-label="t('hub.ui.product.lang_aria', 'Langue d\'édition du produit')" />

        <span v-if="saved" class="text-xs text-green-600 font-medium">{{ t('hub.ui.product.saved', 'Sauvegardé') }}</span>
        <span v-if="saveError" class="text-xs text-red-600 font-medium truncate max-w-xs" :title="saveError">{{ t('hub.ui.product.error_msg', 'Erreur : {msg}', { msg: saveError }) }}</span>
        <a
          v-if="product"
          :href="productFrontUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
          :title="t('hub.ui.product.view_public_title', 'Ouvrir la fiche produit publique dans un nouvel onglet')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          <span>{{ t('hub.ui.product.view_product', 'Voir le produit') }}</span>
        </a>
        <button
          @click="save"
          :disabled="saving || loading"
          class="text-xs px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
        >
          {{ saving ? t('hub.ui.product.saving', 'Enregistrement…') : t('hub.ui.product.save', 'Enregistrer') }}
        </button>
        <button
          @click="showArchiveModal = true"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 text-xs px-3 py-2 border border-rose-200 bg-white text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-40 transition-colors font-medium"
          :title="t('hub.products.archive.button_title', 'Retirer ce produit du catalogue avec une redirection 301')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          <span>{{ t('hub.products.archive.button_label', 'Suppression') }}</span>
        </button>
      </div>
    </header>

    <HubProductArchiveModal
      :open="showArchiveModal"
      :product-id="Number(route.params.id)"
      :product-name="form?.name"
      @close="showArchiveModal = false"
      @archived="onArchived"
    />

    <div v-if="loading" class="px-6 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 h-96 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        <div class="space-y-6">
          <div class="h-64 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
          <div class="h-32 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>

    <div v-else-if="product" class="px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        
        <div class="lg:col-span-2 space-y-6">
          
          <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm">
            <nav class="flex items-center gap-1 px-4 border-b border-gray-100 dark:border-slate-800" role="tablist">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                role="tab"
                :aria-selected="activeTab === tab.id"
                @click="activeTab = tab.id"
                :class="[
                  'relative text-xs px-4 py-3 -mb-px border-b-2 transition-colors font-medium',
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700 dark:text-primary-400 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-200 dark:hover:border-slate-700'
                ]"
              >
                {{ tab.label }}
              </button>
            </nav>
          </div>

          
          <div v-show="activeTab === 'essentiel'" class="space-y-6">
            <HubProductImages
              :images="images"
              @upload-request="onUploadRequest"
              @remove="onImageRemove"
              @set-cover="onImageSetCover"
            />
            <div
              v-if="imageUploadError"
              class="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {{ imageUploadError }}
            </div>
            <div v-if="imageUploading" class="text-xs text-gray-500">
              {{ t('hub.ui.product.uploading', 'Upload en cours…') }}
            </div>
            <HubProductGeneral v-model="form" />
            <HubProductCategories
              :categories="productCategories"
              v-model:default-id="form.defaultCategoryId"
              @remove="onCategoryRemove"
              @add-request="onCategoryAddRequest"
            />
            <HubProductCombinations ref="combinationsRef" :existing-combinations="productCombinations" />

            
            <HubProductFeatures :product-id="Number(route.params.id)" />
          </div>

          
          <div v-show="activeTab === 'description'" class="space-y-6">
            
            <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.product.ai_writing', 'Rédaction IA') }}</h2>
                  <p class="text-xs text-gray-400 mt-0.5">{{ aiMode === 'centaure' ? t('hub.ui.product.ai_intro_centaure', 'Résumé + description longue. Copier le prompt, coller dans votre LLM, coller la réponse.') : t('hub.ui.product.ai_intro_api', 'Résumé + description longue. Génération automatique via API (file d\'attente).') }}</p>
                </div>
                <div class="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    @click="aiMode = 'centaure'"
                    :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', aiMode === 'centaure' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  >Centaure</button>
                  <button
                    @click="aiMode = 'api'"
                    :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', aiMode === 'api' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  >API</button>
                </div>
              </div>

              <div class="mt-3">
                <input
                  v-model="prodInstructions"
                  type="text"
                  :placeholder="t('hub.ui.product.instructions_placeholder', 'Consignes (optionnel) : angle, ton, cible…')"
                  class="w-full text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>

              
              <div v-if="aiMode === 'centaure'" class="mt-4 space-y-3">
                <button
                  @click="generateCentaurePrompt"
                  :disabled="!form.name"
                  class="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium"
                >{{ t('hub.ui.product.generate_prompt', 'Générer le prompt') }}</button>

                <div v-if="centaurePrompt" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-medium text-gray-600 dark:text-slate-300">{{ t('hub.ui.product.prompt_label', 'Prompt (copier dans Claude, Gemini ou ChatGPT)') }}</span>
                    <button @click="copyCentaurePrompt" class="text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors" :class="centaurePromptCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 hover:bg-gray-200'">
                      {{ centaurePromptCopied ? t('hub.ui.product.copied', 'Copié !') : t('hub.ui.product.copy', 'Copier') }}
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
                  <span class="text-[11px] font-medium text-gray-600 dark:text-slate-300">{{ t('hub.ui.product.llm_response_label', 'Réponse du LLM (coller ici)') }}</span>
                  <textarea
                    v-model="centaureResponse"
                    rows="8"
                    :placeholder="t('hub.ui.product.llm_response_placeholder', 'Collez la réponse du LLM ici (---SUMMARY--- + ---DESCRIPTION---)...')"
                    class="w-full text-[11px] font-mono bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                  <button
                    v-if="centaureResponse.trim()"
                    @click="applyCentaureResponse"
                    class="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >{{ t('hub.ui.product.apply_summary_desc', 'Appliquer Résumé + Description') }}</button>
                </div>
              </div>

              
              <div v-if="aiMode === 'api'" class="mt-4 space-y-3">
                <button
                  @click="requestProductContent"
                  :disabled="prodRedactionGenerating || !form.name"
                  class="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5"
                >
                  <svg v-if="prodRedactionGenerating" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {{ prodRedactionGenerating ? t('hub.ui.product.in_progress', 'En cours…') : t('hub.ui.product.start_writing', 'Lancer la rédaction') }}
                </button>
                <p v-if="prodRedactionStatus" class="text-[10px]" :class="prodRedactionStatusClass">{{ prodRedactionStatus }}</p>

                <div v-if="prodRedactionResult" class="space-y-3">
                  <div class="border border-violet-200 dark:border-violet-800 rounded-lg p-3 bg-violet-50/50 dark:bg-violet-950/20 space-y-2">
                    <p class="text-[10px] font-semibold uppercase tracking-widest text-violet-600">{{ t('hub.ui.product.ai_proposal', 'Proposition IA') }}</p>
                    <div v-if="prodRedactionResult.short_description">
                      <span class="text-[10px] text-gray-500">{{ t('hub.ui.product.summary_colon', 'Résumé :') }}</span>
                      <div class="text-xs text-gray-600 prose prose-sm" v-html="prodRedactionResult.short_description" />
                    </div>
                    <div v-if="prodRedactionResult.long_description">
                      <span class="text-[10px] text-gray-500">{{ t('hub.ui.product.long_desc_colon', 'Description longue :') }}</span>
                      <div class="text-xs text-gray-600 prose prose-sm max-h-40 overflow-auto" v-html="prodRedactionResult.long_description" />
                    </div>
                  </div>
                  <button @click="applyProductContent" class="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium">{{ t('hub.ui.product.apply_summary_desc', 'Appliquer Résumé + Description') }}</button>
                </div>
              </div>
            </section>

            <HubProductDescription v-model="form" />
            <HubProductAttachments v-if="product" :product-id="Number(product.id)" />
          </div>

          
          <div v-show="activeTab === 'livraison'" class="space-y-6">
            <HubProductShipping v-model="form" />
          </div>

          
          <div v-show="activeTab === 'crossell'" class="space-y-6">
            <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.product.cross_title', 'Produits accessoires') }}</h2>
                  <p class="text-xs text-gray-400 mt-0.5">{{ t('hub.ui.product.cross_intro', 'Affichés comme « produits liés » sur la fiche client. Source :') }} <span class="font-mono">ps_accessory</span>.</p>
                </div>
                <span class="text-[10px] uppercase tracking-wide text-gray-400">{{ accessories.length > 1 ? t('hub.ui.product.linked_other', '{n} liés', { n: accessories.length }) : t('hub.ui.product.linked_one', '{n} lié', { n: accessories.length }) }}</span>
              </div>

              
              <div class="relative">
                <input
                  v-model="addSearch"
                  @input="onAddSearchInput"
                  type="text"
                  :placeholder="t('hub.ui.product.add_accessory_placeholder', 'Ajouter un accessoire — chercher par nom, réf, EAN…')"
                  class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
                <div v-if="addResults.length" class="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-auto">
                  <button
                    v-for="p in (addResults as any[])"
                    :key="p.id"
                    type="button"
                    :disabled="p.alreadyLinked || addingId === p.id"
                    @click="addAccessory(p)"
                    class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border-b border-gray-50 dark:border-slate-800 last:border-0"
                  >
                    <div class="flex-1 min-w-0">
                      <span class="text-gray-800 dark:text-slate-100 font-medium truncate block">{{ p.name }}</span>
                      <span v-if="p.reference" class="text-[10px] text-gray-400 font-mono">#{{ p.id }} · {{ p.reference }}</span>
                      <span v-else class="text-[10px] text-gray-400 font-mono">#{{ p.id }}</span>
                    </div>
                    <span v-if="p.alreadyLinked" class="text-[10px] text-amber-600">{{ t('hub.ui.product.already_linked', 'Déjà lié') }}</span>
                    <span v-else-if="addingId === p.id" class="text-[10px] text-violet-500">{{ t('hub.ui.product.adding', 'Ajout…') }}</span>
                    <span v-else class="text-[10px] text-emerald-600">{{ t('hub.ui.product.add_plus', '+ Ajouter') }}</span>
                  </button>
                </div>
                <p v-if="addSearch.length >= 2 && !addSearchLoading && !addResults.length" class="text-[10px] text-gray-400 mt-1">{{ t('hub.ui.product.no_product_found', 'Aucun produit trouvé.') }}</p>
              </div>

              <p v-if="addFeedback" class="text-xs" :class="addFeedback.ok ? 'text-emerald-600' : 'text-amber-600'">{{ addFeedback.msg }}</p>

              
              <div v-if="accessoriesLoading" class="space-y-2">
                <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              </div>
              <div v-else-if="accessoriesError" class="text-xs text-red-500">{{ accessoriesError }}</div>
              <div v-else-if="accessories.length" class="border border-gray-100 dark:border-slate-800 rounded-lg divide-y divide-gray-50 dark:divide-slate-800">
                <div v-for="a in accessories" :key="a.dst" class="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                  <NuxtLink :to="`/hub/products/${a.dst}`" class="flex-1 min-w-0">
                    <span class="text-gray-800 dark:text-slate-100 truncate block">{{ a.dstName }}</span>
                    <span v-if="a.dstRef" class="text-[10px] text-gray-400 font-mono">#{{ a.dst }} · {{ a.dstRef }}</span>
                    <span v-else class="text-[10px] text-gray-400 font-mono">#{{ a.dst }}</span>
                  </NuxtLink>
                  <button
                    type="button"
                    @click="removeAccessory(a.dst)"
                    class="text-xs px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                    :title="t('hub.ui.product.remove_accessory', 'Retirer l\'accessoire')"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400 text-center py-6">{{ t('hub.ui.product.no_accessory', 'Aucun accessoire lié. Utilisez la recherche ci-dessus pour en ajouter.') }}</p>
            </section>
          </div>

          
          <div v-show="activeTab === 'seo'" class="space-y-6">
            
            <section class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.product.seo_optim_title', 'Optimisation SEO par IA') }}</h2>
                  <p class="text-xs text-gray-400 mt-0.5">{{ t('hub.ui.product.seo_optim_intro', 'Optimise meta_title, meta_description et slug pour maximiser le CTR.') }}</p>
                </div>
                <div class="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    @click="seoMode = 'centaure'"
                    :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', seoMode === 'centaure' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  >Centaure</button>
                  <button
                    @click="seoMode = 'api'"
                    :class="['text-xs px-3 py-1.5 rounded-md font-medium transition-colors', seoMode === 'api' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                  >API</button>
                </div>
              </div>

              
              <div v-if="seoMode === 'centaure'" class="space-y-3">
                <div class="flex items-center gap-2">
                  <button
                    @click="generateSeoPrompt"
                    :disabled="!form.name"
                    class="text-xs px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium"
                  >{{ t('hub.ui.product.generate_prompt', 'Générer le prompt') }}</button>
                  <button
                    v-if="seoPrompt"
                    @click="copySeoPrompt"
                    class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium"
                  >{{ seoPromptCopied ? t('hub.ui.product.copied', 'Copié !') : t('hub.ui.product.copy', 'Copier') }}</button>
                </div>

                <div v-if="seoPrompt" class="space-y-3">
                  <textarea
                    :value="seoPrompt"
                    readonly
                    rows="6"
                    class="w-full text-[11px] font-mono bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none cursor-text select-all"
                    @focus="($event.target as HTMLTextAreaElement).select()"
                  />
                  <div>
                    <label class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{{ t('hub.ui.product.paste_ai_response', 'Coller la réponse IA') }}</label>
                    <textarea
                      v-model="seoResponse"
                      rows="6"
                      placeholder="---META_TITLE---&#10;...&#10;---META_DESCRIPTION---&#10;...&#10;---SLUG---&#10;mon-slug"
                      class="w-full text-[11px] font-mono bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                  <button
                    @click="applySeoResponse"
                    :disabled="!seoResponse"
                    class="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors font-medium"
                  >{{ t('hub.ui.product.apply_seo_optim', 'Appliquer les optimisations SEO') }}</button>
                </div>
              </div>

              
              <div v-if="seoMode === 'api'" class="space-y-3">
                <button
                  @click="requestProductContent"
                  :disabled="prodRedactionGenerating || !form.name"
                  class="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5"
                >
                  <svg v-if="prodRedactionGenerating" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {{ prodRedactionGenerating ? t('hub.ui.product.in_progress', 'En cours…') : t('hub.ui.product.start_optimization', 'Lancer l\'optimisation') }}
                </button>
                <p v-if="prodRedactionStatus" class="text-[10px]" :class="prodRedactionStatusClass">{{ prodRedactionStatus }}</p>

                <div v-if="prodRedactionResult" class="space-y-3">
                  <div class="border border-violet-200 dark:border-violet-800 rounded-lg p-3 bg-violet-50/50 dark:bg-violet-950/20 space-y-2">
                    <p class="text-[10px] font-semibold uppercase tracking-widest text-violet-600">{{ t('hub.ui.product.ai_proposal', 'Proposition IA') }}</p>
                    <div v-if="prodRedactionResult.meta_title">
                      <span class="text-[10px] text-gray-500">{{ t('hub.ui.product.meta_title_colon', 'Meta title :') }}</span>
                      <p class="text-xs font-medium text-gray-800 dark:text-slate-100">{{ prodRedactionResult.meta_title }} <span class="text-[10px] text-gray-400">({{ prodRedactionResult.meta_title.length }}/60)</span></p>
                    </div>
                    <div v-if="prodRedactionResult.meta_description">
                      <span class="text-[10px] text-gray-500">{{ t('hub.ui.product.meta_desc_colon', 'Meta description :') }}</span>
                      <p class="text-xs text-gray-600">{{ prodRedactionResult.meta_description }} <span class="text-[10px] text-gray-400">({{ prodRedactionResult.meta_description.length }}/160)</span></p>
                    </div>
                    <div v-if="prodRedactionResult.optimized_slug">
                      <span class="text-[10px] text-gray-500">{{ t('hub.ui.product.slug_opt_colon', 'Slug optimisé :') }}</span>
                      <p class="text-xs font-mono text-gray-600">{{ prodRedactionResult.optimized_slug }}</p>
                    </div>
                  </div>
                  <button @click="applyProductSeo" class="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium">{{ t('hub.ui.product.apply_seo', 'Appliquer SEO') }}</button>
                </div>
              </div>

              <p v-if="seoApplyStatus" class="text-[10px]" :class="seoApplyStatusClass">{{ seoApplyStatus }}</p>
            </section>

            <HubProductSeo v-model="form" />

            
            <HubSeoStatusControl v-if="Number(route.params.id) > 0" entity="product" :id="Number(route.params.id)" />

            
            <HubSeoAttrControl v-if="Number(route.params.id) > 0" :id="Number(route.params.id)" />
          </div>
        </div>

        
        <div class="space-y-6">
          <HubProductPricing
            v-model="form"
            :tax-rules="taxRules"
            :product-weight-kg="form.weight"
          />
          <HubProductStock v-model="form" />

          
          <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.product.status_title', 'État') }}</h2>
              <span class="text-[10px] uppercase tracking-wide text-gray-400">{{ t('hub.ui.product.status_label', 'Status') }}</span>
            </div>
            <label class="flex items-center gap-3 text-sm cursor-pointer">
              <input type="checkbox" v-model="form.active" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span class="text-gray-800 dark:text-slate-100">{{ t('hub.ui.product.online', 'Produit en ligne') }}</span>
            </label>
            <p class="text-[11px] text-gray-400">{{ t('hub.ui.product.logistics_hint_before', 'Poids, dimensions et visibilité : onglet') }} <span class="font-semibold">{{ t('hub.ui.product.logistics_hint_tab', 'Essentiel') }}</span> {{ t('hub.ui.product.logistics_hint_after', '→ Logistique / Visibilité.') }}</p>
          </div>

          <HubProductAgentReadiness v-if="Number(route.params.id) > 0" :product-id="Number(route.params.id)" />

          
          <div class="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.product.special_prices', 'Prix spéciaux ({n})', { n: specificPrices.length }) }}</h2>
              <span class="text-[10px] uppercase tracking-wide text-gray-400">{{ t('hub.ui.product.read_only', 'Read-only') }}</span>
            </div>
            <div v-if="specificPrices.length" class="space-y-2">
              <div v-for="sp in specificPrices" :key="sp.id" class="flex items-center gap-3 text-sm border-b border-gray-50 dark:border-slate-800/50 pb-2 last:border-0">
                <span class="text-gray-800 dark:text-slate-100 font-medium">
                  {{ sp.reductionType === 'percentage' ? (sp.reduction * 100).toFixed(0) + '%' : formatEur(sp.reduction) }}
                </span>
                <span v-if="sp.fromQuantity > 1" class="text-xs text-gray-400">{{ t('hub.ui.product.from_qty', 'dès {n} u.', { n: sp.fromQuantity }) }}</span>
                <span v-if="sp.customerId" class="text-xs text-gray-400">{{ t('hub.ui.product.customer_ref', 'client #{id}', { id: sp.customerId }) }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400">{{ t('hub.ui.product.no_special_price', 'Aucun prix spécial') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="px-6 py-16 text-center">
      <p class="text-sm text-gray-500">{{ t('hub.ui.product.not_found', 'Produit introuvable.') }}</p>
    </div>
  </div>

  
  <Teleport to="body">
    <div
      v-if="showCategoryPicker"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closePicker"
    >
      <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <h3 class="text-sm font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.product.add_categories', 'Ajouter des catégories') }}</h3>
          <button
            type="button"
            @click="closePicker"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <input
            v-model="pickerFilter"
            type="text"
            :placeholder="t('hub.ui.product.filter_categories', 'Filtrer les catégories…')"
            class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
        <div class="flex-1 overflow-auto px-2 py-2 min-h-0">
          <div v-if="pickerLoading" class="text-xs text-gray-400 text-center py-8">{{ t('hub.ui.product.loading', 'Chargement…') }}</div>
          <div v-else-if="!pickerFiltered.length" class="text-xs text-gray-400 text-center py-8">{{ t('hub.ui.product.no_category_available', 'Aucune catégorie disponible.') }}</div>
          <div v-else class="space-y-0.5">
            <button
              v-for="cat in pickerFiltered"
              :key="cat.id"
              type="button"
              @click="togglePickerItem(cat.id)"
              :class="[
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors',
                pickerSelected.has(cat.id)
                  ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-100'
              ]"
            >
              <span
                class="shrink-0 w-4 h-4 rounded border flex items-center justify-center"
                :class="pickerSelected.has(cat.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-slate-600'"
              >
                <svg v-if="pickerSelected.has(cat.id)" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </span>
              <span :style="{ paddingLeft: `${Math.max(0, cat.depth - 2) * 12}px` }" class="truncate">{{ cat.name }}</span>
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <span class="text-xs text-gray-400">{{ t('hub.ui.product.selected_count', '{n} sélectionnée(s)', { n: pickerSelected.size }) }}</span>
          <div class="flex gap-2">
            <button type="button" @click="closePicker" class="text-xs px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">{{ t('hub.ui.product.cancel', 'Annuler') }}</button>
            <button
              type="button"
              :disabled="!pickerSelected.size"
              @click="onPickerConfirm"
              class="text-xs px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors font-medium"
            >
              {{ t('hub.ui.product.add', 'Ajouter') }} {{ pickerSelected.size > 0 ? `(${pickerSelected.size})` : '' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { productPromptContext, type ProductPromptBrand } from '~/utils/product-prompt-context'
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const route = useRoute()
const { t } = useHubT()

const { currentLangId } = useHubLang()

const product = ref<any>(null)
const features = ref<any[]>([])
const specificPrices = ref<any[]>([])
const productCategories = ref<any[]>([])

const showCategoryPicker = ref(false)
const pickerAllCategories = ref<Array<{ id: number; name: string; depth: number }>>([])
const pickerLoading = ref(false)
const pickerFilter = ref('')
const pickerSelected = ref<Set<number>>(new Set())

const pickerFiltered = computed(() => {
  const q = pickerFilter.value.trim().toLowerCase()
  const alreadyIds = new Set(productCategories.value.map((c: any) => Number(c.id)))
  return pickerAllCategories.value
    .filter((c) => !alreadyIds.has(c.id))
    .filter((c) => !q || c.name.toLowerCase().includes(q))
})
const productCombinations = ref<any[]>([])
const taxRules = ref<Array<{ id: number; label: string; rate: number }>>([])
const images = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)

const showArchiveModal = ref(false)
function onArchived(res: any) {
  showArchiveModal.value = false
  const n = res?.redirects?.length || 0
  navigateTo(`/hub/products?archived=${route.params.id}&redirects=${n}`)
}
const saveError = ref<string | null>(null)
const combinationsRef = ref<{ getDirtyCombinations: () => Array<{ id: number | null; attributeIds: number[]; priceImpact: number; quantity: number; reference: string }> } | null>(null)

const form = reactive({
  name: '',
  reference: '',
  ean13: '',
  descriptionShort: '',
  description: '',
  wholesalePrice: 0,
  priceHT: 0,
  taxRulesGroupId: 0,
  stock: 0,
  weight: 0,
  width: 0,
  height: 0,
  depth: 0,
  availableForOrder: true,
  showPrice: true,
  active: true,
  metaTitle: '',
  metaDescription: '',
  linkRewrite: '',
  defaultCategoryId: 0,
  additionalShippingCost: 0,
  deliveryInStock: '',
  deliveryOutStock: '',
  carrierRefs: [] as number[],
  
  priceDisplayMode: null as 'unit' | 'kg' | null,
  
  unity: '',
  
  unitPriceRatio: 0,
})

const productFrontUrl = ref<string>('#')

async function refreshProductFrontUrl() {
  const id = Number(product.value?.id ?? route.params.id)
  if (!id) { productFrontUrl.value = '#'; return }
  try {
    const res = await $fetch<{ found: boolean; path?: string }>(
      `/api/product-url-by-id`,
      { query: { id, lang: currentLangId.value } },
    )
    if (res?.found && res.path) {
      productFrontUrl.value = res.path
      return
    }
  } catch (err) {
    console.warn('refreshProductFrontUrl error', err)
  }
  const slug = form.linkRewrite || product.value?.slug || ''
  productFrontUrl.value = slug ? `/p/${id}-${slug}` : `/p/${id}`
}

type ProductTab = 'essentiel' | 'description' | 'livraison' | 'seo' | 'crossell'
const activeTab = ref<ProductTab>('essentiel')
const tabs = computed<Array<{ id: ProductTab; label: string }>>(() => [
  { id: 'essentiel', label: t('hub.ui.product.tab_essential', 'Essentiel') },
  { id: 'description', label: t('hub.ui.product.tab_description', 'Description') },
  { id: 'livraison', label: t('hub.ui.product.tab_shipping', 'Livraison') },
  { id: 'crossell', label: t('hub.ui.product.tab_crosssell', 'Cross-selling') },
  { id: 'seo', label: t('hub.ui.product.tab_seo', 'Référencement') },
])

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/bo/products/${route.params.id}`, {
      query: { lang: currentLangId.value },
    })
    product.value = data.product
    features.value = data.features ?? []
    specificPrices.value = data.specificPrices ?? []
    productCategories.value = data.categories ?? []
    productCombinations.value = data.combinations ?? []
    taxRules.value = (data.taxRules ?? []).map((r: any) => ({ id: Number(r.id), label: String(r.label), rate: Number(r.rate) }))
    images.value = (data.images ?? []).map((img: any) => ({
      id: img.id,
      cover: !!img.cover,
      position: img.position,
      
      
      url: img.url ?? (product.value?.id ? `/img/p/${String(img.id).split('').join('/')}/${img.id}.jpg` : undefined),
    }))

    const p = data.product
    form.name = p.name || ''
    form.reference = p.reference || ''
    form.ean13 = p.ean13 || ''
    form.descriptionShort = p.descriptionShort || ''
    form.description = p.description || ''
    form.wholesalePrice = Number(p.wholesalePrice) || 0
    form.priceHT = Number(p.priceHT) || 0
    form.taxRulesGroupId = Number(p.taxRulesGroupId) || 0
    form.stock = Number(p.stock) || 0
    form.weight = Number(p.weight) || 0
    form.width = Number(p.width) || 0
    form.height = Number(p.height) || 0
    form.depth = Number(p.depth) || 0
    form.availableForOrder = p.availableForOrder === null || p.availableForOrder === undefined ? true : !!p.availableForOrder
    form.showPrice = p.showPrice === null || p.showPrice === undefined ? true : !!p.showPrice
    form.additionalShippingCost = Number(p.additionalShippingCost) || 0
    form.deliveryInStock = p.deliveryInStock || ''
    form.deliveryOutStock = p.deliveryOutStock || ''
    form.carrierRefs = Array.isArray(data.carrierRefs) ? data.carrierRefs.map((n: any) => Number(n)).filter(Boolean) : []
    form.active = !!p.active
    form.metaTitle = p.metaTitle || ''
    form.metaDescription = p.metaDescription || ''
    
    
    
    form.linkRewrite = p.slug || (p.name ? slugify(p.name) : '')
    form.defaultCategoryId = Number(p.categoryId) || 0
    
    const rawMode = data.priceDisplayMode
    form.priceDisplayMode = (rawMode === 'unit' || rawMode === 'kg') ? rawMode : null
    
    form.unity = p.unity || ''
    form.unitPriceRatio = Number(p.unitPriceRatio) || 0
    await refreshProductFrontUrl()
  } catch (err) {
    console.error('Load product error:', err)
    product.value = null
  } finally {
    loading.value = false
  }
}

function slugify(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = null
  
  
  if (!form.linkRewrite || !form.linkRewrite.trim()) {
    if (form.name && form.name.trim()) form.linkRewrite = slugify(form.name)
  }
  try {
    
    
    
    const dirtyCombinations = combinationsRef.value?.getDirtyCombinations() ?? []
    const existingCombos = dirtyCombinations.filter(c => c.id !== null)
    const freshCombos = dirtyCombinations.filter(c => c.id === null && c.attributeIds.length > 0)
    const categoryIds = productCategories.value.map((c: any) => Number(c.id)).filter(Boolean)

    const payload = {
      name: form.name,
      reference: form.reference,
      ean13: form.ean13,
      descriptionShort: form.descriptionShort,
      description: form.description,
      wholesalePrice: form.wholesalePrice,
      priceHT: form.priceHT,
      taxRulesGroupId: form.taxRulesGroupId,
      stock: form.stock,
      weight: form.weight,
      width: form.width,
      height: form.height,
      depth: form.depth,
      availableForOrder: form.availableForOrder,
      showPrice: form.showPrice,
      active: form.active,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      linkRewrite: form.linkRewrite,
      additionalShippingCost: form.additionalShippingCost,
      deliveryInStock: form.deliveryInStock,
      deliveryOutStock: form.deliveryOutStock,
      carrierRefs: form.carrierRefs,
      categoryId: form.defaultCategoryId,
      categoryIds,
      combinations: existingCombos,
      priceDisplayMode: form.priceDisplayMode,
      unity: form.unity,
      unitPriceRatio: form.unitPriceRatio,
    }

    await $fetch(`/api/bo/products/${route.params.id}`, {
      method: 'PUT',
      query: { lang: currentLangId.value },
      body: payload,
    })

    
    if (freshCombos.length) {
      await $fetch(`/api/bo/products/${route.params.id}/combinations`, {
        method: 'POST',
        query: { lang: currentLangId.value },
        body: { combinations: freshCombos },
      })
    }
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (err: any) {
    console.error('Save error:', err)
    saveError.value = err?.data?.message || err?.message || t('hub.ui.product.save_failed', 'Échec de la sauvegarde')
    setTimeout(() => { saveError.value = null }, 6000)
  } finally {
    saving.value = false
  }
}

function formatEur(n: number) {
  return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

const imageUploading = ref(false)
const imageUploadError = ref<string | null>(null)

function onUploadRequest() {
  if (imageUploading.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    await uploadProductImage(file)
  }
  input.click()
}

async function uploadProductImage(file: File) {
  imageUploading.value = true
  imageUploadError.value = null
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ id: number; cover: boolean; position: number; url: string }>(
      `/api/bo/products/${route.params.id}/images`,
      { method: 'POST', body: fd },
    )
    images.value = [
      ...images.value,
      { id: res.id, cover: res.cover, position: res.position, url: `${res.url}?t=${Date.now()}` },
    ].sort((a, b) => Number(a.position) - Number(b.position))
  } catch (err: any) {
    console.error('upload image error', err)
    imageUploadError.value = err?.data?.message || err?.message || t('hub.ui.product.upload_failed', 'Échec upload')
    setTimeout(() => { imageUploadError.value = null }, 6000)
  } finally {
    imageUploading.value = false
  }
}

async function onImageRemove(id: number | string) {
  const idImage = Number(id)
  if (!Number.isInteger(idImage) || idImage <= 0) return
  try {
    await $fetch(`/api/bo/products/${route.params.id}/images/${idImage}`, { method: 'DELETE' })
    const removed = images.value.find((i) => Number(i.id) === idImage)
    images.value = images.value.filter((i) => Number(i.id) !== idImage)
    if (removed?.cover && images.value.length) {
      images.value = images.value.map((i, idx) => ({ ...i, cover: idx === 0 }))
    }
  } catch (err: any) {
    console.error('remove image error', err)
    imageUploadError.value = err?.data?.message || err?.message || t('hub.ui.product.delete_failed', 'Échec suppression')
    setTimeout(() => { imageUploadError.value = null }, 6000)
  }
}

async function onImageSetCover(id: number | string) {
  const idImage = Number(id)
  if (!Number.isInteger(idImage) || idImage <= 0) return
  try {
    await $fetch(`/api/bo/products/${route.params.id}/images/${idImage}/cover`, { method: 'POST' })
    images.value = images.value.map((i) => ({ ...i, cover: Number(i.id) === idImage }))
  } catch (err: any) {
    console.error('set cover error', err)
    imageUploadError.value = err?.data?.message || err?.message || t('hub.product.images.set_cover_failed', 'Échec du choix de couverture')
    setTimeout(() => { imageUploadError.value = null }, 6000)
  }
}

function onCategoryRemove(id: number) {
  productCategories.value = productCategories.value.filter((c: any) => c.id !== id)
  if (form.defaultCategoryId === id) form.defaultCategoryId = 0
}

async function onCategoryAddRequest() {
  showCategoryPicker.value = true
  pickerSelected.value = new Set()
  pickerFilter.value = ''
  if (pickerAllCategories.value.length) return
  pickerLoading.value = true
  try {
    const data = await $fetch<any>('/api/bo/categories', { query: { perPage: 10000, page: 1 } })
    pickerAllCategories.value = (data?.categories ?? []).map((c: any) => ({
      id: Number(c.id),
      name: String(c.name || `#${c.id}`),
      depth: Number(c.depth ?? 0),
    }))
  } catch (err) {
    console.error('[picker] categories load error', err)
  } finally {
    pickerLoading.value = false
  }
}

function closePicker() {
  showCategoryPicker.value = false
  pickerFilter.value = ''
  pickerSelected.value = new Set()
}

function togglePickerItem(id: number) {
  const next = new Set(pickerSelected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  pickerSelected.value = next
}

function onPickerConfirm() {
  const alreadyIds = new Set(productCategories.value.map((c: any) => Number(c.id)))
  const toAdd = pickerAllCategories.value.filter((c) => pickerSelected.value.has(c.id) && !alreadyIds.has(c.id))
  productCategories.value = [...productCategories.value, ...toAdd]
  if (!form.defaultCategoryId && toAdd.length) {
    form.defaultCategoryId = toAdd[0].id
  }
  closePicker()
}

interface AccessoryRule { src: number; dst: number; srcName: string; dstName: string; srcRef: string; dstRef: string }
const accessories = ref<AccessoryRule[]>([])
const accessoriesLoading = ref(false)
const accessoriesError = ref<string | null>(null)
const addSearch = ref('')
const addResults = ref<Array<{ id: number; name: string; reference?: string }>>([])
const addSearchLoading = ref(false)
const addSearchTimer = ref<any>(null)
const addingId = ref<number | null>(null)
const addFeedback = ref<{ msg: string; ok: boolean } | null>(null)

async function loadAccessories() {
  if (!route.params.id) return
  accessoriesLoading.value = true
  accessoriesError.value = null
  try {
    const data = await $fetch<any>('/api/bo/products/cross-sell/rules', {
      query: { src: Number(route.params.id) },
    })
    accessories.value = data?.rules || []
  } catch (err: any) {
    accessoriesError.value = err?.data?.message || t('hub.ui.product.accessories_load_failed', 'Impossible de charger les accessoires')
  } finally {
    accessoriesLoading.value = false
  }
}

function onAddSearchInput() {
  clearTimeout(addSearchTimer.value)
  const q = addSearch.value.trim()
  if (q.length < 2) {
    addResults.value = []
    return
  }
  addSearchTimer.value = setTimeout(async () => {
    addSearchLoading.value = true
    try {
      const data = await $fetch<any>('/api/bo/products', {
        query: { search: q, perPage: 15, page: 1 },
      })
      const currentId = Number(route.params.id)
      const takenIds = new Set(accessories.value.map(a => a.dst))
      addResults.value = (data?.products || [])
        .filter((p: any) => Number(p.id) !== currentId)
        .map((p: any) => ({
          id: Number(p.id),
          name: p.name || `#${p.id}`,
          reference: p.reference || '',
          alreadyLinked: takenIds.has(Number(p.id)),
        }))
    } catch { addResults.value = [] }
    finally { addSearchLoading.value = false }
  }, 250)
}

async function addAccessory(p: { id: number; name: string; reference?: string }) {
  const src = Number(route.params.id)
  if (!src || !p.id || src === p.id) return
  addingId.value = p.id
  addFeedback.value = null
  try {
    const res = await $fetch<any>('/api/bo/products/cross-sell/rules', {
      method: 'POST',
      body: { src, dst: p.id },
    })
    if (res?.alreadyExists) {
      addFeedback.value = { msg: t('hub.ui.product.accessory_already', '{name} déjà présent dans les accessoires', { name: p.name }), ok: false }
    } else {
      addFeedback.value = { msg: t('hub.ui.product.accessory_added', '{name} ajouté', { name: p.name }), ok: true }
    }
    addSearch.value = ''
    addResults.value = []
    await loadAccessories()
  } catch (err: any) {
    addFeedback.value = { msg: err?.statusMessage || t('hub.ui.product.accessory_add_error', 'Erreur lors de l\'ajout'), ok: false }
  } finally {
    addingId.value = null
    setTimeout(() => { addFeedback.value = null }, 4000)
  }
}

async function removeAccessory(dst: number) {
  const src = Number(route.params.id)
  if (!src || !dst) return
  try {
    await $fetch('/api/bo/products/cross-sell/rules', {
      method: 'DELETE',
      query: { src, dst },
    })
    await loadAccessories()
  } catch (err: any) {
    accessoriesError.value = err?.data?.message || t('hub.ui.product.accessory_remove_failed', 'Suppression échouée')
  }
}

const prodInstructions = ref('')
const prodRedactionGenerating = ref(false)
const prodRedactionStatus = ref<string | null>(null)
const prodRedactionStatusClass = ref('text-gray-400')
const prodRedactionResult = ref<{ short_description: string; long_description: string; meta_title: string; meta_description: string; optimized_slug: string } | null>(null)

async function requestProductContent() {
  if (!form.name || !route.params.id) return
  prodRedactionGenerating.value = true
  prodRedactionStatus.value = t('hub.ui.product.sending', 'Envoi…')
  prodRedactionResult.value = null
  try {
    const res = await $fetch<any>('/api/bo/products/generate-content', {
      method: 'POST',
      body: { id_product: Number(route.params.id), name: form.name, slug: form.linkRewrite || form.reference, instructions: prodInstructions.value || undefined },
    })
    prodRedactionStatus.value = res.message || t('hub.ui.product.queued', 'En queue')
    prodRedactionStatusClass.value = 'text-violet-500'
    startProdRedactionPoll()
  } catch (err: any) {
    prodRedactionGenerating.value = false
    prodRedactionStatus.value = err?.data?.message || t('hub.ui.product.error', 'Erreur')
    prodRedactionStatusClass.value = 'text-red-500'
  }
}

let prodRedactionPollTimer: ReturnType<typeof setInterval> | null = null
function startProdRedactionPoll() {
  if (prodRedactionPollTimer) clearInterval(prodRedactionPollTimer)
  prodRedactionPollTimer = setInterval(checkProdRedactionStatus, 20000)
}

async function checkProdRedactionStatus() {
  try {
    const data = await $fetch<any>('/api/bo/products/content-status', { query: { id_product: route.params.id } })
    if (!data.found) return
    if (data.status === 'done' && data.short_description) {
      prodRedactionGenerating.value = false
      prodRedactionResult.value = {
        short_description: data.short_description || '',
        long_description: data.long_description || '',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        optimized_slug: data.optimized_slug || '',
      }
      prodRedactionStatus.value = t('hub.ui.product.writing_done', 'Rédaction terminée')
      prodRedactionStatusClass.value = 'text-emerald-600'
      if (prodRedactionPollTimer) clearInterval(prodRedactionPollTimer)
    } else if (data.status === 'error') {
      prodRedactionGenerating.value = false
      prodRedactionStatus.value = t('hub.ui.product.error_msg', 'Erreur : {msg}', { msg: data.error_msg || t('hub.ui.product.unknown', 'inconnue') })
      prodRedactionStatusClass.value = 'text-red-500'
      if (prodRedactionPollTimer) clearInterval(prodRedactionPollTimer)
    } else if (data.status === 'processing') {
      prodRedactionStatus.value = t('hub.ui.product.seo_regenerating', 'Régénération SEO en cours…')
      prodRedactionStatusClass.value = 'text-violet-500'
    } else if (data.status === 'pending') {
      prodRedactionStatus.value = t('hub.ui.product.in_queue', 'En file d\'attente')
      prodRedactionStatusClass.value = 'text-violet-400'
    }
  } catch {  }
}

function applyProductContent() {
  if (!prodRedactionResult.value) return
  if (prodRedactionResult.value.short_description) form.descriptionShort = prodRedactionResult.value.short_description
  if (prodRedactionResult.value.long_description) form.description = prodRedactionResult.value.long_description
  prodRedactionStatus.value = t('hub.ui.product.summary_desc_applied', 'Résumé + Description appliqués')
  prodRedactionStatusClass.value = 'text-emerald-600'
}

function applyProductSeo() {
  if (!prodRedactionResult.value) return
  if (prodRedactionResult.value.meta_title) form.metaTitle = prodRedactionResult.value.meta_title
  if (prodRedactionResult.value.meta_description) form.metaDescription = prodRedactionResult.value.meta_description
  if (prodRedactionResult.value.optimized_slug) form.linkRewrite = prodRedactionResult.value.optimized_slug
  prodRedactionStatus.value = t('hub.ui.product.seo_applied_save', 'SEO appliqué — pensez à Enregistrer')
  prodRedactionStatusClass.value = 'text-emerald-600'
}

const aiMode = ref<'centaure' | 'api'>('centaure')
const centaurePrompt = ref('')
const centaureResponse = ref('')
const centaurePromptCopied = ref(false)

let promptBrand: Promise<ProductPromptBrand> | null = null
function loadPromptBrand(): Promise<ProductPromptBrand> {
  if (!promptBrand) {
    promptBrand = Promise.all([
      $fetch<{ brief: Record<string, string> }>('/api/bo/brand-brief').catch(() => null),
      $fetch<{ info: Record<string, string> }>('/api/hub/configuration/shop-info').catch(() => null),
    ]).then(([b, s]) => ({
      shopName: s?.info?.PS_SHOP_NAME,
      audience: b?.brief?.audience || s?.info?.PS_AC_TENANT_AUDIENCE,
      sectorTopics: b?.brief?.sector_topics,
      tone: b?.brief?.tone,
      forbiddenWords: b?.brief?.forbidden_words,
    }))
  }
  return promptBrand
}

async function generateCentaurePrompt() {
  const name = form.name?.trim() || ''
  const productRef = form.reference?.trim() || ''
  const instr = prodInstructions.value?.trim() || ''
  const existingShort = (form.descriptionShort || '').replace(/<[^>]+>/g, ' ').trim()
  const existingLong = (form.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 400)

  const context = productPromptContext(await loadPromptBrand(), 'redaction')

  centaurePrompt.value = `${context}
${instr ? `\nConsignes : ${instr}\n` : ''}
Produit : **${name}**${productRef ? ` (réf. ${productRef})` : ''}
${existingShort ? `\nRésumé existant à enrichir :\n${existingShort}\n` : ''}${existingLong ? `\nDescription existante à enrichir :\n${existingLong}\n` : ''}
Rédige :

1. Un **résumé** court (2–3 phrases, 150–250 caractères) qui positionne le produit — affiché sur la fiche et les grilles catalogue. HTML simple (<p>).
2. Une **description longue** (400–700 mots) pour la fiche produit : caractéristiques, usages, arguments d'achat utiles à la cible (conditionnement, compatibilité, origine, entretien… selon le produit), structure claire avec <h3>/<p>/<ul>. Pas de <h1>/<h2>.

Format de réponse EXACT :

---SUMMARY---
(HTML du résumé ici)
---DESCRIPTION---
(HTML de la description longue ici)`
}

function copyCentaurePrompt() {
  navigator.clipboard.writeText(centaurePrompt.value)
  centaurePromptCopied.value = true
  setTimeout(() => { centaurePromptCopied.value = false }, 2000)
}

function applyCentaureResponse() {
  const raw = centaureResponse.value.trim()
  if (!raw) return
  const sum = raw.match(/---SUMMARY---\s*\n([\s\S]*?)(?=---DESCRIPTION---|$)/i)
  const desc = raw.match(/---DESCRIPTION---\s*\n([\s\S]*?)$/i)

  if (sum) form.descriptionShort = sum[1].trim().replace(/^```html?\s*\n?/, '').replace(/\n?```\s*$/, '')
  if (desc) form.description = desc[1].trim().replace(/^```html?\s*\n?/, '').replace(/\n?```\s*$/, '')

  prodRedactionStatus.value = t('hub.ui.product.centaure_applied', 'Résumé + Description Centaure appliqués')
  prodRedactionStatusClass.value = 'text-emerald-600'
}

const seoMode = ref<'centaure' | 'api'>('centaure')
const seoPrompt = ref('')
const seoResponse = ref('')
const seoPromptCopied = ref(false)
const seoApplyStatus = ref<string | null>(null)
const seoApplyStatusClass = ref('text-gray-400')

async function generateSeoPrompt() {
  const name = form.name?.trim() || ''
  const productRef = form.reference?.trim() || ''
  const slug = form.linkRewrite?.trim() || ''
  const instr = prodInstructions.value?.trim() || ''
  const sum = (form.descriptionShort || '').replace(/<[^>]+>/g, ' ').trim()
  const desc = (form.description || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 800)

  const context = productPromptContext(await loadPromptBrand(), 'seo')

  seoPrompt.value = `${context}
Objectif : maximiser le CTR Google.
${instr ? `\nConsignes : ${instr}\n` : ''}
Produit : **${name}**${productRef ? ` (réf. ${productRef})` : ''}
${sum ? `\nRésumé :\n${sum}\n` : ''}${desc ? `\nContexte (description) :\n${desc}\n` : ''}
Produis :

1. **meta_title** optimisé CTR — ≤ 60 caractères, angle bénéfice concret + caractéristique distinctive (format, compatibilité, volume…).
2. **meta_description** — 145–160 caractères, pitch + appel à l'action implicite.
3. **slug** minuscules, tirets, sans stop word ni accent (ex: nom-du-produit-caracteristique).

Format de réponse EXACT :

---META_TITLE---
(title ici)
---META_DESCRIPTION---
(description ici)
---SLUG---
(slug ici)

Slug actuel à améliorer si pertinent : ${slug || '(vide)'}`
}

function copySeoPrompt() {
  navigator.clipboard.writeText(seoPrompt.value)
  seoPromptCopied.value = true
  setTimeout(() => { seoPromptCopied.value = false }, 2000)
}

function applySeoResponse() {
  const raw = seoResponse.value.trim()
  if (!raw) return
  const mt = raw.match(/---META_TITLE---\s*\n([\s\S]*?)(?=---META_DESCRIPTION---|---SLUG---|$)/i)
  const md = raw.match(/---META_DESCRIPTION---\s*\n([\s\S]*?)(?=---SLUG---|$)/i)
  const sl = raw.match(/---SLUG---\s*\n([\s\S]*?)$/i)

  if (mt) form.metaTitle = mt[1].trim()
  if (md) form.metaDescription = md[1].trim()
  if (sl) form.linkRewrite = sl[1].trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  seoApplyStatus.value = t('hub.ui.product.seo_optim_applied', 'Optimisations SEO appliquées — pensez à Enregistrer')
  seoApplyStatusClass.value = 'text-emerald-600'
  setTimeout(() => { seoApplyStatus.value = null }, 5000)
}

onMounted(() => {
  load()
  
  if (route.params.id && route.params.id !== 'new') {
    checkProdRedactionStatus()
    loadAccessories()
  }
})

onUnmounted(() => {
  if (prodRedactionPollTimer) clearInterval(prodRedactionPollTimer)
})

watch(currentLangId, (newId, oldId) => {
  if (newId !== oldId && !loading.value) load()
})
</script>
