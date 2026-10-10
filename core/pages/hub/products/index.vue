<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.products.title', 'Produits') }}</h1>
          <p class="text-xs text-gray-400 mt-0.5">{{ total > 1 ? t('hub.ui.products.count_other', '{n} produits', { n: total }) : t('hub.ui.products.count_one', '{n} produit', { n: total }) }}</p>
        </div>
        <button
          v-if="categoryId"
          type="button"
          @click="clearCategoryFilter"
          class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-950/60 transition-colors"
          :title="t('hub.ui.products.remove_category_filter', 'Retirer le filtre catégorie')"
        >
          <span>{{ t('hub.ui.products.category_chip', 'Catégorie : {name}', { name: categoryName || `#${categoryId}` }) }}</span>
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="search" type="text" :placeholder="t('hub.ui.products.search_placeholder', 'Nom, réf, EAN…')" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">{{ t('hub.ui.products.search', 'Rechercher') }}</button>
        <a
          href="/api/bo/products/export"
          download
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          :title="t('hub.ui.products.export_title', 'Télécharger le catalogue complet (CSV)')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          {{ t('hub.ui.products.export', 'Exporter') }}
        </a>
        <button
          @click="importOpen = true"
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          :title="t('hub.ui.products.import_title', 'Importer des produits depuis un CSV')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          {{ t('hub.ui.products.import', 'Importer') }}
        </button>
        <NuxtLink to="/hub/products/create" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          {{ t('hub.ui.products.new', 'Nouveau') }}
        </NuxtLink>
      </div>
    </header>

    <Transition enter-active-class="transition duration-150" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-150" leave-to-class="-translate-y-2 opacity-0">
      <div v-if="archiveToast" class="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2.5 flex items-center gap-2 shrink-0">
        <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
        <span class="text-xs font-medium text-emerald-700 dark:text-emerald-300">{{ archiveToast }}</span>
      </div>
    </Transition>

    <HubImportModal
      :open="importOpen"
      :title="t('hub.ui.products.import_modal_title', 'Importer des produits')"
      :subtitle="t('hub.ui.products.import_modal_subtitle', 'CSV ou XLSX — UPSERT par référence ou EAN13. Champs : nom, prix HT, stock, poids brut, ratio prix unit., colisage (qté min), unité, TVA, catégorie, résumé, description.')"
      endpoint="/api/bo/products/import"
      entity="product"
      :target-fields="importTargetFields"
      :field-aliases="importFieldAliases"
      :matching-keys="['reference', 'ean13']"
      template-url="/import-templates/products-fr.csv"
      :template-label="t('hub.ui.products.import_template_label', 'Télécharger le modèle CSV (exemple FR)')"
      :lang-options="importLangOptions"
      :default-lang="currentLangId"
      :create-missing-label="t('hub.ui.products.import_create_missing_label', 'Créer les produits manquants')"
      :create-missing-hint="t('hub.ui.products.import_create_missing_hint', 'Insère un nouveau produit si la référence (ou l\'EAN13) n\'existe pas encore. Les catégories manquantes sont créées automatiquement. Produit créé actif, sans image. Désactivé par défaut pour rester safe.')"
      @close="importOpen = false"
      @done="onImportDone"
    />

    
    <Transition enter-active-class="transition duration-150" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-100" leave-to-class="-translate-y-2 opacity-0">
      <div v-if="selected.size > 0" class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 px-6 py-2.5 flex items-center gap-4 shrink-0">
        <span class="text-xs font-medium text-slate-600 dark:text-slate-300">
          {{ selected.size > 1 ? t('hub.ui.products.selected_other', '{n} produits sélectionnés', { n: selected.size }) : t('hub.ui.products.selected_one', '{n} produit sélectionné', { n: selected.size }) }}
        </span>
        <button @click="bulkSeo" :disabled="bulkLoading || selected.size === 0" class="text-xs px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" /></svg>
          {{ t('hub.products.bulk_seo.button', 'Régénérer le SEO') }}
        </button>
        <button @click="bulkDisable" :disabled="bulkLoading" class="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          {{ t('hub.ui.products.disable', 'Désactiver') }}
        </button>
        <button @click="bulkDeleteOpen = true" :disabled="bulkLoading" class="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
          {{ t('hub.ui.products.delete', 'Supprimer') }}
        </button>
        <button @click="selected.clear(); selectedProducts.clear()" class="text-xs text-slate-400 hover:text-slate-600 transition-colors">{{ t('hub.ui.products.deselect', 'Désélectionner') }}</button>
        <span v-if="bulkStatus" class="text-xs ml-auto" :class="bulkStatusClass">{{ bulkStatus }}</span>
      </div>
    </Transition>

    
    <HubSeoBulkProgress ref="seoProgress" entity="product" />

    
    <div v-if="bulkDeleteOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ selected.size > 1 ? t('hub.ui.products.delete_title_other', 'Supprimer {n} produits ?', { n: selected.size }) : t('hub.ui.products.delete_title_one', 'Supprimer {n} produit ?', { n: selected.size }) }}</h2>
        <p class="text-xs text-gray-500 dark:text-slate-400">
          {{ t('hub.ui.products.delete_warning', 'Action irréversible. Les images, le stock, les combinaisons et les associations catégories seront supprimés.\n          Les commandes existantes ne sont pas affectées.') }}
        </p>
        <div class="flex gap-3 pt-2">
          <button @click="bulkDeleteOpen = false" class="flex-1 text-sm px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            {{ t('hub.ui.products.cancel', 'Annuler') }}
          </button>
          <button @click="bulkDelete" :disabled="bulkLoading" class="flex-1 text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors font-medium">
            {{ bulkLoading ? t('hub.ui.products.deleting', 'Suppression…') : t('hub.ui.products.confirm', 'Confirmer') }}
          </button>
        </div>
      </div>
    </div>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.products.pagination_label', 'produits')" :per-page="perPage" :per-page-options="perPageOptions" @go="goPage" @update:per-page="setPerPage" class="border-b border-gray-100 dark:border-slate-800" />

    
    <div class="px-6 py-1.5 flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 text-xs shrink-0">
      <button
        type="button"
        @click="selectIncomplete"
        :disabled="incompleteVisibleCount === 0"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        :title="t('hub.seo_coverage.select_incomplete_hint', 'Sélectionne les produits chargés dont le SEO FR est incomplet (à optimiser via « Régénérer le SEO »)')"
      >
        <span class="w-2 h-2 rounded-full bg-amber-400" />
        {{ t('hub.seo_coverage.select_incomplete', 'Sélectionner les incomplets') }} ({{ incompleteVisibleCount }})
      </button>
      <span class="text-gray-400">{{ t('hub.seo_coverage.legend', 'SEO FR : vert = complet · ambre = partiel · rouge = vide') }}</span>
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-4 py-2.5 font-medium w-10">
              <input type="checkbox" :checked="allSelected" :indeterminate="someSelected && !allSelected" @change="toggleAll" class="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
            </th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('id')">{{ t('hub.ui.products.col_id', 'ID') }} <span v-if="sortBy === 'id'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span></th>
            <th class="px-2 py-2.5 font-medium w-12">{{ t('hub.ui.products.col_image', 'Image') }}</th>
            <th class="px-4 py-2.5 font-medium cursor-pointer hover:text-gray-600" @click="toggleSort('name')">{{ t('hub.ui.products.col_name', 'Nom') }} <span v-if="sortBy === 'name'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span></th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.products.col_ref', 'Réf.') }}</th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.products.col_category', 'Catégorie') }}</th>
            <th class="px-4 py-2.5 font-medium text-right cursor-pointer hover:text-gray-600" @click="toggleSort('price')">{{ t('hub.ui.products.col_price_ht', 'Prix HT') }} <span v-if="sortBy === 'price'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span></th>
            <th v-if="isFood" class="px-4 py-2.5 font-medium text-right" :title="t('hub.ui.products.col_unit_price_tip', 'Prix au kilo / litre / unité — calculé depuis unit_price_ratio + unity (fallback poids)')">{{ t('hub.ui.products.col_unit_price', 'Prix unitaire') }}</th>
            <th class="px-4 py-2.5 font-medium text-center cursor-pointer hover:text-gray-600" @click="toggleSort('stock')">{{ t('hub.ui.products.col_stock', 'Stock') }} <span v-if="sortBy === 'stock'">{{ sortDir === 'ASC' ? '↑' : '↓' }}</span></th>
            <th class="px-4 py-2.5 font-medium text-center">{{ t('hub.ui.products.col_active', 'Actif') }}</th>
            <th class="px-4 py-2.5 font-medium text-center" :title="t('hub.seo_coverage.column_hint', 'Complétude SEO source FR (méta-titre, méta-description, description)')">SEO</th>
          </tr>
          
          <tr class="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <th class="px-2 py-1.5">
              <button v-if="hasActiveColFilter" @click="clearColFilters"
                class="text-[10px] text-primary-600 hover:underline whitespace-nowrap" :title="t('hub.ui.products.reset', 'Réinitialiser')">×</button>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fId" type="text" placeholder="#" class="filter-input" /></th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5"><input v-model="colFilters.fName" type="text" :placeholder="t('hub.ui.products.filter_name', 'Nom…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fReference" type="text" :placeholder="t('hub.ui.products.filter_ref', 'Réf…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCategory" type="text" :placeholder="t('hub.ui.products.filter_category', 'Catégorie…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model.number="colFilters.fPriceMin" type="number" min="0" step="1" :placeholder="t('hub.ui.products.filter_min_price', 'Min €')" class="filter-input text-right tabular-nums" /></th>
            <th v-if="isFood" class="px-2 py-1.5" />
            <th class="px-2 py-1.5"><input v-model.number="colFilters.fStockMin" type="number" min="0" step="1" :placeholder="t('hub.ui.products.filter_min', 'Min')" class="filter-input text-center tabular-nums" /></th>
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fActive" class="filter-input">
                <option value="">{{ t('hub.ui.products.filter_all', 'Tous') }}</option>
                <option value="1">{{ t('hub.ui.products.filter_active', 'Actif') }}</option>
                <option value="0">{{ t('hub.ui.products.filter_inactive', 'Inactif') }}</option>
              </select>
            </th>
            <th class="px-2 py-1.5">
              <select v-model="seoFilter" class="filter-input" :title="t('hub.seo_coverage.filter_hint', 'Filtrer par complétude SEO (page chargée)')">
                <option value="">{{ t('hub.seo_coverage.filter_all', 'SEO : tous') }}</option>
                <option value="incomplete">{{ t('hub.seo_coverage.filter_incomplete', 'Incomplets') }}</option>
                <option value="empty">{{ t('hub.seo_coverage.empty', 'Vide') }}</option>
                <option value="partial">{{ t('hub.seo_coverage.partial', 'Partiel') }}</option>
                <option value="complete">{{ t('hub.seo_coverage.complete', 'Complet') }}</option>
              </select>
            </th>
          </tr>
        </thead>
        <tbody>
          <HubTableSkeletonRows v-if="loading && !products.length" :rows="10" :colspan="12" />
          <tr v-else-if="!products.length">
            <td colspan="12" class="text-center py-20 text-sm text-gray-400">{{ t('hub.ui.products.none_found', 'Aucun produit trouvé') }}</td>
          </tr>
          <tr v-else-if="!visibleProducts.length">
            <td colspan="12" class="text-center py-20 text-sm text-gray-400">{{ t('hub.seo_coverage.none_match', 'Aucun produit ne correspond au filtre SEO') }}</td>
          </tr>
          <tr v-else v-for="p in visibleProducts" :key="p.id" class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" @click="$router.push(`/hub/products/${p.id}`)">
            <td class="px-4 py-2.5" @click.stop>
              <input type="checkbox" :checked="selected.has(p.id)" @change="toggleSelect(p)" class="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
            </td>
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">#{{ p.id }}</td>
            <td class="px-2 py-1.5" @click.stop="openImageModal(p)">
              <img v-if="p.imageUrl && !p._imgError" :src="p.imageUrl" :alt="p.name" loading="lazy" decoding="async" class="h-10 w-10 object-cover rounded cursor-pointer hover:ring-2 hover:ring-primary-400 hover:scale-110 transition-all" @error="p._imgError = true" />
              <div v-else class="h-10 w-10 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg>
              </div>
            </td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100 max-w-[250px] truncate">{{ p.name }}</td>
            <td class="px-4 py-2.5 font-mono text-xs text-gray-400">{{ p.reference || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ p.categoryName || '—' }}</td>
            <td class="px-4 py-2.5 text-right font-medium" @click.stop="startEditPrice(p)">
              <input
                v-if="editingPrice === p.id"
                :ref="(el) => { if (el) priceInputRef = (el as HTMLInputElement) }"
                v-model.number="editPriceValue"
                type="number"
                step="0.01"
                min="0"
                class="w-24 text-right text-sm border border-primary-300 dark:border-primary-600 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-800"
                @keyup.enter="savePrice(p)"
                @blur="savePrice(p)"
                @click.stop
              />
              <span v-else class="hover:text-primary-600 hover:underline cursor-text">{{ formatEur(p.priceHT) }}</span>
            </td>
            <td v-if="isFood" class="px-4 py-2.5 text-right text-xs text-gray-500 dark:text-slate-400 font-mono">
              <template v-if="computeUnitPrice(p)">
                {{ formatEur(computeUnitPrice(p)!.value) }}
                <span class="text-[10px] text-gray-400 ml-0.5">{{ computeUnitPrice(p)!.label }}</span>
              </template>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-center" @click.stop="startEditStock(p)">
              <input
                v-if="editingStock === p.id"
                :ref="(el) => { if (el) stockInputRef = (el as HTMLInputElement) }"
                v-model.number="editStockValue"
                type="number"
                step="1"
                min="0"
                class="w-20 text-center text-sm border border-primary-300 dark:border-primary-600 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-800"
                @keyup.enter="saveStock(p)"
                @blur="saveStock(p)"
                @click.stop
              />
              <span v-else class="font-medium hover:text-primary-600 hover:underline cursor-text" :class="p.stock <= 0 ? 'text-red-600' : p.stock < 5 ? 'text-amber-600' : 'text-gray-800 dark:text-slate-100'">{{ p.stock }}</span>
            </td>
            <td class="px-4 py-2.5 text-center" @click.stop="toggleActive(p)">
              <button
                :title="p.active ? t('hub.ui.products.disable', 'Désactiver') : t('hub.ui.products.activate', 'Activer')"
                class="group relative"
                :disabled="savingActive === p.id"
              >
                <span v-if="savingActive === p.id" class="w-3 h-3 border-2 border-gray-300 border-t-primary-500 rounded-full inline-block animate-spin" />
                <span v-else-if="p.active" class="w-2.5 h-2.5 rounded-full bg-green-400 inline-block ring-2 ring-transparent group-hover:ring-green-200 transition-all" />
                <span v-else class="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block ring-2 ring-transparent group-hover:ring-gray-200 transition-all" />
              </button>
            </td>
            <td class="px-4 py-2.5 text-center" @click.stop="$router.push(`/hub/products/${p.id}`)">
              <HubSeoBadge :status="p.seoStatus" class="justify-center" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.products.pagination_label', 'produits')" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />

    <HubProductImageModal
      :open="imageModalOpen"
      :images="imageModalImages"
      :client-id="imageModalClientId"
      :product-name="imageModalName"
      @close="imageModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', ssr: false, middleware: ['hub-auth'] })

const { t } = useHubT()
const { resolvedClientId } = useClientDetection()
const { isFood } = useTenantProfile()

const { langs: hubLangs, currentLangId } = useHubLang()
const importLangOptions = computed(() =>
  hubLangs.value.length > 1
    ? hubLangs.value.map((l) => ({ id: l.id_lang, label: l.name || l.iso_code.toUpperCase() }))
    : [],
)

function unitPriceLabel(unity: string | null): string {
  const u = String(unity || '').toLowerCase().trim()
  if (!u) return 'HT/U'
  if (/^(k|kg|kilo|kilogramme)/.test(u)) return 'HT/K'
  if (/^(l|litre|liter)/.test(u)) return 'HT/L'
  if (/^(u|unité|unite|piece|pièce|pce)/.test(u)) return 'HT/U'
  return `HT/${u.toUpperCase()}`
}
function computeUnitPrice(p: any): { value: number; label: string } | null {
  const price = Number(p.priceHT) || 0
  if (price <= 0) return null
  const ratio = Number(p.unitPriceRatio) || 0
  if (ratio > 0) {
    return { value: price / ratio, label: unitPriceLabel(p.unity) }
  }
  const weight = Number(p.weight) || 0
  if (weight > 0) {
    return { value: price / weight, label: 'HT/K' }
  }
  return null
}

const products = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(0)
const perPage = ref(100)
const perPageOptions = [100, 500, 1000, 5000, 10000]
function setPerPage(n: number) {
  perPage.value = n
  goPage(1)
}
const loading = ref(false)
const search = ref('')
const sortBy = ref('id')
const sortDir = ref<'ASC' | 'DESC'>('DESC')

const { colFilters, hasActiveColFilter, clearColFilters } = useHubColFilters({
  initial: {
    fId: '',
    fName: '',
    fReference: '',
    fCategory: '',
    fPriceMin: 0,
    fStockMin: 0,
    fActive: '' as string,
  },
  onChange: () => { page.value = 1; load() },
})
const importOpen = ref(false)
const importTargetFields = computed(() => [
  { key: 'reference',        label: t('hub.ui.products.field_reference', 'Référence'), required: false },
  { key: 'ean13',            label: 'EAN13',               required: false },
  { key: 'name',             label: t('hub.ui.products.field_name', 'Nom'), required: false },
  { key: 'priceHT',          label: t('hub.ui.products.field_price_ht', 'Prix HT (€)'), required: false },
  { key: 'stock',            label: t('hub.ui.products.field_stock', 'Stock'), required: false },
  { key: 'categoryName',     label: t('hub.ui.products.field_category', 'Catégorie'), required: false },
  { key: 'weight',           label: t('hub.ui.products.field_weight', 'Poids brut (kg)'), required: false },
  { key: 'unitPriceRatio',   label: t('hub.ui.products.field_unit_ratio', 'Ratio prix unit. / colisage'), required: false },
  { key: 'unity',            label: t('hub.ui.products.field_unity', 'Unité de vente'), required: false },
  { key: 'taxRate',          label: t('hub.ui.products.field_tax', 'TVA (%)'), required: false },
  { key: 'minimalQty',       label: t('hub.ui.products.field_min_qty', 'Colisage (qté min)'), required: false },
  { key: 'descriptionShort', label: t('hub.ui.products.field_summary', 'Résumé (court)'), required: false },
  { key: 'description',      label: t('hub.ui.products.field_description', 'Description'), required: false },
])
const importFieldAliases: Record<string, string[]> = {
  reference:        ['ref', 'reference', 'référence', 'sku', 'réf'],
  ean13:            ['ean', 'ean13', 'code-barres', 'codebarres', 'barcode', 'gtin'],
  name:             ['nom', 'name', 'titre', 'title', 'libelle', 'libellé', 'libelle article', 'libellé article'],
  priceHT:          ['prix', 'price', 'prix ht', 'price ht', 'price_ht', 'pht', 'pu_ht', 'pu ht', 'pu', 'prix ttc', 'price ttc', 'price_wt', 'price wt', 'price_wt ht', 'price wt ht'],
  stock:            ['stock', 'quantite', 'quantité', 'quantity', 'qty', 'qte', 'qt', 'en stock'],
  categoryName:     ['categorie', 'catégorie', 'category', 'categorie defaut'],
  weight:           ['poids', 'weight', 'pds brut', 'poids brut', 'masse brute', 'gross weight'],
  unitPriceRatio:   ['ratio', 'unit price ratio', 'diviseur', 'quantite reference', 'quantité référence', 'pds net', 'poids net', 'masse nette', 'prix ht kg', 'prix au kg', 'prix unitaire'],
  unity:            ['unité de vente', 'unite de vente', 'unity', 'unité', 'unite', 'unit'],
  taxRate:          ['tva', 'taux tva', 'tax rate', 'tax', 'vat', 'taux'],
  minimalQty:       ['colisage', 'colis', 'qte min', 'qté min', 'quantite min', 'quantité min', 'minimal quantity', 'min quantity', 'minimum quantity', 'packing', 'pcb'],
  descriptionShort: ['resume', 'résumé', 'description courte', 'short description', 'description_short', 'descriptionshort', 'desc courte'],
  description:      ['description', 'descriptif', 'desc', 'détails', 'detail', 'long description'],
}

const route = useRoute()
const router = useRouter()
const categoryId = ref<number>(Number(route.query.category) || 0)
const categoryName = computed(() => {
  if (!categoryId.value) return ''
  return products.value.find(p => Number(p.categoryId) === categoryId.value)?.categoryName || ''
})

function clearCategoryFilter() {
  categoryId.value = 0
  router.replace({ query: { ...route.query, category: undefined } })
  goPage(1)
}

watch(() => route.query.category, (val) => {
  const next = Number(val) || 0
  if (next !== categoryId.value) {
    categoryId.value = next
    goPage(1)
  }
})

const seoFilter = ref('')
function seoIsIncomplete(status: any): boolean {
  return status === 'partial' || status === 'empty'
}
function matchSeoFilter(status: any): boolean {
  if (!seoFilter.value) return true
  if (seoFilter.value === 'incomplete') return seoIsIncomplete(status)
  return status === seoFilter.value
}
const visibleProducts = computed(() => products.value.filter(p => matchSeoFilter(p.seoStatus)))
const incompleteVisibleCount = computed(() => products.value.filter(p => seoIsIncomplete(p.seoStatus)).length)

const selected = reactive(new Set<number>())
const selectedProducts = reactive(new Map<number, { name: string; slug: string }>())
const bulkLoading = ref(false)
const bulkStatus = ref<string | null>(null)
const bulkStatusClass = ref('text-slate-600')
const bulkDeleteOpen = ref(false)
const seoProgress = ref<any>(null) 

const archiveToast = ref<string | null>(null)
function checkArchiveToast() {
  const archivedId = route.query.archived
  if (!archivedId) return
  const n = Number(route.query.redirects) || 0
  archiveToast.value = t('hub.products.archive.toast_success', '{n} redirection(s) créée(s) — produit retiré du catalogue.').replace('{n}', String(n))
  router.replace({ query: { ...route.query, archived: undefined, redirects: undefined } })
  setTimeout(() => { archiveToast.value = null }, 4000)
}

const allSelected = computed(() => visibleProducts.value.length > 0 && visibleProducts.value.every(p => selected.has(p.id)))
const someSelected = computed(() => visibleProducts.value.some(p => selected.has(p.id)))

function selectIncomplete() {
  for (const p of products.value) {
    if (seoIsIncomplete(p.seoStatus)) {
      selected.add(p.id)
      selectedProducts.set(p.id, { name: p.name, slug: p.reference || '' })
    }
  }
}

function toggleSelect(p: any) {
  if (selected.has(p.id)) {
    selected.delete(p.id)
    selectedProducts.delete(p.id)
  } else {
    selected.add(p.id)
    selectedProducts.set(p.id, { name: p.name, slug: p.reference || '' })
  }
}

function toggleAll() {
  if (allSelected.value) {
    visibleProducts.value.forEach(p => { selected.delete(p.id); selectedProducts.delete(p.id) })
  } else {
    visibleProducts.value.forEach(p => { selected.add(p.id); selectedProducts.set(p.id, { name: p.name, slug: p.reference || '' }) })
  }
}

async function bulkSeo() {
  if (selected.size === 0) return
  bulkLoading.value = true
  bulkStatus.value = t('hub.products.bulk_seo.queuing', 'Mise en queue SEO de {count} produit(s)…').replace('{count}', String(selected.size))
  bulkStatusClass.value = 'text-sky-600'
  try {
    const res: any = await $fetch('/api/bo/products/bulk-seo', {
      method: 'POST',
      body: { ids: [...selected] },
    })
    bulkStatus.value = res.message ?? t('hub.products.bulk_seo.done', '{count} en queue SEO').replace('{count}', String(res.enqueued ?? 0))
    bulkStatusClass.value = 'text-emerald-600'
    seoProgress.value?.start() 
  } catch (err: any) {
    if (err?.status === 403 || err?.data?.statusCode === 403) {
      bulkStatus.value = t('hub.products.bulk_seo.forbidden', 'Réservé aux offres Pro/Enterprise')
    } else {
      bulkStatus.value = err?.data?.message || t('hub.products.bulk_seo.error', 'Erreur lors de la génération SEO')
    }
    bulkStatusClass.value = 'text-amber-600'
  }
  bulkLoading.value = false
  setTimeout(() => { bulkStatus.value = null }, 5000)
}

async function bulkDisable() {
  if (selected.size === 0) return
  bulkLoading.value = true
  bulkStatus.value = t('hub.ui.products.disabling', 'Désactivation de {n} produit(s)…', { n: selected.size })
  bulkStatusClass.value = 'text-amber-600'
  try {
    await $fetch('/api/bo/products/bulk-action', {
      method: 'POST',
      body: { ids: [...selected], action: 'disable' },
    })
    bulkStatus.value = selected.size > 1 ? t('hub.ui.products.disabled_other', '{n} produits désactivés', { n: selected.size }) : t('hub.ui.products.disabled_one', '{n} produit désactivé', { n: selected.size })
    bulkStatusClass.value = 'text-emerald-600'
    selected.clear(); selectedProducts.clear()
    await load()
  } catch {
    bulkStatus.value = t('hub.ui.products.disable_error', 'Erreur lors de la désactivation')
    bulkStatusClass.value = 'text-red-600'
  } finally {
    bulkLoading.value = false
    setTimeout(() => { bulkStatus.value = null }, 5000)
  }
}

async function bulkDelete() {
  if (selected.size === 0) return
  bulkLoading.value = true
  try {
    await $fetch('/api/bo/products/bulk-action', {
      method: 'POST',
      body: { ids: [...selected], action: 'delete' },
    })
    bulkStatus.value = selected.size > 1 ? t('hub.ui.products.deleted_other', '{n} produits supprimés', { n: selected.size }) : t('hub.ui.products.deleted_one', '{n} produit supprimé', { n: selected.size })
    bulkStatusClass.value = 'text-emerald-600'
    bulkDeleteOpen.value = false
    selected.clear(); selectedProducts.clear()
    await load()
  } catch {
    bulkStatus.value = t('hub.ui.products.delete_error', 'Erreur lors de la suppression')
    bulkStatusClass.value = 'text-red-600'
    bulkDeleteOpen.value = false
  } finally {
    bulkLoading.value = false
    setTimeout(() => { bulkStatus.value = null }, 5000)
  }
}

const editingPrice = ref<number | null>(null)
const editPriceValue = ref(0)
const priceInputRef = ref<HTMLInputElement | null>(null)
const editingStock = ref<number | null>(null)
const editStockValue = ref(0)
const stockInputRef = ref<HTMLInputElement | null>(null)
const savingActive = ref<number | null>(null)

const imageModalOpen = ref(false)
const imageModalImages = ref<number[]>([])
const imageModalClientId = ref('')
const imageModalName = ref('')

function openImageModal(p: any) {
  const ids: number[] = p.imageIds ?? []
  if (!ids.length && p.imageUrl) {
    
    const match = p.imageUrl.match(/\/api\/catalogue\/image\/(\d+)/)
    if (match) ids.push(Number(match[1]))
  }
  if (!ids.length) return
  
  const clientMatch = p.imageUrl?.match(/clientId=([^&]+)/)
  imageModalClientId.value = clientMatch ? clientMatch[1] : resolvedClientId.value
  imageModalImages.value = ids
  imageModalName.value = p.name || ''
  imageModalOpen.value = true
}

function onImportDone() {
  load()
}

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  else { sortBy.value = col; sortDir.value = 'DESC' }
  goPage(1)
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/products', { query: {
      page: page.value, perPage: perPage.value, search: search.value,
      sort: sortBy.value, dir: sortDir.value,
      category: categoryId.value || undefined,
      fId: colFilters.fId || undefined,
      fName: colFilters.fName || undefined,
      fReference: colFilters.fReference || undefined,
      fCategory: colFilters.fCategory || undefined,
      fPriceMin: colFilters.fPriceMin > 0 ? colFilters.fPriceMin : undefined,
      fStockMin: colFilters.fStockMin > 0 ? colFilters.fStockMin : undefined,
      fActive: colFilters.fActive || undefined,
    } })
    products.value = data.products ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

function startEditPrice(p: any) {
  editingPrice.value = p.id
  editPriceValue.value = Number(p.priceHT) || 0
  nextTick(() => priceInputRef.value?.select())
}

async function savePrice(p: any) {
  if (editingPrice.value !== p.id) return
  const newPrice = Math.round(editPriceValue.value * 100) / 100
  editingPrice.value = null
  if (newPrice === Number(p.priceHT)) return
  try {
    await $fetch(`/api/bo/products/${p.id}`, { method: 'PUT', body: { priceHT: newPrice } })
    p.priceHT = newPrice
  } catch (e) {
    console.error('[products] price save failed', e)
  }
}

function startEditStock(p: any) {
  editingStock.value = p.id
  editStockValue.value = Number(p.stock) || 0
  nextTick(() => stockInputRef.value?.select())
}

async function saveStock(p: any) {
  if (editingStock.value !== p.id) return
  const newStock = Math.round(editStockValue.value)
  editingStock.value = null
  if (newStock === Number(p.stock)) return
  try {
    await $fetch(`/api/bo/products/${p.id}`, { method: 'PUT', body: { stock: newStock } })
    p.stock = newStock
  } catch (e) {
    console.error('[products] stock save failed', e)
  }
}

async function toggleActive(p: any) {
  if (savingActive.value === p.id) return
  savingActive.value = p.id
  const newActive = !p.active
  try {
    await $fetch(`/api/bo/products/${p.id}`, { method: 'PUT', body: { active: newActive } })
    p.active = newActive ? 1 : 0
  } catch (e) {
    console.error('[products] active toggle failed', e)
  } finally {
    savingActive.value = null
  }
}

onMounted(() => { checkArchiveToast(); load() })
</script>
