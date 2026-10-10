<template>
  <aside
    class="fixed left-0 top-0 bottom-0 z-[150] flex flex-col builder-sidebar"
    :class="{ 'is-collapsed': builderCollapsed }"
    :style="{
      width: builderCollapsed ? '56px' : `${builderWidth}px`,
      background: '#fff',
      borderRight: '1px solid #e5e7eb',
      boxShadow: '4px 0 24px rgba(0,0,0,.08)',
      transition: isResizing ? 'none' : 'width 200ms ease',
    }"
  >

    
    <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 builder-header-text">
          <span class="text-base">🔧</span>
          <span class="text-xs font-bold text-gray-700 uppercase tracking-wider">{{ tHub('hub.ui.editor_sidebar.builder_title', 'Builder') }}</span>
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-100 text-primary-700 uppercase">
            {{ resolvedClientId }}
          </span>
        </div>
        
        <span v-if="builderCollapsed" class="text-base mx-auto">🔧</span>
        <div class="flex items-center gap-1.5 builder-header-actions">
          <span v-if="globalDirty && !builderCollapsed" class="w-2 h-2 rounded-full bg-amber-400 animate-pulse" :title="globalDirtyCount > 1 ? tHub('hub.ui.editor_sidebar.unsaved_domains_other', '{count} domaines non sauvegardés', { count: globalDirtyCount }) : tHub('hub.ui.editor_sidebar.unsaved_domains_one', '{count} domaine non sauvegardé', { count: globalDirtyCount })" />
          <button
            @click="toggleBuilderCollapsed"
            class="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            :title="builderCollapsed ? tHub('hub.ui.editor_sidebar.expand_sidebar', 'Étendre la sidebar') : tHub('hub.ui.editor_sidebar.collapse_rail', 'Réduire en rail (56px)')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path v-if="builderCollapsed" stroke-linecap="round" stroke-linejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m12-12.75-3.75 3.75 3.75 3.75M3 4.5v15" />
            </svg>
          </button>
          <button v-if="!builderCollapsed" @click="toggleEditMode" class="text-gray-400 hover:text-gray-600 transition-colors p-0.5" :title="tHub('hub.ui.editor_sidebar.close_builder', 'Fermer le Builder')">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    
    <div
      v-if="!builderCollapsed"
      class="builder-resize-handle"
      :class="{ 'is-resizing': isResizing }"
      @mousedown="onResizeStart"
      :title="tHub('hub.ui.editor_sidebar.resize_hint', 'Glisser pour redimensionner (320–560px)')"
    />

    
    <div v-if="activePanel" class="px-4 py-2 border-b border-gray-100 shrink-0">
      <button
        @click="activePanel = null"
        class="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        {{ tHub('hub.ui.editor_sidebar.back', 'Retour') }}
      </button>
    </div>

    
    
    
    <div v-if="!activePanel" class="flex-1 overflow-auto">

      
      <div class="border-b border-gray-100">
        <button
          @click="toggleGroup('apparence')"
          class="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{{ tHub('hub.ui.editor_sidebar.appearance', 'Apparence') }}</span>
          <svg
            class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
            :class="openGroup === 'apparence' ? '' : '-rotate-90'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <div v-show="openGroup === 'apparence'" class="px-3 pb-3 space-y-1.5">
          
          <button
            @click="activePanel = 'theme'"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
          >
            <span class="text-base">🎨</span>
            <div class="flex-1 text-left">
              <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">{{ tHub('hub.ui.editor_sidebar.theme', 'Thème') }}</p>
              <p class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.theme_hint', 'Couleurs, polices, UI') }}</p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      
      <div class="border-b border-gray-100">
        <button
          @click="toggleGroup('top')"
          class="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{{ tHub('hub.ui.editor_sidebar.page_top', 'Haut de page') }}</span>
          <svg
            class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
            :class="openGroup === 'top' ? '' : '-rotate-90'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <div v-show="openGroup === 'top'" class="px-3 pb-3 space-y-1.5">
          
          <button
            @click="activePanel = 'header'"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
          >
            <span class="text-base">🏷️</span>
            <div class="flex-1 text-left">
              <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">{{ tHub('hub.ui.editor_sidebar.header', 'Header') }}</p>
              <p class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.header_hint', 'Logo, topbar, contact, layout') }}</p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          
          <button
            @click="activePanel = 'menu'"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
          >
            <span class="text-base">🧭</span>
            <div class="flex-1 text-left">
              <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">{{ tHub('hub.ui.editor_sidebar.menu', 'Menu') }}</p>
              <p class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.menu_hint', 'Navigation, dropdowns, mégamenu') }}</p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      
      <div v-if="contextPageId" class="border-b border-gray-100">
        <button
          @click="toggleGroup('page')"
          class="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{{ tHub('hub.ui.editor_sidebar.page_settings', 'Page Settings') }}</span>
          <svg
            class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
            :class="openGroup === 'page' ? '' : '-rotate-90'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <div v-show="openGroup === 'page'" class="px-3 pb-3 space-y-1.5">
          
          <template v-if="contextPageId === 'silo'">
            <button
              @click="activePanel = 'silo:hero'"
              class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
            >
              <span class="text-base">🗂️</span>
              <div class="flex-1 text-left">
                <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">{{ tHub('hub.ui.editor_sidebar.category_sections', 'Sections catégories') }}</p>
                <p class="text-[10px] text-gray-400 truncate">{{ contextPayload.label ?? contextPayload.path ?? '—' }}</p>
              </div>
              <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>

            
            <button
              v-if="pageSectionsList.length"
              @click="activePanel = 'page-sections'"
              class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
            >
              <span class="text-base">🧩</span>
              <div class="flex-1 text-left">
                <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">{{ tHub('hub.ui.editor_sidebar.page_sections', 'Sections de la page') }}</p>
                <p class="text-[10px] text-gray-400 truncate">{{ pageSectionsList.length === 1 ? tHub('hub.ui.editor_sidebar.sections_count_one', '{count} section', { count: pageSectionsList.length }) : tHub('hub.ui.editor_sidebar.sections_count_other', '{count} sections', { count: pageSectionsList.length }) }}</p>
              </div>
              <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </template>

          
          <template v-else-if="contextPageId === 'product'">
            <button
              @click="activePanel = 'page-sections'"
              class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
            >
              <span class="text-base">🧩</span>
              <div class="flex-1 text-left">
                <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">{{ tHub('hub.ui.editor_sidebar.product_blocks', 'Blocs de la fiche') }}</p>
                <p class="text-[10px] text-gray-400 truncate">{{ tHub('hub.ui.editor_sidebar.product_blocks_hint', 'gabarit de toutes les fiches produit') }}</p>
              </div>
              <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </template>

          
          <template v-else-if="contextPageId === 'cart' || contextPageId === 'checkout'">
            <button
              @click="activePanel = 'page-sections'"
              class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
            >
              <span class="text-base">🔘</span>
              <div class="flex-1 text-left">
                <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">
                  {{ contextPageId === 'cart' ? tHub('hub.ui.editor_sidebar.cart_inserts', 'Encarts du panier') : tHub('hub.ui.editor_sidebar.checkout_inserts', 'Encarts du tunnel') }}
                </p>
                <p class="text-[10px] text-gray-400 truncate">{{ tHub('hub.ui.editor_sidebar.cart_inserts_hint', 'afficher ou masquer — l’ordre d’achat ne bouge pas') }}</p>
              </div>
              <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </template>

          
          <template v-else-if="contextPageId === 'cms'">
            <button
              @click="activePanel = 'page-sections'"
              class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
            >
              <span class="text-base">🧩</span>
              <div class="flex-1 text-left">
                <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">{{ tHub('hub.ui.editor_sidebar.page_sections', 'Sections de la page') }}</p>
                <p class="text-[10px] text-gray-400 truncate">{{ contextPayload.slug ?? '—' }}</p>
              </div>
              <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </template>

        </div>
      </div>

      
      <div v-if="!contextPageId && surLAccueil" class="border-b border-gray-100">
        <div class="flex items-center">
          <button
            @click="toggleGroup('homepage')"
            class="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{{ tHub('hub.ui.editor_sidebar.homepage_sections', 'Sections Homepage') }}</span>
            <svg
              class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
              :class="openGroup === 'homepage' ? '' : '-rotate-90'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          
          <button
            v-if="isDbSections"
            @click="activePanel = 'section-library'"
            class="w-8 h-8 mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            :title="tHub('hub.ui.editor_sidebar.component_library', 'Bibliothèque de composants')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
          </button>
        </div>

        <div v-show="openGroup === 'homepage'" class="px-3 pb-3">

          
          <template v-if="isDbSections">
            <div v-if="dbSectionsLoading" class="py-4 text-center">
              <span class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.loading_sections', 'Chargement des sections...') }}</span>
            </div>
            <template v-else>
              <div
                v-for="(section, index) in dbSectionsList"
                :key="section.id"
                draggable="true"
                @dragstart="onDragStart(index)"
                @dragover.prevent="onDragOver(index)"
                @drop.prevent="onDbDrop(index)"
                @dragend="dragOver = null"
                class="flex items-center gap-2 p-2.5 mb-1.5 rounded-xl border bg-white
                       group transition-all duration-150 cursor-grab"
                :class="[
                  dragOver === index ? 'border-primary-400 bg-primary-50 scale-[1.01]' : '',
                  section.active ? 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/40' : 'border-dashed border-gray-300 opacity-50',
                ]"
              >
                
                <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                </svg>
                
                <span class="text-sm select-none">{{ sectionMeta(section.type).icon }}</span>
                <div class="flex-1 min-w-0">
                  <span class="text-xs font-semibold" :class="section.active ? 'text-gray-700' : 'text-gray-400'">
                    {{ sectionMeta(section.type).label }}
                  </span>
                  <span v-if="section.title" class="ml-1 text-[10px] text-gray-400 truncate">{{ section.title }}</span>
                </div>
                
                <div class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button v-if="index > 0" @click.stop="moveDbSection(index, index - 1)"
                    class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
                    </svg>
                  </button>
                  <button v-if="index < dbSectionsList.length - 1" @click.stop="moveDbSection(index, index + 1)"
                    class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
                
                <button
                  @click.stop="toggleDbSection(index)"
                  class="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  :class="section.active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'"
                  :title="section.active ? tHub('hub.ui.editor_sidebar.deactivate', 'Désactiver') : tHub('hub.ui.editor_sidebar.activate', 'Activer')"
                >
                  <svg v-if="section.active" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
                
                <button
                  @click.stop="openSectionEditor(section.id)"
                  class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 opacity-0 group-hover:opacity-100 transition-all"
                  :title="tHub('hub.ui.editor_sidebar.configure', 'Configurer')"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                </button>
              </div>
              <div class="flex items-center justify-between mt-2">
                <p class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.drag_to_reorder', 'Glissez pour réordonner') }}</p>
                <p v-if="dbSectionsDirty" class="text-[10px] font-medium text-amber-600 italic">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
              </div>
            </template>
          </template>

          
          <template v-else>
            <div
              v-for="(section, index) in sections"
              :key="section.type"
              draggable="true"
              @dragstart="onDragStart(index)"
              @dragover.prevent="onDragOver(index)"
              @drop.prevent="onDrop(index)"
              @dragend="dragOver = null"
              class="flex items-center gap-2 p-2.5 mb-1.5 rounded-xl border border-gray-200 bg-white
                     hover:border-primary-300 hover:bg-primary-50/40 group transition-all duration-150 cursor-grab"
              :class="dragOver === index ? 'border-primary-400 bg-primary-50 scale-[1.01]' : ''"
            >
              
              <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
              </svg>
              <span class="text-sm select-none">{{ sectionMeta(section.type).icon }}</span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-semibold text-gray-700">{{ sectionMeta(section.type).label }}</span>
                
                <span
                  v-if="section.visibility.avatars.length > 0"
                  class="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-violet-100 text-violet-700"
                  :title="formatVisibilityLabel(section.visibility)"
                >👁️ {{ section.visibility.avatars.length }}</span>
              </div>
              
              <div class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button v-if="index > 0" @click.stop="moveSection(index, index - 1)"
                  class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
                  </svg>
                </button>
                <button v-if="index < sections.length - 1" @click.stop="moveSection(index, index + 1)"
                  class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
              
              <button
                @click.stop="openVisibilityPanel(section.type)"
                class="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                :class="section.visibility.avatars.length > 0 ? 'text-violet-500 hover:bg-violet-100' : 'text-gray-400 hover:text-violet-500 hover:bg-violet-50'"
                :title="tHub('hub.ui.editor_sidebar.conditional_display', 'Affichage conditionnel')"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              
              <button
                @click.stop="activePanel = ('homepage:' + section.type) as any"
                class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 opacity-0 group-hover:opacity-100 transition-all"
                :title="tHub('hub.ui.editor_sidebar.edit_content', 'Éditer le contenu')"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
            <p class="text-[10px] text-gray-400 mt-2 text-center">{{ tHub('hub.ui.editor_sidebar.drag_legend', 'Glissez · ✏️ contenu · 👁️ visibilité') }}</p>
          </template>
        </div>
      </div>

      
      <div v-if="!contextPageId && surLAccueil" class="border-b border-gray-100">
        <div class="flex items-center">
          <button
            @click="toggleGroup('variants')"
            class="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{{ tHub('hub.ui.editor_sidebar.homepage_variants', 'Variantes Homepage') }}</span>
            <svg
              class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
              :class="openGroup === 'variants' ? '' : '-rotate-90'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          
          <button
            @click="openGroup = 'variants'; showNewVariantForm = !showNewVariantForm"
            class="w-8 h-8 mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            :title="tHub('hub.ui.editor_sidebar.new_variant', 'Nouvelle variante')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        <div v-show="openGroup === 'variants'" class="px-3 pb-3 space-y-1.5">
          
          <div v-if="showNewVariantForm" class="p-2.5 mb-2 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30 space-y-2">
            <div>
              <label class="field-label">{{ tHub('hub.ui.editor_sidebar.code', 'Code') }}</label>
              <input v-model="newVariantCode" type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.variant_code_ph', 'black-friday-2026')" />
            </div>
            <div>
              <label class="field-label">{{ tHub('hub.ui.editor_sidebar.label_field', 'Libellé') }}</label>
              <input v-model="newVariantLabel" type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.variant_label_ph', 'Black Friday 2026')" />
            </div>
            <p v-if="createVariantError" class="text-[10px] text-red-500">{{ createVariantError }}</p>
            <div class="flex gap-1.5">
              <button
                @click="showNewVariantForm = false; createVariantError = ''"
                class="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {{ tHub('hub.ui.editor_sidebar.cancel', 'Annuler') }}
              </button>
              <button
                @click="createVariant"
                :disabled="creatingVariant"
                class="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {{ creatingVariant ? tHub('hub.ui.editor_sidebar.creating', 'Création…') : tHub('hub.ui.editor_sidebar.create_draft', 'Créer (brouillon)') }}
              </button>
            </div>
          </div>

          <div v-if="variantsLoading" class="py-4 text-center">
            <span class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.loading_variants', 'Chargement des variantes...') }}</span>
          </div>
          <template v-else>
            <div
              v-for="variant in variantsList"
              :key="variant.code"
              class="p-2.5 mb-1.5 rounded-xl border bg-white transition-all"
              :class="variant.status === 'live' ? 'border-green-300 bg-green-50/40' : 'border-gray-200'"
            >
              <div class="flex items-center gap-2">
                <span
                  class="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0"
                  :class="{
                    'bg-green-100 text-green-700': variant.status === 'live',
                    'bg-amber-100 text-amber-700': variant.status === 'draft',
                    'bg-gray-100 text-gray-400': variant.status === 'archived',
                  }"
                >{{ variant.status === 'live' ? tHub('hub.ui.editor_sidebar.status_live', 'En ligne') : variant.status === 'draft' ? tHub('hub.ui.editor_sidebar.status_draft', 'Brouillon') : tHub('hub.ui.editor_sidebar.status_archived', 'Archivée') }}</span>
                <span
                  v-if="variant.serving_strategy === 'rule'"
                  class="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 bg-violet-100 text-violet-700"
                  :title="tHub('hub.ui.editor_sidebar.serving_rule_active', 'Règle de service active')"
                >{{ tHub('hub.ui.editor_sidebar.rule_badge', '🎯 Règle') }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-gray-700 truncate">{{ variant.label }}</p>
                  <p class="text-[10px] text-gray-400 truncate">{{ variant.code }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 mt-2">
                <a
                  :href="`/?hp=${variant.code}`"
                  target="_blank"
                  rel="noopener"
                  class="flex-1 text-center text-[10px] font-semibold px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                >
                  {{ tHub('hub.ui.editor_sidebar.preview', '👁️ Prévisualiser') }}
                </a>
                <button
                  v-if="variant.code !== 'default'"
                  @click="openVariantEditor(variant.code)"
                  class="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                  :title="tHub('hub.ui.editor_sidebar.variant_configure', 'Configurer la stratégie et les règles de service')"
                >
                  ⚙️
                </button>
                <button
                  v-if="variant.status !== 'live' && confirmingLiveCode !== variant.code"
                  @click="confirmingLiveCode = variant.code"
                  class="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  {{ tHub('hub.ui.editor_sidebar.go_live', 'Passer en live') }}
                </button>
                <template v-else-if="variant.status !== 'live' && confirmingLiveCode === variant.code">
                  <button
                    @click="confirmingLiveCode = null"
                    class="text-[10px] font-semibold px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {{ tHub('hub.ui.editor_sidebar.cancel', 'Annuler') }}
                  </button>
                  <button
                    @click="setVariantLive(variant.code)"
                    :disabled="settingLive"
                    class="flex-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {{ settingLive ? tHub('hub.ui.editor_sidebar.switching', 'Bascule…') : tHub('hub.ui.editor_sidebar.confirm_go_live', 'Confirmer la mise en ligne') }}
                  </button>
                </template>
              </div>
            </div>
            <p v-if="!variantsList.length" class="text-[10px] text-gray-400 text-center py-2">{{ tHub('hub.ui.editor_sidebar.no_variants', 'Aucune variante.') }}</p>
            <p v-if="variantsError" class="text-[10px] text-red-500 text-center py-1">{{ variantsError }}</p>
          </template>
        </div>
      </div>

      
      <div class="border-b border-gray-100">
        <div class="flex items-center">
          <button
            @click="toggleGroup('footer')"
            class="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{{ tHub('hub.ui.editor_sidebar.footer_group', 'Pied de page') }}</span>
            <svg
              class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
              :class="openGroup === 'footer' ? '' : '-rotate-90'"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          
          <button
            v-if="isDbSections"
            @click="activePanel = 'prefooter-library'"
            class="w-8 h-8 mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            :title="tHub('hub.ui.editor_sidebar.prefooter_components', 'Composants pré-footer')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
          </button>
        </div>

        <div v-show="openGroup === 'footer'" class="px-3 pb-3 space-y-1.5">

          
          <template v-if="isDbSections && pfSectionsList.length">
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{{ tHub('hub.ui.editor_sidebar.before_footer', 'Avant le footer') }}</p>
            <div
              v-for="(section, index) in pfSectionsList"
              :key="section.id"
              class="flex items-center gap-2 p-2 mb-1 rounded-xl border bg-white group transition-all"
              :class="section.active ? 'border-gray-200 hover:border-primary-300' : 'border-dashed border-gray-300 opacity-50'"
            >
              <span class="text-sm select-none">{{ sectionMeta(section.type).icon }}</span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-semibold" :class="section.active ? 'text-gray-700' : 'text-gray-400'">
                  {{ sectionMeta(section.type).label }}
                </span>
              </div>
              <button
                @click.stop="togglePfSection(index)"
                class="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                :class="section.active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'"
                :title="section.active ? tHub('hub.ui.editor_sidebar.deactivate', 'Désactiver') : tHub('hub.ui.editor_sidebar.activate', 'Activer')"
              >
                <svg v-if="section.active" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <svg v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              </button>
              <button
                @click.stop="openPfSectionEditor(section.id)"
                class="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 opacity-0 group-hover:opacity-100 transition-all"
                :title="tHub('hub.ui.editor_sidebar.configure', 'Configurer')"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
            <p v-if="pfSectionsDirty" class="text-[10px] font-medium text-amber-600 italic mt-1 text-center">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
          </template>

          
          <div v-if="isDbSections && pfSectionsList.length" class="border-t border-gray-100 my-1.5" />

          
          <button
            @click="activePanel = 'footer'"
            class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 hover:border-primary-400 hover:bg-primary-50/60 hover:shadow-sm transition-all group"
          >
            <span class="text-base">🦶</span>
            <div class="flex-1 text-left">
              <p class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">{{ tHub('hub.ui.editor_sidebar.footer', 'Footer') }}</p>
              <p class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.footer_hint', 'Contact, liens, copyright') }}</p>
            </div>
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

    </div>

    
    
    

    
    <div v-else-if="activePanel === 'section-library'" class="flex-1 overflow-auto p-4 space-y-3">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
        </svg>
        {{ tHub('hub.ui.editor_sidebar.components', 'Composants') }}
      </h3>
      <p class="text-[10px] text-gray-500 leading-relaxed">
        {{ tHub('hub.ui.editor_sidebar.library_intro', 'Activez ou désactivez les composants de votre homepage. Cliquez sur un composant pour le configurer.') }}
      </p>

      <div class="space-y-1.5">
        <div
          v-for="section in dbSectionsList"
          :key="section.id"
          class="flex items-center gap-3 p-3 rounded-xl border transition-all"
          :class="section.active
            ? 'border-primary-200 bg-primary-50/40'
            : 'border-gray-200 bg-white opacity-60'"
        >
          
          <span class="text-lg">{{ sectionMeta(section.type).icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold" :class="section.active ? 'text-gray-800' : 'text-gray-500'">
              {{ sectionMeta(section.type).label }}
            </p>
            <p class="text-[10px] text-gray-400 truncate">{{ sectionTypeDescription(section.type) }}</p>
          </div>
          
          <button
            @click="openSectionEditor(section.id)"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors"
            :title="tHub('hub.ui.editor_sidebar.configure', 'Configurer')"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          
          <button
            @click="toggleDbSectionFromLibrary(section.id)"
            class="relative w-10 h-5 rounded-full transition-colors duration-200"
            :class="section.active ? 'bg-primary-600' : 'bg-gray-300'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
              :class="section.active ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>

      <p v-if="dbSectionsDirty" class="pt-2 text-xs text-amber-600 italic text-center">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'section-edit' && editingSection" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <span class="text-base">{{ sectionMeta(editingSection.type).icon }}</span>
        {{ sectionMeta(editingSection.type).label }}
      </h3>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.headings', 'Titrage') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.title', 'Titre') }}</label>
          <EditorI18nField
            :model-value="parseSectionI18n(editingSection.title)"
            :langs="tenantLangs"
            :placeholder="tHub('hub.ui.editor_sidebar.section_title_ph', 'Titre de la section')"
            @update:model-value="updateEditingSectionTitle($event)"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.subtitle', 'Sous-titre') }}</label>
          <EditorI18nField
            :model-value="parseSectionI18n(editingSection.subtitle)"
            :langs="tenantLangs"
            type="textarea"
            :placeholder="tHub('hub.ui.editor_sidebar.section_desc_ph', 'Description de la section')"
            @update:model-value="updateEditingSectionSubtitle($event)"
          />
        </div>
      </fieldset>

      
      <EditorSectionsHeroSliderEditor
        v-if="editingSection.type === 'hero-slider'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsFeaturesEditor
        v-else-if="editingSection.type === 'features'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsNarrativeBlocksEditor
        v-else-if="editingSection.type === 'narrative-blocks' || editingSection.type === 'media-rows'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        :show-side="editingSection.type === 'media-rows'"
        :section-type="editingSection.type"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsCategoriesEditor
        v-else-if="editingSection.type === 'categories'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsBlogEditor
        v-else-if="editingSection.type === 'blog'"
        :payload="editingSection.payload"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsInstagramEditor
        v-else-if="editingSection.type === 'instagram'"
        :payload="editingSection.payload"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsBannersEditor
        v-else-if="editingSection.type === 'banners'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      
      <EditorSectionsHeroCtaEditor
        v-else-if="editingSection.type === 'hero-cta'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsTextBandEditor
        v-else-if="editingSection.type === 'text-band'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsSpecStripEditor
        v-else-if="editingSection.type === 'spec-strip'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsStepsEditor
        v-else-if="editingSection.type === 'steps'"
        :payload="editingSection.payload"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />
      <EditorSectionsSimpleConfigEditor
        v-else
        :payload="editingSection.payload"
        :section-type="editingSection.type"
        :langs="tenantLangs"
        @update:payload="updateEditingSectionPayload($event)"
      />

      <p v-if="sectionPayloadDirty" class="text-xs text-amber-600 italic text-center pt-2">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'page-sections'" class="flex-1 overflow-auto p-4 space-y-3">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <span class="text-base">🧩</span>
        {{ pageParentSingleton ? tHub('hub.ui.editor_sidebar.product_blocks', 'Blocs de la fiche') : tHub('hub.ui.editor_sidebar.page_sections', 'Sections de la page') }}
      </h3>
      <p class="text-[10px] text-gray-500 leading-relaxed">
        {{ pageParentOrdreFige
          ? tHub('hub.ui.editor_sidebar.inserts_intro', 'Affichage des encarts. L’ordre du parcours d’achat ne se règle pas ici : les étapes de la commande n’en sont pas, et ne peuvent pas être masquées.')
          : pageParentSingleton
            ? tHub('hub.ui.editor_sidebar.blocks_intro', 'Ordre et affichage des blocs du bas de fiche. Ce réglage vaut pour TOUTES les fiches produit de la boutique.')
            : tHub('hub.ui.editor_sidebar.sections_intro', 'Sections de cette page. Glissez pour réordonner, cliquez « Configurer » pour éditer le contenu.') }}
      </p>

      <div v-if="pageSectionsLoading" class="py-4 text-center">
        <span class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.loading_sections', 'Chargement des sections...') }}</span>
      </div>
      <p v-else-if="!pageSectionsList.length" class="text-[10px] text-gray-400 italic text-center py-6">
        {{ pageParentOrdreFige
          ? tHub('hub.ui.editor_sidebar.inserts_empty', 'Aucun réglage en base — tous les encarts sont affichés.')
          : pageParentSingleton
            ? tHub('hub.ui.editor_sidebar.blocks_empty', 'Aucun gabarit en base — les fiches rendent leurs blocs dans l’ordre d’origine.')
            : tHub('hub.ui.editor_sidebar.sections_empty', 'Aucune section DB sur cette page — rendu du contenu CMS classique inchangé.') }}
      </p>
      <template v-else>
        <div
          v-for="(section, index) in pageSectionsList"
          :key="section.id"
          :draggable="!pageParentOrdreFige"
          @dragstart="pageParentOrdreFige || onPageDragStart(index)"
          @dragover.prevent="pageParentOrdreFige || onPageDragOver(index)"
          @drop.prevent="pageParentOrdreFige || onPageDrop(index)"
          @dragend="pageDragOver = null"
          class="flex items-center gap-2 p-2.5 mb-1.5 rounded-xl border bg-white
                 group transition-all duration-150"
          :class="[
            pageParentOrdreFige ? 'cursor-default' : 'cursor-grab',
            pageDragOver === index ? 'border-primary-400 bg-primary-50 scale-[1.01]' : '',
            section.active ? 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/40' : 'border-dashed border-gray-300 opacity-50',
          ]"
        >
          
          <svg v-if="!pageParentOrdreFige" class="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
          </svg>
          <span class="text-sm select-none">{{ sectionMeta(section.type).icon }}</span>
          <div class="flex-1 min-w-0">
            <span class="text-xs font-semibold" :class="section.active ? 'text-gray-700' : 'text-gray-400'">
              {{ sectionMeta(section.type).label }}
            </span>
            <p class="text-[10px] text-gray-400 truncate">{{ sectionTypeDescription(section.type) }}</p>
          </div>
          
          <div v-if="!pageParentOrdreFige" class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button v-if="index > 0" @click.stop="movePageSection(index, index - 1)"
              class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
              </svg>
            </button>
            <button v-if="index < pageSectionsList.length - 1" @click.stop="movePageSection(index, index + 1)"
              class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
          
          <button
            @click.stop="togglePageSection(index)"
            class="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            :class="section.active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'"
            :title="section.active ? tHub('hub.ui.editor_sidebar.deactivate', 'Désactiver') : tHub('hub.ui.editor_sidebar.activate', 'Activer')"
          >
            <svg v-if="section.active" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </button>
          
          <button
            @click.stop="openSectionEditor(section.id)"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 opacity-0 group-hover:opacity-100 transition-all"
            :title="tHub('hub.ui.editor_sidebar.configure', 'Configurer')"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
          </button>
        </div>
        <div class="flex items-center justify-between mt-2">
          <p class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.drag_to_reorder', 'Glissez pour réordonner') }}</p>
          <p v-if="pageSectionsDirty" class="text-[10px] font-medium text-amber-600 italic">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
        </div>
      </template>
    </div>

    
    <div v-else-if="activePanel === 'prefooter-library'" class="flex-1 overflow-auto p-4 space-y-3">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
        </svg>
        {{ tHub('hub.ui.editor_sidebar.prefooter', 'Pré-footer') }}
      </h3>
      <p class="text-[10px] text-gray-500 leading-relaxed">
        {{ tHub('hub.ui.editor_sidebar.prefooter_intro', 'Composants affichés sur toutes les pages, juste avant le footer.') }}
      </p>

      <div class="space-y-1.5">
        <div
          v-for="section in pfSectionsList"
          :key="section.id"
          class="flex items-center gap-3 p-3 rounded-xl border transition-all"
          :class="section.active ? 'border-primary-200 bg-primary-50/40' : 'border-gray-200 bg-white opacity-60'"
        >
          <span class="text-lg">{{ sectionMeta(section.type).icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold" :class="section.active ? 'text-gray-800' : 'text-gray-500'">
              {{ sectionMeta(section.type).label }}
            </p>
            <p class="text-[10px] text-gray-400 truncate">{{ prefooterTypeDescription(section.type) }}</p>
          </div>
          <button
            @click="openPfSectionEditor(section.id)"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors"
            :title="tHub('hub.ui.editor_sidebar.configure', 'Configurer')"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <button
            @click="togglePfSectionFromLibrary(section.id)"
            class="relative w-10 h-5 rounded-full transition-colors duration-200"
            :class="section.active ? 'bg-primary-600' : 'bg-gray-300'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
              :class="section.active ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>

      <p v-if="pfSectionsDirty" class="pt-2 text-xs text-amber-600 italic text-center">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'prefooter-edit' && editingPfSection" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <span class="text-base">{{ sectionMeta(editingPfSection.type).icon }}</span>
        {{ sectionMeta(editingPfSection.type).label }}
      </h3>

      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.headings', 'Titrage') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.title', 'Titre') }}</label>
          <EditorI18nField
            :model-value="parseSectionI18n(editingPfSection.title)"
            :langs="tenantLangs"
            :placeholder="tHub('hub.ui.editor_sidebar.section_title_ph', 'Titre de la section')"
            @update:model-value="updatePfSectionTitle($event)"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.subtitle', 'Sous-titre') }}</label>
          <EditorI18nField
            :model-value="parseSectionI18n(editingPfSection.subtitle)"
            :langs="tenantLangs"
            type="textarea"
            :placeholder="tHub('hub.ui.editor_sidebar.description', 'Description')"
            @update:model-value="updatePfSectionSubtitle($event)"
          />
        </div>
      </fieldset>

      <EditorSectionsCustomerReviewsEditor
        v-if="editingPfSection.type === 'customer-reviews'"
        :payload="editingPfSection.payload"
        @update:payload="updatePfSectionPayload($event)"
      />
      <EditorSectionsSimpleConfigEditor
        v-else
        :payload="editingPfSection.payload"
        :section-type="editingPfSection.type"
        :langs="tenantLangs"
        @update:payload="updatePfSectionPayload($event)"
      />

      <p v-if="pfPayloadDirty" class="text-xs text-amber-600 italic text-center pt-2">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'variant-edit' && editingVariant" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        <span class="text-base">🧪</span>
        <span class="truncate">{{ editingVariant.label }}</span>
        <span class="text-[10px] font-normal text-gray-400 shrink-0">({{ editingVariant.code }})</span>
      </h3>

      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-3">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.serving_strategy', 'Stratégie de service') }}</legend>
        <div class="flex gap-2">
          <button
            type="button"
            @click="editingVariantStrategy = 'default'"
            class="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-colors"
            :class="editingVariantStrategy === 'default' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
          >
            {{ tHub('hub.ui.editor_sidebar.default', 'Défaut') }}
          </button>
          <button
            type="button"
            @click="editingVariantStrategy = 'rule'"
            class="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-colors"
            :class="editingVariantStrategy === 'rule' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
          >
            {{ tHub('hub.ui.editor_sidebar.targeted_rule', 'Règle ciblée') }}
          </button>
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.weight', 'Poids (weight)') }}</label>
          <input v-model.number="editingVariantWeight" type="number" min="0" step="1" class="field" placeholder="100" />
          <p class="field-help">{{ tHub('hub.ui.editor_sidebar.weight_help', 'Départage entre règles concurrentes qui matchent simultanément (poids le plus élevé gagne).') }}</p>
        </div>
      </fieldset>

      <fieldset v-if="editingVariantStrategy === 'rule'" class="border border-gray-200 rounded-xl p-3 space-y-3">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.targeting_rules', 'Règles de ciblage') }}</legend>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.from', 'Du') }}</label>
            <input v-model="editingVariantDateFrom" type="date" class="field" />
          </div>
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.to', 'Au') }}</label>
            <input v-model="editingVariantDateTo" type="date" class="field" />
          </div>
        </div>

        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.device', 'Device') }}</label>
          <select v-model="editingVariantDevice" class="field">
            <option value="">{{ tHub('hub.ui.editor_sidebar.all', 'Tous') }}</option>
            <option value="mobile">{{ tHub('hub.ui.editor_sidebar.mobile', 'Mobile') }}</option>
            <option value="desktop">{{ tHub('hub.ui.editor_sidebar.desktop', 'Desktop') }}</option>
          </select>
        </div>

        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.utm', 'UTM') }}</label>
          <div class="grid grid-cols-3 gap-1.5">
            <input v-model="editingVariantUtmSource" type="text" placeholder="source" class="field" />
            <input v-model="editingVariantUtmMedium" type="text" placeholder="medium" class="field" />
            <input v-model="editingVariantUtmCampaign" type="text" placeholder="campaign" class="field" />
          </div>
        </div>

        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.referrer_contains', 'Referrer contient') }}</label>
          <input v-model="editingVariantReferrer" type="text" :placeholder="tHub('hub.ui.editor_sidebar.referrer_ph', 'google.')" class="field" />
        </div>

        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.countries', 'Pays (ISO2, séparés par virgule)') }}</label>
          <input v-model="editingVariantGeo" type="text" placeholder="FR, BE" class="field" />
          <p class="field-help">{{ tHub('hub.ui.editor_sidebar.geo_help', 'Actif seulement si le tenant est derrière un proxy géo (ex. Cloudflare) — sinon dimension ignorée.') }}</p>
        </div>
      </fieldset>

      <p v-if="variantEditError" class="text-xs text-red-500 text-center">{{ variantEditError }}</p>

      <button
        @click="saveVariantEdit"
        :disabled="variantEditSaving"
        class="w-full px-3 py-2.5 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {{ variantEditSaving ? tHub('hub.ui.editor_sidebar.saving', 'Enregistrement…') : tHub('hub.ui.editor_sidebar.save', 'Enregistrer') }}
      </button>
    </div>

    
    <div v-else-if="activePanel === 'header'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.header_title', '🏷️ Header') }}</h3>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.logo', 'Logo') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.logo_image', 'Image du logo') }}</label>
          <div class="flex gap-1.5">
            <input
              :value="headerBuilderState?.logo?.src ?? ''"
              @input="onHeaderLogoChange({ src: ($event.target as HTMLInputElement).value })"
              type="url" class="field flex-1" :placeholder="tHub('hub.ui.editor_sidebar.url_or_upload_ph', 'https://... ou uploader →')" />
            <button
              type="button"
              class="shrink-0 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-600 transition-colors"
              :class="{ 'opacity-50 pointer-events-none': logoUploading }"
              @click="($refs.logoFileInput as HTMLInputElement)?.click()"
            >
              {{ logoUploading ? '⏳' : '📁' }}
            </button>
            <input
              ref="logoFileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              class="hidden"
              @change="handleLogoUpload"
            />
          </div>
          <p v-if="logoUploadError" class="text-[10px] text-red-500 mt-1">{{ logoUploadError }}</p>
          <div v-if="headerBuilderState?.logo?.src" class="mt-1.5 h-10 flex items-center">
            <img :src="headerBuilderState.logo.src" :alt="(headerBuilderState.logo.alt as any)?.fr ?? tHub('hub.ui.editor_sidebar.logo_preview', 'logo preview')" class="h-full w-auto object-contain" />
          </div>
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.alt_text', 'Texte alternatif (alt)') }}</label>
          <EditorI18nField
            :model-value="headerBuilderState?.logo?.alt"
            :langs="tenantLangs"
            :placeholder="tHub('hub.ui.editor_sidebar.brand_name_ph', 'Nom de la marque')"
            @update:model-value="onHeaderLogoChange({ alt: $event })"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.fallback_text', 'Texte fallback (si image manquante)') }}</label>
          <EditorI18nField
            :model-value="headerBuilderState?.logo?.text"
            :langs="tenantLangs"
            :placeholder="tHub('hub.ui.editor_sidebar.my_company_ph', 'Mon Entreprise')"
            @update:model-value="onHeaderLogoChange({ text: $event })"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.logo_link', 'Lien du logo') }}</label>
          <input
            :value="headerBuilderState?.logo?.href ?? '/'"
            @input="onHeaderLogoChange({ href: ($event.target as HTMLInputElement).value })"
            type="text" class="field" placeholder="/" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.logo_size', 'Taille du logo') }}</label>
          <select
            :value="headerBuilderState?.logo?.class ?? 'h-10 w-auto max-w-[160px] object-contain'"
            @change="onHeaderLogoChange({ class: ($event.target as HTMLSelectElement).value })"
            class="field"
          >
            <option value="h-8 w-auto max-w-[120px] object-contain">{{ tHub('hub.ui.editor_sidebar.size_s', 'Petit (h-8)') }}</option>
            <option value="h-10 w-auto max-w-[160px] object-contain">{{ tHub('hub.ui.editor_sidebar.size_m', 'Normal (h-10)') }}</option>
            <option value="h-12 w-auto max-w-[200px] object-contain">{{ tHub('hub.ui.editor_sidebar.size_l', 'Grand (h-12)') }}</option>
            <option value="h-14 w-auto max-w-[240px] object-contain">{{ tHub('hub.ui.editor_sidebar.size_xl', 'Très grand (h-14)') }}</option>
            <option value="h-16 w-auto max-w-[280px] object-contain">{{ tHub('hub.ui.editor_sidebar.size_extra', 'Extra (h-16)') }}</option>
            <option value="h-20 w-auto max-w-[320px] object-contain">{{ tHub('hub.ui.editor_sidebar.size_xxl', 'XXL (h-20)') }}</option>
            <option value="h-24 w-auto max-w-[360px] object-contain">{{ tHub('hub.ui.editor_sidebar.size_xxxl', 'XXXL (h-24)') }}</option>
          </select>
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.top_bar', 'Top Bar') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.msg_desktop', 'Message — desktop / tablette') }}</label>
          <EditorI18nField
            :model-value="headerBuilderState?.topBar?.message"
            :langs="tenantLangs"
            type="textarea"
            :placeholder="tHub('hub.ui.editor_sidebar.topbar_msg_ph', 'Livraison offerte dès 50€ — Code PROMO5')"
            @update:model-value="onHeaderTopBarChange({ message: $event })"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.msg_mobile', 'Message — mobile (court)') }}</label>
          <EditorI18nField
            :model-value="headerBuilderState?.topBar?.messageMobile"
            :langs="tenantLangs"
            type="textarea"
            :placeholder="tHub('hub.ui.editor_sidebar.promo_code_ph', 'Code PROMO5')"
            @update:model-value="onHeaderTopBarChange({ messageMobile: $event })"
          />
          <p class="text-[10px] text-gray-400 mt-1 leading-snug">
            {{ tHub('hub.ui.editor_sidebar.mobile_empty_hint', 'Vide = utilise le message desktop. Recommandé : version courte (juste le code promo / la promesse forte) pour ne pas tronquer.') }}
          </p>
        </div>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="headerBuilderState?.topBar?.align === 'center'"
            @change="onHeaderTopBarChange({ align: ($event.target as HTMLInputElement).checked ? 'center' : 'left' })"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">{{ tHub('hub.ui.editor_sidebar.center_msg', 'Centrer le message (sinon aligné à gauche)') }}</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="!!headerBuilderState?.topBar?.showLanguages"
            @change="onHeaderTopBarChange({ showLanguages: ($event.target as HTMLInputElement).checked })"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">{{ tHub('hub.ui.editor_sidebar.show_lang_switcher', 'Afficher le sélecteur de langues') }}</span>
        </label>
        <div v-if="headerBuilderState?.topBar?.showLanguages" class="space-y-1.5 pt-1">
          <div v-for="(lang, i) in headerBuilderState?.topBar?.languages ?? []" :key="i" class="flex items-center gap-1.5">
            <input
              :value="lang.code"
              @input="updateLanguage(i, { code: ($event.target as HTMLInputElement).value })"
              type="text" class="field" style="width: 50px" placeholder="fr" maxlength="3" />
            <EditorI18nField
              :model-value="lang.label"
              :langs="tenantLangs"
              :placeholder="tHub('hub.ui.editor_sidebar.language_name_ph', 'Français')"
              class="flex-1"
              @update:model-value="updateLanguage(i, { label: $event })"
            />
            <input
              :value="lang.href"
              @input="updateLanguage(i, { href: ($event.target as HTMLInputElement).value })"
              type="text" class="field" style="width: 70px" placeholder="/fr/" />
            <button @click="removeLanguage(i)" class="text-red-400 hover:text-red-600 shrink-0" :title="tHub('hub.ui.editor_sidebar.delete', 'Supprimer')">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <button @click="addLanguage" class="w-full text-xs font-semibold text-primary-600 hover:bg-primary-50 py-1.5 rounded-lg transition-colors">{{ tHub('hub.ui.editor_sidebar.add_language', '+ Ajouter une langue') }}</button>
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.contact', 'Contact') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.contact_email', 'Email de contact') }}</label>
          <input
            :value="headerBuilderState?.contactEmail ?? ''"
            @input="onHeaderContactChange(($event.target as HTMLInputElement).value)"
            type="email" class="field" placeholder="contact@exemple.fr" />
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.features', 'Fonctionnalités') }}</legend>
        <label v-for="feat in headerFeaturesList" :key="feat.key" class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="!!(headerBuilderState?.features as any)?.[feat.key]"
            @change="onHeaderFeatureChange(feat.key, ($event.target as HTMLInputElement).checked)"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">{{ i18nt(feat.label) }}</span>
        </label>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-3">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.layout_behavior', 'Layout & Comportement') }}</legend>

        
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.header_layout', 'Layout du header') }}</label>
          <div class="flex gap-2 mt-1">
            <button
              v-for="opt in headerLayoutOptions" :key="opt.value"
              type="button"
              class="flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-colors text-center"
              :class="(headerBuilderState?.features as any)?.headerLayout === opt.value || (!((headerBuilderState?.features as any)?.headerLayout) && opt.value === 'stacked')
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'"
              @click="onHeaderFeatureChange('headerLayout', opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-[10px] text-gray-400 mt-1">{{ tHub('hub.ui.editor_sidebar.header_layout_hint', 'Inline = logo + menu sur 1 ligne. Stacked = 2 lignes.') }}</p>
        </div>

        
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="!!(headerBuilderState?.features as any)?.stickyHeader"
            @change="onHeaderFeatureChange('stickyHeader', ($event.target as HTMLInputElement).checked)"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">{{ tHub('hub.ui.editor_sidebar.sticky_header', 'Header sticky (fixé au scroll)') }}</span>
        </label>
      </fieldset>
    </div>

    
    <div v-else-if="activePanel === 'menu'" class="flex-1 overflow-auto p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.menu_title', '🧭 Menu') }}</h3>
        <button @click="addMenuItem" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          {{ tHub('hub.ui.editor_sidebar.item', 'Item') }}
        </button>
      </div>
      <p class="text-[10px] text-gray-500 leading-relaxed">
        {{ tHub('hub.ui.editor_sidebar.menu_intro_a', 'Items de navigation principale. 3 types :') }} <strong>{{ tHub('hub.ui.editor_sidebar.menu_type_link', 'lien simple') }}</strong>, <strong>{{ tHub('hub.ui.editor_sidebar.menu_type_dropdown', 'dropdown plat') }}</strong> {{ tHub('hub.ui.editor_sidebar.menu_or', 'ou') }} <strong>{{ tHub('hub.ui.editor_sidebar.menu_type_mega', 'mégamenu colonnes') }}</strong>.
        {{ tHub('hub.ui.editor_sidebar.menu_click_hint', 'Cliquez sur un item pour l\'éditer.') }}
      </p>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-1.5">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.nav_bar', 'Barre de navigation') }}</legend>
        <p class="text-[10px] text-gray-500 leading-snug">
          {{ tHub('hub.ui.editor_sidebar.nav_bar_hint', 'Univers affichés sur la barre horizontale. Désactivez pour les déplacer dans le burger.') }}
        </p>
        <template v-if="menuItems.some(it => menuItemTypeOf(it) === 'megamenu')">
          <div
            v-for="(item, i) in menuItems"
            v-show="menuItemTypeOf(item) === 'megamenu'"
            :key="i"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all"
            :class="item.barVisible !== false
              ? 'border-gray-200 bg-white hover:border-primary-200'
              : 'border-dashed border-gray-200 bg-gray-50 opacity-60'"
          >
            
            <div class="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                :disabled="prevMegamenuIdx(i) === -1"
                class="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-primary-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                :aria-label="tHub('hub.ui.editor_sidebar.move_up_item', 'Monter {name}', { name: i18nt(item.label) })"
                @click="moveMenuItem(i, prevMegamenuIdx(i))"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
                </svg>
              </button>
              <button
                type="button"
                :disabled="nextMegamenuIdx(i) === -1"
                class="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-primary-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                :aria-label="tHub('hub.ui.editor_sidebar.move_down_item', 'Descendre {name}', { name: i18nt(item.label) })"
                @click="moveMenuItem(i, nextMegamenuIdx(i))"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>

            
            <span
              class="flex-1 text-xs font-medium truncate"
              :class="item.barVisible !== false ? 'text-gray-800' : 'text-gray-400'"
            >
              {{ i18nt(item.label) || tHub('hub.ui.editor_sidebar.no_label', '(sans label)') }}
            </span>

            
            <button
              type="button"
              role="switch"
              :aria-checked="item.barVisible !== false"
              :aria-label="item.barVisible !== false ? tHub('hub.ui.editor_sidebar.hide_on_bar', 'Masquer {name} sur la barre', { name: i18nt(item.label) }) : tHub('hub.ui.editor_sidebar.show_on_bar', 'Afficher {name} sur la barre', { name: i18nt(item.label) })"
              class="relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              :class="item.barVisible !== false ? 'bg-primary-600' : 'bg-gray-300'"
              @click="updateMenuItem(i, { barVisible: item.barVisible === false })"
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                :class="item.barVisible !== false ? 'translate-x-4' : 'translate-x-0'"
                aria-hidden="true"
              />
            </button>
          </div>
        </template>
        <p v-else class="text-[10px] text-gray-400 text-center py-2">
          {{ tHub('hub.ui.editor_sidebar.add_megamenu_hint', 'Ajoutez des items de type Mégamenu ci-dessous') }}
        </p>
      </fieldset>

      
      <div v-for="(item, i) in menuItems" :key="i" class="border border-gray-200 rounded-xl bg-white overflow-hidden">
        
        <div class="flex items-center gap-1 px-2.5 py-2 bg-gray-50/70 border-b border-gray-100">
          <button @click="moveMenuItem(i, i - 1)" :disabled="i === 0" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" /></svg>
          </button>
          <button @click="moveMenuItem(i, i + 1)" :disabled="i === menuItems.length - 1" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 disabled:cursor-not-allowed">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </button>
          <button
            @click="expandedMenuItem = expandedMenuItem === i ? null : i"
            class="flex-1 flex items-center gap-2 px-1 text-left"
          >
            <span class="text-xs font-semibold text-gray-800 truncate">{{ i18nt(item.label) || tHub('hub.ui.editor_sidebar.no_label', '(sans label)') }}</span>
            <span class="text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
                  :class="menuItemTypeBadge(item)">
              {{ menuItemTypeLabel(item) }}
            </span>
          </button>
          <button @click="removeMenuItem(i)" class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" :title="tHub('hub.ui.editor_sidebar.delete', 'Supprimer')">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
          <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="expandedMenuItem === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>

        
        <div v-if="expandedMenuItem === i" class="p-3 space-y-3">
          
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.displayed_label', 'Libellé affiché') }}</label>
            <EditorI18nField
              :model-value="item.label"
              :langs="tenantLangs"
              :placeholder="tHub('hub.ui.editor_sidebar.our_products_ph', 'Nos Produits')"
              @update:model-value="updateMenuItem(i, { label: $event })"
            />
          </div>

          
          <div class="rounded-lg border border-gray-200 p-2 bg-amber-50/40">
            <label class="field-label flex items-center gap-1">
              <span>{{ tHub('hub.ui.editor_sidebar.badge_above', '🔖 Bulle au-dessus') }}</span>
              <span class="text-[9px] font-normal text-gray-400 normal-case tracking-normal">{{ tHub('hub.ui.editor_sidebar.optional', '— optionnel') }}</span>
            </label>
            <EditorI18nField
              :model-value="item.badge"
              :langs="tenantLangs"
              :placeholder="tHub('hub.ui.editor_sidebar.badge_ph', 'Nouveau')"
              @update:model-value="updateMenuItem(i, { badge: $event })"
            />
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label class="text-[10px] font-medium text-gray-500 mb-0.5 block">{{ tHub('hub.ui.editor_sidebar.background', 'Fond') }}</label>
                <input
                  type="color"
                  :value="item.badgeBg || '#FFEB3B'"
                  @input="updateMenuItem(i, { badgeBg: ($event.target as HTMLInputElement).value })"
                  class="w-full h-7 rounded border border-gray-200 cursor-pointer"
                />
              </div>
              <div>
                <label class="text-[10px] font-medium text-gray-500 mb-0.5 block">{{ tHub('hub.ui.editor_sidebar.text', 'Texte') }}</label>
                <input
                  type="color"
                  :value="item.badgeColor || '#000000'"
                  @input="updateMenuItem(i, { badgeColor: ($event.target as HTMLInputElement).value })"
                  class="w-full h-7 rounded border border-gray-200 cursor-pointer"
                />
              </div>
            </div>
          </div>

          
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.type', 'Type') }}</label>
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="t in MENU_TYPES" :key="t.value"
                @click="setMenuItemType(i, t.value)"
                class="text-[10px] font-semibold py-1.5 px-1 rounded-lg border transition-colors"
                :class="menuItemTypeOf(item) === t.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          
          <div v-if="menuItemTypeOf(item) === 'link'">
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.url', 'URL') }}</label>
            <input
              :value="item.href ?? ''"
              @input="updateMenuItem(i, { href: ($event.target as HTMLInputElement).value })"
              type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.path_or_url_ph2', '/blog ou https://...')" />
          </div>

          
          <div v-else-if="menuItemTypeOf(item) === 'dropdown'" class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="field-label !mb-0">{{ tHub('hub.ui.editor_sidebar.dropdown_links', 'Liens du dropdown') }}</label>
              <button @click="addDropdownLink(i)" class="text-[10px] font-semibold text-primary-600 hover:bg-primary-50 px-2 py-0.5 rounded">{{ tHub('hub.ui.editor_sidebar.add_link', '+ Lien') }}</button>
            </div>
            <div v-for="(link, li) in (item.megaMenu?.[0]?.links ?? [])" :key="li" class="border border-gray-100 rounded-lg p-1.5 space-y-1 bg-white">
              <div class="flex items-center gap-1">
                <EditorI18nField
                  :model-value="link.label"
                  :langs="tenantLangs"
                  :placeholder="tHub('hub.ui.editor_sidebar.label_field', 'Libellé')"
                  class="flex-1"
                  @update:model-value="updateDropdownLink(i, li, { label: $event })"
                />
                <button @click="moveDropdownLink(i, li, li - 1)" :disabled="li === 0" :title="tHub('hub.ui.editor_sidebar.move_up', 'Monter')" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 shrink-0">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                </button>
                <button @click="moveDropdownLink(i, li, li + 1)" :disabled="li === ((item.megaMenu?.[0]?.links?.length ?? 0) - 1)" :title="tHub('hub.ui.editor_sidebar.move_down', 'Descendre')" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 shrink-0">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </button>
                <button @click="removeDropdownLink(i, li)" class="text-red-400 hover:text-red-600 shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <input
                :value="link.href"
                @input="updateDropdownLink(i, li, { href: ($event.target as HTMLInputElement).value })"
                type="text" class="field w-full !text-[10px] text-gray-400" placeholder="/url" />
              
              <div class="flex items-center gap-1.5 flex-wrap">
                <label class="flex items-center gap-1 cursor-pointer" :title="tHub('hub.ui.editor_sidebar.show_ps_children', 'Afficher les sous-catégories PrestaShop sous ce lien')">
                  <input
                    type="checkbox"
                    :checked="!!link.showPsChildren"
                    class="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    @change="updateDropdownLink(i, li, { showPsChildren: ($event.target as HTMLInputElement).checked })"
                  />
                  <span class="text-[10px] font-medium text-gray-600">{{ tHub('hub.ui.editor_sidebar.show_subcat', 'Afficher sous-cat.') }}</span>
                </label>
                <input
                  :value="link.psCategoryId ?? ''"
                  @input="updateDropdownLink(i, li, { psCategoryId: Number(($event.target as HTMLInputElement).value) || undefined })"
                  type="number" class="field w-16 !text-[10px] !py-0.5 !px-1" :placeholder="tHub('hub.ui.editor_sidebar.cat_id_ph', 'cat ID')" :title="tHub('hub.ui.editor_sidebar.ps_cat_id', 'ID catégorie PS')" />
                <span v-if="link.showPsChildren && link.psChildren?.length" class="text-[10px] text-violet-600 font-semibold">+{{ link.psChildren.length }}</span>
              </div>
            </div>
            <p v-if="!item.megaMenu?.[0]?.links?.length" class="text-[10px] text-gray-400 text-center py-2">{{ tHub('hub.ui.editor_sidebar.no_links', 'Aucun lien — cliquez sur + Lien') }}</p>
          </div>

          
          <div v-else-if="menuItemTypeOf(item) === 'megamenu'" class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="field-label !mb-0">{{ tHub('hub.ui.editor_sidebar.columns_count', 'Colonnes ({count})', { count: item.megaMenu?.length ?? 0 }) }}</label>
              <button @click="addMegaColumn(i)" class="text-[10px] font-semibold text-primary-600 hover:bg-primary-50 px-2 py-0.5 rounded">{{ tHub('hub.ui.editor_sidebar.add_column', '+ Colonne') }}</button>
            </div>

            <div v-for="(col, ci) in item.megaMenu ?? []" :key="ci" class="border border-violet-200 rounded-xl bg-violet-50/30 p-2.5 space-y-2">
              <div class="flex items-center gap-1.5">
                <button @click="moveMegaColumn(i, ci, ci - 1)" :disabled="ci === 0" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
                </button>
                <span class="text-[9px] font-bold text-violet-600 uppercase tracking-wider flex-1">{{ tHub('hub.ui.editor_sidebar.col_n', 'Col {n}', { n: ci + 1 }) }}</span>
                <button @click="removeMegaColumn(i, ci)" class="text-red-400 hover:text-red-600">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div class="flex gap-1.5 items-stretch">
                
                <div class="shrink-0">
                  <button
                    type="button"
                    :title="col.icon && String(col.icon).startsWith('/')
                      ? tHub('hub.ui.editor_sidebar.replace_image', 'Remplacer l\'image (clic)')
                      : tHub('hub.ui.editor_sidebar.upload_image', 'Téléverser une image')"
                    :disabled="megaIconUploading[`${i}:${ci}`]"
                    class="relative h-9 w-9 flex items-center justify-center rounded-lg border border-violet-200 bg-white hover:bg-violet-50 transition-colors disabled:opacity-40"
                    @click="triggerMegaIconUpload(i, ci)"
                  >
                    <img
                      v-if="col.icon && String(col.icon).startsWith('/')"
                      :src="col.icon"
                      alt=""
                      class="h-6 w-6 object-contain"
                    />
                    <span
                      v-else-if="col.icon"
                      class="text-base leading-none"
                      aria-hidden="true"
                    >{{ col.icon }}</span>
                    <svg
                      v-else
                      class="w-3.5 h-3.5 text-violet-400"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <span
                      v-if="megaIconUploading[`${i}:${ci}`]"
                      class="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg"
                    >
                      <svg class="w-3.5 h-3.5 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </span>
                  </button>
                  <input
                    :ref="el => { if (el) megaIconFileInputs[`${i}:${ci}`] = el as HTMLInputElement }"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    class="hidden"
                    @change="onMegaIconFileChange(i, ci, $event)"
                  />
                </div>
                <EditorI18nField
                  :model-value="col.title"
                  :langs="tenantLangs"
                  :placeholder="tHub('hub.ui.editor_sidebar.column_title_ph', 'Titre de la colonne')"
                  class="flex-1"
                  @update:model-value="updateMegaColumn(i, ci, { title: $event })"
                />
              </div>
              <input
                :value="col.icon ?? ''"
                @input="updateMegaColumn(i, ci, { icon: ($event.target as HTMLInputElement).value })"
                type="text"
                class="field w-full !text-[10px] text-gray-400"
                :placeholder="tHub('hub.ui.editor_sidebar.icon_ph', '🌍 ou /universe/menu-olive.webp')"
              />
              <p v-if="megaIconError[`${i}:${ci}`]" class="text-[10px] text-red-600">{{ megaIconError[`${i}:${ci}`] }}</p>
              <div class="space-y-2">
                <div v-for="(link, li) in col.links ?? []" :key="li" class="border border-gray-100 rounded-lg p-1.5 space-y-1 bg-white">
                  <div class="flex items-center gap-1">
                    <EditorI18nField
                      :model-value="link.label"
                      :langs="tenantLangs"
                      :placeholder="tHub('hub.ui.editor_sidebar.label_field', 'Libellé')"
                      class="flex-1"
                      @update:model-value="updateMegaLink(i, ci, li, { label: $event })"
                    />
                    <button @click="moveMegaLink(i, ci, li, li - 1)" :disabled="li === 0" :title="tHub('hub.ui.editor_sidebar.move_up', 'Monter')" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 shrink-0">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                    </button>
                    <button @click="moveMegaLink(i, ci, li, li + 1)" :disabled="li === ((col.links?.length ?? 0) - 1)" :title="tHub('hub.ui.editor_sidebar.move_down', 'Descendre')" class="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 disabled:opacity-20 shrink-0">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    <button @click="removeMegaLink(i, ci, li)" class="text-red-400 hover:text-red-600 shrink-0">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <input
                    :value="link.href"
                    @input="updateMegaLink(i, ci, li, { href: ($event.target as HTMLInputElement).value })"
                    type="text" class="field w-full !text-[10px] text-gray-400" placeholder="/url" />
                  
                  <EditorI18nField
                    :model-value="link.description"
                    :langs="tenantLangs"
                    :placeholder="tHub('hub.ui.editor_sidebar.link_desc_ph', 'Description courte (ex: Amandes, dattes, pistaches…)')"
                    class="!text-[10px]"
                    @update:model-value="updateMegaLink(i, ci, li, { description: $event })"
                  />
                  
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <label class="flex items-center gap-1 cursor-pointer" :title="tHub('hub.ui.editor_sidebar.show_ps_children', 'Afficher les sous-catégories PrestaShop sous ce lien')">
                      <input
                        type="checkbox"
                        :checked="!!link.showPsChildren"
                        class="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        @change="updateMegaLink(i, ci, li, { showPsChildren: ($event.target as HTMLInputElement).checked })"
                      />
                      <span class="text-[10px] font-medium text-gray-600">{{ tHub('hub.ui.editor_sidebar.show_subcat', 'Afficher sous-cat.') }}</span>
                    </label>
                    <input
                      :value="link.psCategoryId ?? ''"
                      @input="updateMegaLink(i, ci, li, { psCategoryId: Number(($event.target as HTMLInputElement).value) || undefined })"
                      type="number" class="field w-16 !text-[10px] !py-0.5 !px-1" :placeholder="tHub('hub.ui.editor_sidebar.cat_id_ph', 'cat ID')" :title="tHub('hub.ui.editor_sidebar.ps_cat_id', 'ID catégorie PS')" />
                    <span v-if="link.showPsChildren && link.psChildren?.length" class="text-[10px] text-violet-600 font-semibold">+{{ link.psChildren.length }}</span>
                  </div>
                </div>
                <button @click="addMegaLink(i, ci)" class="w-full text-[10px] font-semibold text-primary-600 hover:bg-primary-50 py-1 rounded">{{ tHub('hub.ui.editor_sidebar.add_link', '+ Lien') }}</button>
              </div>
            </div>
            <p v-if="!item.megaMenu?.length" class="text-[10px] text-gray-400 text-center py-2">{{ tHub('hub.ui.editor_sidebar.no_columns', 'Aucune colonne — cliquez sur + Colonne') }}</p>
          </div>
        </div>
      </div>

      <p v-if="!menuItems.length" class="text-xs text-gray-400 text-center py-6">{{ tHub('hub.ui.editor_sidebar.no_items', 'Aucun item — cliquez sur + Item') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'footer'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.footer_title', '🦶 Footer') }}</h3>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.identity', 'Identité') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.description', 'Description') }}</label>
          <EditorI18nField
            :model-value="footerBuilderState?.description"
            :langs="tenantLangs"
            type="textarea"
            :placeholder="tHub('hub.ui.editor_sidebar.footer_desc_ph', 'Votre entreprise en quelques mots…')"
            @update:model-value="onFooterFieldChange({ description: $event })"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.hours', 'Horaires') }}</label>
          <EditorI18nField
            :model-value="footerBuilderState?.hours"
            :langs="tenantLangs"
            type="textarea"
            :placeholder="tHub('hub.ui.editor_sidebar.hours_ph', 'Lun–Ven : 9h–18h')"
            @update:model-value="onFooterFieldChange({ hours: $event })"
          />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.footer_theme', 'Thème footer') }}</label>
          <select
            :value="footerBuilderState?.theme ?? 'light'"
            @change="onFooterFieldChange({ theme: ($event.target as HTMLSelectElement).value })"
            class="field"
          >
            <option value="light">{{ tHub('hub.ui.editor_sidebar.light', 'Clair') }}</option>
            <option value="dark">{{ tHub('hub.ui.editor_sidebar.dark', 'Sombre') }}</option>
          </select>
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.contact', 'Contact') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.email', 'Email') }}</label>
          <input
            :value="footerBuilderState?.contact?.email ?? ''"
            @input="onFooterContactChange({ email: ($event.target as HTMLInputElement).value })"
            type="email" class="field" placeholder="contact@exemple.fr" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.phone', 'Téléphone') }}</label>
          <input
            :value="footerBuilderState?.contact?.phone ?? ''"
            @input="onFooterContactChange({ phone: ($event.target as HTMLInputElement).value })"
            type="text" class="field" placeholder="+33 3 XX XX XX XX" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.address', 'Adresse') }}</label>
          <textarea
            :value="footerBuilderState?.contact?.address ?? ''"
            @input="onFooterContactChange({ address: ($event.target as HTMLTextAreaElement).value })"
            rows="2" class="field resize-none" placeholder="1 Rue de la Paix, 57000 Metz" />
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.bottom_bar', 'Barre basse') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.copyright', 'Copyright') }}</label>
          <EditorI18nField
            :model-value="footerBuilderState?.bottomBar?.copyright"
            :langs="tenantLangs"
            :placeholder="tHub('hub.ui.editor_sidebar.copyright_ph', '© 2026 Mon Entreprise')"
            @update:model-value="onFooterBottomBarChange({ copyright: $event })"
          />
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.social_networks', 'Réseaux sociaux') }}</legend>
        <div
          v-for="(s, si) in footerSocialList"
          :key="si"
          class="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50"
        >
          <select
            :value="s.platform"
            @change="updateSocialItem(si, { platform: ($event.target as HTMLSelectElement).value as any })"
            class="field !w-24 !py-1 !text-[10px]"
          >
            <option v-for="p in SOCIAL_PLATFORMS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
          <input
            :value="s.href"
            @input="updateSocialItem(si, { href: ($event.target as HTMLInputElement).value })"
            type="url" class="field flex-1 !py-1" placeholder="https://..."
          />
          <button @click="removeSocialItem(si)" class="text-red-400 hover:text-red-600 shrink-0" :title="tHub('hub.ui.editor_sidebar.delete', 'Supprimer')">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          @click="addSocialItem"
          class="w-full text-[10px] font-semibold py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
        >
          {{ tHub('hub.ui.editor_sidebar.add_social', '+ Réseau social') }}
        </button>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.newsletter', 'Newsletter') }}</legend>
        <label class="flex items-center justify-between gap-2 cursor-pointer">
          <span class="text-xs font-medium text-gray-700">{{ tHub('hub.ui.editor_sidebar.newsletter_enable', 'Activer le formulaire (sous les réseaux sociaux)') }}</span>
          <input
            type="checkbox"
            :checked="!!footerBuilderState?.newsletter?.show"
            @change="onFooterNewsletterChange({ show: ($event.target as HTMLInputElement).checked })"
            class="w-4 h-4 accent-primary-600 cursor-pointer"
          />
        </label>
        <template v-if="footerBuilderState?.newsletter?.show">
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.title', 'Titre') }}</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.title"
              :langs="tenantLangs"
              :placeholder="tHub('hub.ui.editor_sidebar.newsletter', 'Newsletter')"
              @update:model-value="onFooterNewsletterChange({ title: $event })"
            />
          </div>
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.tagline', 'Accroche') }}</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.description"
              :langs="tenantLangs"
              type="textarea"
              :placeholder="tHub('hub.ui.editor_sidebar.newsletter_tagline_ph', 'Restez informé de nos arrivages…')"
              @update:model-value="onFooterNewsletterChange({ description: $event })"
            />
          </div>
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.email_field_placeholder', 'Placeholder champ email') }}</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.placeholder"
              :langs="tenantLangs"
              :placeholder="tHub('hub.ui.editor_sidebar.your_email_ph', 'Votre adresse email')"
              @update:model-value="onFooterNewsletterChange({ placeholder: $event })"
            />
          </div>
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.button_label', 'Libellé bouton') }}</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.ctaLabel"
              :langs="tenantLangs"
              :placeholder="tHub('hub.ui.editor_sidebar.subscribe_ph', 'S\'inscrire')"
              @update:model-value="onFooterNewsletterChange({ ctaLabel: $event })"
            />
          </div>
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.consent_text', 'Texte de consentement (RGPD — obligatoire)') }}</label>
            <EditorI18nField
              :model-value="footerBuilderState?.newsletter?.consentText"
              :langs="tenantLangs"
              type="textarea"
              :placeholder="tHub('hub.ui.editor_sidebar.consent_ph', 'J\'accepte de recevoir la newsletter et confirme avoir pris connaissance de la politique de confidentialité.')"
              @update:model-value="onFooterNewsletterChange({ consentText: $event })"
            />
            <p class="text-[10px] text-gray-400 mt-1 leading-relaxed">
              {{ tHub('hub.ui.editor_sidebar.consent_help', 'Ce texte est snapshoté à chaque inscription pour tracer le consentement (article 7 RGPD). Sans valeur, le formulaire est désactivé côté front.') }}
            </p>
          </div>
        </template>
      </fieldset>

      
      <fieldset v-if="isDbSections" class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.link_columns', 'Colonnes de liens') }}</legend>
        <p v-if="footerColumnsLoading" class="text-[10px] text-gray-400 text-center py-2">{{ tHub('hub.ui.editor_sidebar.loading', 'Chargement…') }}</p>
        <template v-else>
          <div
            v-for="(col, ci) in footerColumnsList"
            :key="ci"
            class="border border-gray-100 rounded-lg p-2 space-y-1.5"
          >
            <div class="flex items-center gap-2">
              <input
                :value="col.title"
                @input="updateColumnTitle(ci, ($event.target as HTMLInputElement).value)"
                class="field flex-1 !py-1 !text-[10px] font-semibold" :placeholder="tHub('hub.ui.editor_sidebar.column_title_short_ph', 'Titre colonne')"
              />
              <button @click="removeColumn(ci)" class="text-red-400 hover:text-red-600 shrink-0" :title="tHub('hub.ui.editor_sidebar.delete_column', 'Supprimer la colonne')">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div
              v-for="(link, li) in col.links"
              :key="link.id"
              class="flex items-center gap-1.5 pl-2"
            >
              <input
                :value="link.label"
                @input="updateFooterLink(ci, li, { label: ($event.target as HTMLInputElement).value })"
                class="field flex-1 !py-0.5 !text-[10px]" :placeholder="tHub('hub.ui.editor_sidebar.label_field', 'Libellé')"
              />
              <input
                :value="link.href"
                @input="updateFooterLink(ci, li, { href: ($event.target as HTMLInputElement).value })"
                class="field flex-1 !py-0.5 !text-[10px]" :placeholder="tHub('hub.ui.editor_sidebar.page_path_ph', '/page/...')"
              />
              <button @click="removeFooterLink(ci, li)" class="text-red-300 hover:text-red-500 shrink-0">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              @click="addFooterLink(ci)"
              class="w-full text-[9px] font-medium py-1 rounded border border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
            >
              {{ tHub('hub.ui.editor_sidebar.add_link', '+ Lien') }}
            </button>
          </div>
          <button
            @click="addColumn"
            class="w-full text-[10px] font-semibold py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            {{ tHub('hub.ui.editor_sidebar.add_column', '+ Colonne') }}
          </button>
          <p v-if="footerColumnsDirty" class="text-[10px] font-medium text-amber-600 italic mt-1 text-center">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
        </template>
      </fieldset>
    </div>

    
    <div v-else-if="activePanel === 'theme'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.theme_title', '🎨 Thème') }}</h3>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-3">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.colors', 'Couleurs') }}</legend>
        <div v-for="col in themeColorsList" :key="col.key" class="flex items-center gap-3">
          <input
            type="color"
            :value="(themeBuilderState?.colors as any)?.[col.key] ?? '#000000'"
            @input="onThemeColorChange(col.key, ($event.target as HTMLInputElement).value)"
            class="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer shrink-0"
            :title="col.label"
          />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-gray-700">{{ col.label }}</p>
            <input
              type="text"
              :value="(themeBuilderState?.colors as any)?.[col.key] ?? ''"
              @input="onThemeColorChange(col.key, ($event.target as HTMLInputElement).value)"
              class="field mt-0.5" placeholder="#000000" />
          </div>
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.typography', 'Typographie') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.font_css', 'Police (CSS)') }}</label>
          <input
            :value="themeBuilderState?.typography?.fontFamily ?? ''"
            @input="onThemeTypoChange('fontFamily', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="Montserrat, sans-serif" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.local_font_sheet', 'Feuille de polices locale (optionnel)') }}</label>
          <input
            :value="themeBuilderState?.typography?.fontUrl ?? ''"
            @input="onThemeTypoChange('fontUrl', ($event.target as HTMLInputElement).value)"
            type="text" class="field" placeholder="/fonts/marque.css" />
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-3">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.interface', 'Interface') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.radius', 'Rayon des éléments') }}</label>
          <div class="flex flex-wrap gap-1.5 mt-1">
            <button
              v-for="r in radiusOptions"
              :key="r.value"
              @click="onThemeUiChange('borderRadius', r.value)"
              :class="[
                'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                themeBuilderState?.ui?.borderRadius === r.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 text-gray-600 hover:border-primary-300',
              ]"
            >
              {{ r.label }}
            </button>
          </div>
        </div>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            :checked="themeBuilderState?.ui?.shadow !== false"
            @change="onThemeUiChange('shadow', ($event.target as HTMLInputElement).checked)"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
          />
          <span class="text-xs text-gray-700">{{ tHub('hub.ui.editor_sidebar.enable_shadows', 'Activer les ombres portées') }}</span>
        </label>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.center_column_width', 'Largeur colonne centrale') }}</label>
          <div class="flex flex-wrap gap-1.5 mt-1">
            <button
              v-for="cw in contentWidthOptions"
              :key="cw.value"
              @click="onThemeUiChange('contentWidth', cw.value)"
              :class="[
                'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                (themeBuilderState?.ui?.contentWidth ?? '8xl') === cw.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 text-gray-600 hover:border-primary-300',
              ]"
            >
              {{ cw.label }}
            </button>
          </div>
        </div>
      </fieldset>
    </div>

    
    <div v-else-if="activePanel === 'homepage:hero'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.hero_title', '🦸 Hero') }}</h3>

      
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.layout', 'Layout') }}</label>
        <select :value="hpDb.hero?.layout ?? 'banner'" @change="onHpHeroChange({ layout: ($event.target as HTMLSelectElement).value as any })" class="field">
          <option value="banner">{{ tHub('hub.ui.editor_sidebar.layout_banner', 'Banner (image de fond)') }}</option>
          <option value="portfolio">{{ tHub('hub.ui.editor_sidebar.layout_portfolio', 'Portfolio (texte + photo)') }}</option>
        </select>
      </div>

      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.title_html', 'Titre (HTML autorisé)') }}</label>
        <EditorI18nField :model-value="hpDb.hero?.title" :langs="tenantLangs" type="textarea" :placeholder="tHub('hub.ui.editor_sidebar.main_title_ph', 'Titre principal')"
          @update:model-value="onHpHeroChange({ title: $event })" />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.subtitle', 'Sous-titre') }}</label>
        <EditorI18nField :model-value="hpDb.hero?.subtitle" :langs="tenantLangs" type="textarea" :placeholder="tHub('hub.ui.editor_sidebar.short_desc_ph', 'Description courte')"
          @update:model-value="onHpHeroChange({ subtitle: $event })" />
      </div>

      
      <div v-if="hpDb.hero?.layout === 'portfolio'">
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.status_badge', 'Badge de statut') }}</label>
        <EditorI18nField :model-value="hpDb.hero?.badge" :langs="tenantLangs" :placeholder="tHub('hub.ui.editor_sidebar.status_badge_ph', 'Disponible pour nouveaux projets')"
          @update:model-value="onHpHeroChange({ badge: $event })" />
      </div>

      
      <div v-if="hpDb.hero?.layout === 'portfolio'">
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.tags_skills', 'Tags / Compétences (séparés par des virgules)') }}</label>
        <input
          :value="(hpDb.hero?.tags ?? []).join(', ')"
          @input="onHpHeroChange({ tags: ($event.target as HTMLInputElement).value.split(',').map((s: string) => s.trim()).filter(Boolean) })"
          type="text" class="field" placeholder="PrestaShop, Nuxt 3, Docker" />
      </div>

      <div>
        <label class="field-label">{{ hpDb.hero?.layout === 'portfolio' ? tHub('hub.ui.editor_sidebar.portrait_photo', 'Photo portrait') : tHub('hub.ui.editor_sidebar.background_image', 'Image de fond') }}</label>
        <div class="flex gap-1.5">
          <input :value="hpDb.hero?.image ?? ''" @input="onHpHeroChange({ image: ($event.target as HTMLInputElement).value })"
            type="url" class="field flex-1" :placeholder="tHub('hub.ui.editor_sidebar.url_or_upload_ph2', 'https://… ou upload →')" />
          <button
            type="button"
            @click="hpHeroUploadInput?.click()"
            :disabled="hpHeroUploading"
            class="text-[11px] font-semibold px-2.5 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-1"
            :title="tHub('hub.ui.editor_sidebar.upload_an_image', 'Uploader une image')"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5 7.5 12M12 7.5v12" /></svg>
            {{ hpHeroUploading ? '…' : tHub('hub.ui.editor_sidebar.upload', 'Upload') }}
          </button>
          <input ref="hpHeroUploadInput" type="file" accept="image/*" class="hidden" @change="onHpHeroUpload" />
        </div>
        <p v-if="hpHeroUploadError" class="mt-1 text-[11px] text-red-600">{{ hpHeroUploadError }}</p>
        <div v-if="hpDb.hero?.image" class="mt-1.5 rounded-lg overflow-hidden border border-gray-200 h-20">
          <img :src="hpDb.hero.image" :alt="tHub('hub.ui.editor_sidebar.preview_alt', 'preview')" class="w-full h-full object-cover" />
        </div>
      </div>

      
      <div v-if="hpDb.hero?.layout !== 'portfolio'">
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.banner_link', 'Lien au clic sur la bannière (optionnel)') }}</label>
        <input :value="hpDb.hero?.imageHref ?? ''" @input="onHpHeroChange({ imageHref: ($event.target as HTMLInputElement).value })"
          type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.path_or_url_ph', '/promotions ou https://...')" />
        <p class="mt-0.5 text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.banner_link_help', 'Si renseigné, l\'utilisateur clique n\'importe où sur l\'image et est redirigé. Le CTA reste cliquable indépendamment.') }}</p>
      </div>

      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.cta_primary', 'CTA Principal') }}</legend>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.cta_label', 'Label') }}</label>
            <EditorI18nField :model-value="hpDb.hero?.cta?.label" :langs="tenantLangs" :placeholder="tHub('hub.ui.editor_sidebar.discover_ph', 'Découvrir')"
              @update:model-value="onHpHeroChange({ cta: { ...(hpDb.hero?.cta ?? {}), label: $event, href: hpDb.hero?.cta?.href ?? '/' } })" />
          </div>
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.link', 'Lien') }}</label>
            <input
              :value="hpDb.hero?.cta?.href ?? ''"
              @input="onHpHeroChange({ cta: { ...(hpDb.hero?.cta ?? {}), href: ($event.target as HTMLInputElement).value, label: hpDb.hero?.cta?.label ?? '' } })"
              type="text" class="field" placeholder="/ma-categorie/" />
          </div>
        </div>
      </fieldset>

      
      <fieldset v-if="hpDb.hero?.layout === 'portfolio'" class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.cta_secondary', 'CTA Secondaire') }}</legend>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.cta_label', 'Label') }}</label>
            <EditorI18nField :model-value="hpDb.hero?.cta2?.label" :langs="tenantLangs" :placeholder="tHub('hub.ui.editor_sidebar.learn_more_ph', 'En savoir plus →')"
              @update:model-value="onHpHeroChange({ cta2: { ...(hpDb.hero?.cta2 ?? {}), label: $event, href: hpDb.hero?.cta2?.href ?? '/' } })" />
          </div>
          <div>
            <label class="field-label">{{ tHub('hub.ui.editor_sidebar.link', 'Lien') }}</label>
            <input
              :value="hpDb.hero?.cta2?.href ?? ''"
              @input="onHpHeroChange({ cta2: { ...(hpDb.hero?.cta2 ?? {}), href: ($event.target as HTMLInputElement).value, label: hpDb.hero?.cta2?.label ?? '' } })"
              type="text" class="field" placeholder="/blog" />
          </div>
        </div>
      </fieldset>
    </div>

    
    <div v-else-if="activePanel === 'homepage:features'" class="flex-1 overflow-auto p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-800">{{ tHub('hub.ui.editor_sidebar.strengths_title', '✨ Atouts') }}</h3>
        <button @click="onHpAddFeature" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          {{ tHub('hub.ui.editor_sidebar.add', 'Ajouter') }}
        </button>
      </div>
      <div v-for="(feat, i) in hpDb.features ?? []" :key="i" class="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ tHub('hub.ui.editor_sidebar.strength_n', 'Atout {n}', { n: i + 1 }) }}</span>
          <button @click="onHpRemoveFeature(i)" class="text-red-400 hover:text-red-600 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <select :value="feat.icon" @change="onHpUpdateFeature(i, { icon: ($event.target as HTMLSelectElement).value as any })" class="field">
          <option v-for="ico in FEATURE_ICONS" :key="ico.value" :value="ico.value">{{ ico.label }}</option>
        </select>
        <EditorI18nField :model-value="feat.label" :langs="tenantLangs" :placeholder="tHub('hub.ui.editor_sidebar.cta_label', 'Label')" @update:model-value="onHpUpdateFeature(i, { label: $event })" />
        <EditorI18nField :model-value="feat.description" :langs="tenantLangs" :placeholder="tHub('hub.ui.editor_sidebar.description', 'Description')" @update:model-value="onHpUpdateFeature(i, { description: $event })" />
      </div>
      <p v-if="!hpDb.features?.length" class="text-xs text-gray-400 text-center py-4">{{ tHub('hub.ui.editor_sidebar.no_strengths', 'Aucun atout — cliquez sur Ajouter') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'homepage:categories'" class="flex-1 overflow-auto p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-800">{{ tHub('hub.ui.editor_sidebar.categories_title', '🗂️ Catégories') }}</h3>
        <button @click="onHpAddCategory" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          {{ tHub('hub.ui.editor_sidebar.add', 'Ajouter') }}
        </button>
      </div>
      <div v-for="(cat, i) in hpDb.categories ?? []" :key="i" class="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ tHub('hub.ui.editor_sidebar.cat_n', 'Cat. {n}', { n: i + 1 }) }}</span>
          <button @click="onHpRemoveCategory(i)" class="text-red-400 hover:text-red-600 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <EditorI18nField :model-value="cat.label" :langs="tenantLangs" :placeholder="tHub('hub.ui.editor_sidebar.category_name_ph', 'Nom de la catégorie')" @update:model-value="onHpUpdateCategory(i, { label: $event })" />
        <input :value="cat.image" @input="onHpUpdateCategory(i, { image: ($event.target as HTMLInputElement).value })" type="url" class="field" :placeholder="tHub('hub.ui.editor_sidebar.image_url_ph', 'URL de l\'image')" />
        <input :value="cat.href" @input="onHpUpdateCategory(i, { href: ($event.target as HTMLInputElement).value })" type="text" class="field" placeholder="/ma-categorie/" />
        <div v-if="cat.image" class="rounded-lg overflow-hidden border border-gray-200 h-16">
          <img :src="cat.image" :alt="cat.label" class="w-full h-full object-cover" />
        </div>
      </div>
      <p v-if="!hpDb.categories?.length" class="text-xs text-gray-400 text-center py-4">{{ tHub('hub.ui.editor_sidebar.no_categories', 'Aucune catégorie — cliquez sur Ajouter') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'homepage:testimonials'" class="flex-1 overflow-auto p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-800">{{ tHub('hub.ui.editor_sidebar.testimonials_title', '⭐ Témoignages') }}</h3>
        <button @click="onHpAddTestimonial" class="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          {{ tHub('hub.ui.editor_sidebar.add', 'Ajouter') }}
        </button>
      </div>
      <div v-for="(t, i) in hpDb.testimonials ?? []" :key="i" class="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ tHub('hub.ui.editor_sidebar.testimonial_n', 'Témoignage {n}', { n: i + 1 }) }}</span>
          <button @click="onHpRemoveTestimonial(i)" class="text-red-400 hover:text-red-600 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <input :value="t.author" @input="onHpUpdateTestimonial(i, { author: ($event.target as HTMLInputElement).value })" type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.author_ph', 'Auteur')" />
        <input :value="t.role ?? ''" @input="onHpUpdateTestimonial(i, { role: ($event.target as HTMLInputElement).value })" type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.role_company_ph', 'Rôle / Entreprise')" />
        <textarea :value="t.text" @input="onHpUpdateTestimonial(i, { text: ($event.target as HTMLTextAreaElement).value })" rows="3" class="field resize-none" :placeholder="tHub('hub.ui.editor_sidebar.testimonial_ph', 'Témoignage…')" />
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-semibold text-gray-500">{{ tHub('hub.ui.editor_sidebar.rating', 'Note :') }}</span>
          <button v-for="star in 5" :key="star" @click="onHpUpdateTestimonial(i, { rating: star })" class="text-sm" :class="star <= (t.rating ?? 5) ? 'text-amber-400' : 'text-gray-300'">★</button>
        </div>
      </div>
      <p v-if="!hpDb.testimonials?.length" class="text-xs text-gray-400 text-center py-4">{{ tHub('hub.ui.editor_sidebar.no_testimonials', 'Aucun témoignage — cliquez sur Ajouter') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'homepage:about'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.about_title', '👤 À propos') }}</h3>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.title', 'Titre') }}</label>
        <input :value="hpDb.about?.title ?? ''" @input="onHpAboutChange({ title: ($event.target as HTMLInputElement).value })"
          type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.section_title_short_ph', 'Titre section')" />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.subtitle', 'Sous-titre') }}</label>
        <input :value="hpDb.about?.subtitle ?? ''" @input="onHpAboutChange({ subtitle: ($event.target as HTMLInputElement).value })"
          type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.subtitle_role_ph', 'Sous-titre / rôle')" />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.paragraphs', 'Paragraphes (un par ligne)') }}</label>
        <textarea
          :value="(hpDb.about?.paragraphs ?? []).join('\n\n')"
          @input="onHpAboutChange({ paragraphs: ($event.target as HTMLTextAreaElement).value.split('\n\n').filter(Boolean) })"
          rows="8" class="field resize-none" :placeholder="tHub('hub.ui.editor_sidebar.paragraphs_ph', 'Paragraphe 1\n\nParagraphe 2')" />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.image_url', 'Image (URL)') }}</label>
        <input :value="hpDb.about?.image ?? ''" @input="onHpAboutChange({ image: ($event.target as HTMLInputElement).value })"
          type="url" class="field" placeholder="https://..." />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.maps_embed', 'Embed Google Maps (URL iframe)') }}</label>
        <input :value="hpDb.about?.mapEmbed ?? ''" @input="onHpAboutChange({ mapEmbed: ($event.target as HTMLInputElement).value })"
          type="url" class="field" placeholder="https://www.google.com/maps/embed?..." />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.cta_button', 'Bouton CTA') }}</label>
          <input
            :value="hpDb.about?.cta?.label ?? ''"
            @input="onHpAboutChange({ cta: { ...(hpDb.about?.cta ?? {}), label: ($event.target as HTMLInputElement).value, href: hpDb.about?.cta?.href ?? '/' } })"
            type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.cta_label', 'Label')" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.cta_link', 'Lien CTA') }}</label>
          <input
            :value="hpDb.about?.cta?.href ?? ''"
            @input="onHpAboutChange({ cta: { ...(hpDb.about?.cta ?? {}), href: ($event.target as HTMLInputElement).value, label: hpDb.about?.cta?.label ?? '' } })"
            type="text" class="field" placeholder="/contact" />
        </div>
      </div>
    </div>

    
    <div v-else-if="activePanel === 'homepage:blog'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.blog_title', '📝 Blog') }}</h3>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.section_title', 'Titre de la section') }}</label>
        <input :value="hpDb.blog?.title ?? 'Derniers articles'" @input="onHpBlogChange({ title: ($event.target as HTMLInputElement).value })"
          type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.latest_articles_ph', 'Derniers articles')" />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.article_count', 'Nombre d\'articles') }}</label>
        <select :value="hpDb.blog?.limit ?? 3" @change="onHpBlogChange({ limit: Number(($event.target as HTMLSelectElement).value) })" class="field">
          <option value="3">{{ tHub('hub.ui.editor_sidebar.articles_n', '{count} articles', { count: 3 }) }}</option>
          <option value="4">{{ tHub('hub.ui.editor_sidebar.articles_n', '{count} articles', { count: 4 }) }}</option>
          <option value="6">{{ tHub('hub.ui.editor_sidebar.articles_n', '{count} articles', { count: 6 }) }}</option>
          <option value="9">{{ tHub('hub.ui.editor_sidebar.articles_n', '{count} articles', { count: 9 }) }}</option>
        </select>
      </div>
    </div>

    
    <div v-else-if="activePanel === 'homepage:faq'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.faq_title', '❓ FAQ') }}</h3>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.title', 'Titre') }}</label>
        <input :value="hpDb.faq?.title ?? 'Questions Fréquentes'" @input="onHpFaqChange({ title: ($event.target as HTMLInputElement).value })"
          type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.faq_ph', 'Questions Fréquentes')" />
      </div>
      <div>
        <label class="field-label">{{ tHub('hub.ui.editor_sidebar.subtitle', 'Sous-titre') }}</label>
        <input :value="hpDb.faq?.subtitle ?? ''" @input="onHpFaqChange({ subtitle: ($event.target as HTMLInputElement).value })"
          type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.optional_subtitle_ph', 'Sous-titre optionnel')" />
      </div>
      <p class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.faq_loaded_from', 'Les questions sont chargées depuis') }} <code class="bg-gray-100 px-1 rounded">data/faq.json</code></p>
    </div>

    
    <div v-else-if="activePanel === 'homepage:malt'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.malt_title', '🟠 Carte Malt') }}</h3>
      <p class="text-xs text-gray-500">{{ tHub('hub.ui.editor_sidebar.malt_intro', 'Affiche la carte profil Malt avec les avis et statistiques.') }}</p>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="hpDb.malt?.show !== false"
          @change="onHpMaltChange(($event.target as HTMLInputElement).checked)"
          class="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
        />
        <span class="text-xs text-gray-700">{{ tHub('hub.ui.editor_sidebar.show_malt', 'Afficher la carte Malt') }}</span>
      </label>
    </div>

    
    
    <div v-else-if="activePanel === 'silo:hero'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">{{ tHub('hub.ui.editor_sidebar.category_sections_title', '🗂️ Sections catégories') }}</h3>
      <p class="text-[10px] text-gray-400 -mt-2 truncate">{{ contextPayload.label }} — /…/{{ contextPayload.path }}/</p>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.hero', 'Hero') }}</legend>
        <div>
          <label class="field-label">H1</label>
          <input
            :value="editorSiloState.h1 ?? ''"
            @input="updateSiloField('h1', ($event.target as HTMLInputElement).value)"
            type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.silo_h1_ph', 'Chaussures de randonnée pour homme')" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.short_desc_intro', 'Description courte (intro)') }}</label>
          <textarea
            :value="editorSiloState.intro_html ?? ''"
            @input="updateSiloField('intro_html', ($event.target as HTMLTextAreaElement).value)"
            rows="3" class="field resize-none" :placeholder="tHub('hub.ui.editor_sidebar.intro_ph', 'Texte d\'accroche sous le H1…')" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.category_image_url', 'Image catégorie (URL)') }}</label>
          <input
            :value="editorSiloState.image_path ?? ''"
            @input="updateSiloField('image_path', ($event.target as HTMLInputElement).value)"
            type="url" class="field" placeholder="/silo/fruits-secs.webp" />
        </div>
        <div v-if="editorSiloState.image_path" class="rounded-lg overflow-hidden border border-gray-200 h-20">
          <img :src="editorSiloState.image_path" :alt="tHub('hub.ui.editor_sidebar.preview_alt', 'preview')" class="w-full h-full object-cover" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.image_alt', 'Alt image') }}</label>
          <input
            :value="editorSiloState.image_alt ?? ''"
            @input="updateSiloField('image_alt', ($event.target as HTMLInputElement).value)"
            type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.alt_image_ph', 'Chaussures de randonnée en cuir')" />
        </div>
      </fieldset>

      
      <fieldset class="border border-blue-200 rounded-xl p-3 space-y-2 bg-blue-50/30">
        <legend class="text-[10px] font-bold text-blue-500 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.ps_link', 'Liaison PS') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.slug_url', 'Slug URL') }}</label>
          <input
            :value="editorSiloState.slug ?? ''"
            @input="updateSiloField('slug', ($event.target as HTMLInputElement).value)"
            type="text" class="field !text-[11px]" placeholder="snack" />
          <p class="text-[9px] text-gray-400 mt-0.5">{{ tHub('hub.ui.editor_sidebar.last_url_segment', 'Dernier segment de l\'URL :') }} /…/<strong>{{ editorSiloState.slug || '…' }}</strong>/</p>
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.ps_category_id', 'ID Catégorie PS') }}</label>
          <div class="flex items-center gap-2">
            <input
              :value="editorSiloState.id_category ?? ''"
              @input="updateSiloField('id_category', ($event.target as HTMLInputElement).value)"
              type="number" class="field w-20" placeholder="ID" />
            <span v-if="editorSiloState.id_category" class="text-[9px] text-blue-600 font-medium">{{ tHub('hub.ui.editor_sidebar.cat_hash', 'Cat. #{id}', { id: editorSiloState.id_category }) }}</span>
            <span v-else class="text-[9px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.no_linked_category', 'Aucune catégorie liée') }}</span>
          </div>
          <p class="text-[9px] text-gray-400 mt-0.5">{{ tHub('hub.ui.editor_sidebar.products_source', 'Les produits affichés viennent de ps_category_product (PS natif).') }}</p>
        </div>
        
        <div v-if="editorSiloState.id_category">
          <button
            @click="syncSiloProducts"
            :disabled="siloSyncBusy"
            class="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold rounded-lg transition-colors"
            :class="siloSyncBusy ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'"
          >
            <svg v-if="!siloSyncBusy" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            {{ siloSyncBusy ? tHub('hub.ui.editor_sidebar.syncing', 'Synchronisation…') : tHub('hub.ui.editor_sidebar.sync_products', 'Synchroniser les produits') }}
          </button>
          <p v-if="siloSyncResult" class="text-[9px] mt-1 font-medium" :class="siloSyncResult.added > 0 ? 'text-green-600' : 'text-gray-500'">
            {{ siloSyncResult.added > 0 ? tHub('hub.ui.editor_sidebar.synced_added', '+{count} produits ajoutés', { count: siloSyncResult.added }) : tHub('hub.ui.editor_sidebar.already_up_to_date', 'Déjà à jour') }} ({{ tHub('hub.ui.editor_sidebar.synced_total', '{count} total', { count: siloSyncResult.after }) }})
          </p>
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.seo', 'SEO') }}</legend>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.seo_title', 'Title SEO') }}</label>
          <input
            :value="editorSiloState.meta_title ?? ''"
            @input="updateSiloField('meta_title', ($event.target as HTMLInputElement).value)"
            type="text" class="field" :placeholder="tHub('hub.ui.editor_sidebar.seo_title_ph', 'Chaussures de randonnée pour homme — Ma Boutique')" />
        </div>
        <div>
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.meta_description', 'Méta description') }}</label>
          <textarea
            :value="editorSiloState.meta_description ?? ''"
            @input="updateSiloField('meta_description', ($event.target as HTMLTextAreaElement).value)"
            rows="3" class="field resize-none" :placeholder="tHub('hub.ui.editor_sidebar.seo_desc_ph', 'Description SEO…')" />
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.rdv_card', 'Cartouche RDV') }}</legend>
        <p class="text-[9px] text-gray-400 leading-relaxed mb-1">
          {{ tHub('hub.ui.editor_sidebar.rdv_global_hint', 'Réglage global : s\'applique à toutes les pages catégorie & marque du tenant.') }}
        </p>
        
        <label class="flex items-center justify-between text-[11px] font-semibold text-gray-700 cursor-pointer">
          <span>{{ tHub('hub.ui.editor_sidebar.rdv_show', 'Afficher la cartouche') }}</span>
          <button
            type="button"
            @click="updateSiloRdvField('enabled', !editorSiloRdvState.enabled)"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            :class="editorSiloRdvState.enabled ? 'bg-primary-600' : 'bg-gray-300'"
          >
            <span
              class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
              :class="editorSiloRdvState.enabled ? 'translate-x-5' : 'translate-x-1'"
            />
          </button>
        </label>
        
        <label
          class="flex items-center justify-between text-[11px] font-semibold text-gray-700 cursor-pointer"
          :class="editorSiloRdvState.enabled ? '' : 'opacity-40 pointer-events-none'"
        >
          <span>{{ tHub('hub.ui.editor_sidebar.rdv_repeat', 'Répéter dans la grille') }}</span>
          <button
            type="button"
            @click="updateSiloRdvField('repeatEvery', editorSiloRdvState.repeatEvery > 0 ? 0 : 16)"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
            :class="editorSiloRdvState.repeatEvery > 0 ? 'bg-primary-600' : 'bg-gray-300'"
          >
            <span
              class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
              :class="editorSiloRdvState.repeatEvery > 0 ? 'translate-x-5' : 'translate-x-1'"
            />
          </button>
        </label>
        <p v-if="editorSiloRdvState.enabled && editorSiloRdvState.repeatEvery > 0" class="text-[9px] text-gray-400 -mt-1.5 pl-1">
          {{ tHub('hub.ui.editor_sidebar.rdv_repeat_every', 'Affichée tous les {count} produits (+ une en haut).', { count: editorSiloRdvState.repeatEvery }) }}
        </p>
        
        <div
          v-if="editorSiloRdvState.enabled && editorSiloRdvState.repeatEvery === 0"
          class="space-y-1.5"
        >
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.position', 'Position') }}</label>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              @click="updateSiloRdvField('position', 'top')"
              class="text-[11px] font-semibold py-1.5 rounded-lg border transition-colors"
              :class="editorSiloRdvState.position === 'top' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'"
            >{{ tHub('hub.ui.editor_sidebar.top', '↑ En haut') }}</button>
            <button
              type="button"
              @click="updateSiloRdvField('position', 'bottom')"
              class="text-[11px] font-semibold py-1.5 rounded-lg border transition-colors"
              :class="editorSiloRdvState.position === 'bottom' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'"
            >{{ tHub('hub.ui.editor_sidebar.bottom', '↓ En bas') }}</button>
          </div>
        </div>
        
        <div v-if="editorSiloRdvState.enabled" class="space-y-1">
          <label class="field-label">{{ tHub('hub.ui.editor_sidebar.cta_text', 'Texte du bouton (CTA)') }}</label>
          <EditorI18nField
            :model-value="editorSiloRdvState.ctaLabelByLang"
            :langs="tenantLangs"
            :placeholder="tHub('hub.ui.editor_sidebar.cta_text_ph', 'ex : Demander un devis')"
            @update:model-value="updateSiloRdvField('ctaLabelByLang', $event)"
          />
          <p class="text-[9px] text-gray-400 pl-1">{{ tHub('hub.ui.editor_sidebar.rdv_empty_hint', 'Vide = "Prendre RDV" (traduction par défaut).') }}</p>
        </div>
      </fieldset>

      
      <fieldset class="border border-gray-200 rounded-xl p-3 space-y-1.5">
        <legend class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.components', 'Composants') }}</legend>
        <p class="text-[9px] text-gray-400 leading-relaxed mb-1">
          {{ tHub('hub.ui.editor_sidebar.silo_components_hint', 'Activez/désactivez les sections de la page catégorie. Les sections conditionnelles (orange) nécessitent des données en DB.') }}
        </p>
        <div
          v-for="comp in SILO_COMPONENTS"
          :key="comp.id"
          class="flex items-center gap-2 p-2 rounded-lg border bg-white group transition-all"
          :class="isSiloSectionActive(comp.id) ? 'border-gray-200 hover:border-primary-300' : 'border-dashed border-gray-300 opacity-50'"
        >
          <span class="text-sm select-none">{{ comp.icon }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-semibold" :class="isSiloSectionActive(comp.id) ? 'text-gray-700' : 'text-gray-400'">{{ comp.label }}</p>
            <p class="text-[9px] text-gray-400 truncate">{{ comp.desc }}</p>
          </div>
          <span
            v-if="comp.conditional"
            class="text-amber-400"
            :title="tHub('hub.ui.editor_sidebar.conditional_required', 'Conditionnel (données requises)')"
          >
            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5" /></svg>
          </span>
          <button
            @click.stop="toggleSiloSection(comp.id)"
            class="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
            :class="isSiloSectionActive(comp.id) ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'"
            :title="isSiloSectionActive(comp.id) ? tHub('hub.ui.editor_sidebar.deactivate', 'Désactiver') : tHub('hub.ui.editor_sidebar.activate', 'Activer')"
          >
            <svg v-if="isSiloSectionActive(comp.id)" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </button>
        </div>
      </fieldset>

      <p v-if="siloFieldsDirty" class="text-[10px] font-medium text-amber-600 italic text-center">{{ tHub('hub.ui.editor_sidebar.modified_save_below', 'Modifié — Enregistrer en bas ↓') }}</p>
    </div>

    
    <div v-else-if="activePanel === 'homepage:visibility'" class="flex-1 overflow-auto p-4 space-y-4">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-800 pb-3 mb-3 border-b border-slate-200">
        {{ tHub('hub.ui.editor_sidebar.conditional_display_title', '👁️ Affichage conditionnel') }}
        <span class="text-xs font-normal text-violet-600">— {{ sectionMeta(visibilityEditType!).label }}</span>
      </h3>

      <p class="text-[10px] text-gray-500 leading-relaxed">
        {{ tHub('hub.ui.editor_sidebar.visibility_intro', 'Contrôlez quels types de visiteurs voient cette section. L\'IA classe chaque visiteur automatiquement.') }}
      </p>

      
      <fieldset class="border border-violet-200 rounded-xl p-3 space-y-2 bg-violet-50/30">
        <legend class="text-[10px] font-bold text-violet-500 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.mode', 'Mode') }}</legend>
        <div class="flex gap-2">
          <button
            v-for="m in [{ value: 'show', label: tHub('hub.ui.editor_sidebar.visible_for', 'Visible pour'), desc: tHub('hub.ui.editor_sidebar.only_these_avatars', 'Uniquement ces avatars') }, { value: 'hide', label: tHub('hub.ui.editor_sidebar.hidden_for', 'Caché pour'), desc: tHub('hub.ui.editor_sidebar.all_but_avatars', 'Tous sauf ces avatars') }]"
            :key="m.value"
            @click="visibilityRule.mode = m.value as 'show' | 'hide'"
            :class="[
              'flex-1 p-2 rounded-lg border text-xs font-medium transition-all',
              visibilityRule.mode === m.value
                ? 'bg-violet-600 text-white border-violet-600'
                : 'border-gray-200 text-gray-600 hover:border-violet-300',
            ]"
          >
            <div class="font-semibold">{{ m.label }}</div>
            <div class="text-[9px] opacity-70">{{ m.desc }}</div>
          </button>
        </div>
      </fieldset>

      
      <fieldset class="border border-violet-200 rounded-xl p-3 space-y-2">
        <legend class="text-[10px] font-bold text-violet-500 uppercase tracking-wider px-1">{{ tHub('hub.ui.editor_sidebar.avatars', 'Avatars') }}</legend>
        <p class="text-[10px] text-gray-400">{{ tHub('hub.ui.editor_sidebar.avatars_empty_hint', 'Vide = tout le monde voit la section') }}</p>
        <label
          v-for="avatarType in AC_HUB_AVATARS"
          :key="avatarType"
          class="flex items-center gap-2.5 cursor-pointer py-1 select-none"
        >
          <input
            type="checkbox"
            :checked="visibilityRule.avatars.includes(avatarType)"
            @change="toggleAvatarInRule(avatarType)"
            class="rounded border-gray-300 text-violet-600 focus:ring-violet-400"
          />
          <span class="text-base leading-none">{{ AVATAR_META[avatarType].icon }}</span>
          <span class="text-xs text-gray-700">{{ AVATAR_META[avatarType].label }}</span>
        </label>
      </fieldset>

      
      <div v-if="visibilityRule.avatars.length > 0" class="text-[10px] text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
        {{ formatVisibilityLabel(visibilityRule) }}
      </div>
      <div v-else class="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        {{ tHub('hub.ui.editor_sidebar.everyone_sees', 'Tout le monde voit cette section') }}
      </div>

      
      <div class="flex gap-2">
        <button
          @click="saveVisibilityRule"
          class="flex-1 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors"
        >
          {{ tHub('hub.ui.editor_sidebar.apply', 'Appliquer') }}
        </button>
        <button
          @click="clearVisibilityRule"
          class="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl transition-colors"
        >
          {{ tHub('hub.ui.editor_sidebar.clear', 'Effacer') }}
        </button>
      </div>
    </div>

    
    <div class="p-4 border-t border-gray-100 shrink-0 bg-gray-50">
      <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
        <p v-if="saveStatus === 'ok' && !saveErrors.length" class="text-xs text-green-600 font-medium mb-2 text-center">{{ tHub('hub.ui.editor_sidebar.saved_ok', '✓ Sauvegardé !') }}</p>
        <p v-else-if="saveStatus === 'error' && !saveErrors.length" class="text-xs text-red-500 font-medium mb-2 text-center">{{ tHub('hub.ui.editor_sidebar.save_error', '✗ Erreur de sauvegarde') }}</p>
      </Transition>
      
      <div v-if="saveErrors.length" class="mb-2 p-2 rounded-lg bg-red-50 border border-red-200">
        <p class="text-[11px] font-bold text-red-700 mb-1">{{ tHub('hub.ui.editor_sidebar.not_saved', '✗ Non enregistré') }}</p>
        <p v-for="(e, i) in saveErrors" :key="i" class="text-[11px] text-red-600 leading-snug">{{ e }}</p>
      </div>
      <button
        @click="saveAll"
        :disabled="globalSaving || !globalDirty"
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg v-if="globalSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <template v-if="globalSaving">{{ tHub('hub.ui.editor_sidebar.saving', 'Enregistrement…') }}</template>
        <template v-else-if="globalDirty">{{ tHub('hub.ui.editor_sidebar.save', 'Enregistrer') }}<span v-if="globalDirtyCount > 1" class="ml-1 px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-bold">{{ tHub('hub.ui.editor_sidebar.domains_count', '{count} domaines', { count: globalDirtyCount }) }}</span></template>
        <template v-else>{{ tHub('hub.ui.editor_sidebar.up_to_date', 'À jour') }}</template>
      </button>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { SECTION_META, FEATURE_ICONS, useEditorState, useDbHomepageSections, useDbPageSections, useDbFooterColumns, useEditorSilo, useEditorSiloSections } from '~/composables/useEditorState'
import type { SectionType, DbHomepageSection, DbFooterColumn, DbFooterLink, EditorSiloData } from '~/composables/useEditorState'
import { AVATAR_META, AC_HUB_AVATARS, formatVisibilityLabel, DEFAULT_VISIBILITY_RULE } from '~/utils/avatar'
import { panneauDouvertureDeLaPage } from '~/utils/builder-auto-panneau-sections'
import { estLaPageDAccueil } from '~/utils/builder-perimetre-homepage'
import { getAllLocales } from '~/utils/i18n-root-locale'
import type { SectionVisibilityRule, AvatarType } from '~/types/avatar'
import type { ClientLang } from '~/server/api/client-langs.get'

const {
  homepage: hp, sections, activePanel,
  theme: editorTheme, header: editorHeader, footer: editorFooter,
  isDirty, isSaving, saveStatus,
  moveSection, updateSectionVisibility, updateHero,
  addFeature, removeFeature, updateFeature,
  addCategory, removeCategory, updateCategory,
  addTestimonial, removeTestimonial, updateTestimonial,
  updateAbout, updateBlog, updateFaq,
  markDirty,
  updateThemeColor, updateThemeTypography, updateThemeUI,
  updateHeader,
  updateFooter, updateFooterContact, updateFooterBottomBar, updateFooterSocial,
  saveConfig,
} = useEditorState()

const { contextPageId, contextPayload } = useEditorContext()
const { toggleEditMode } = useEditMode()
const { resolvedClientId } = useClientDetection()
const { t: i18nt } = useI18nField()
const { t: tHub } = useHubT()
const route = useRoute()

const surLAccueil = computed(() =>
  estLaPageDAccueil(route.path, getAllLocales(useRuntimeConfig().public as any)),
)

import {
  useBuilderGeometry,
  BUILDER_WIDTH_KEY, BUILDER_COLLAPSED_KEY,
  BUILDER_WIDTH_MIN, BUILDER_WIDTH_MAX,
} from '~/composables/useBuilderGeometry'
const {
  builderWidth, builderCollapsed,
} = useBuilderGeometry()
const isResizing = ref<boolean>(false)
let resizeStartX = 0
let resizeStartWidth = 0

function clampWidth(w: number): number {
  return Math.max(BUILDER_WIDTH_MIN, Math.min(BUILDER_WIDTH_MAX, Math.round(w)))
}

function loadBuilderGeometry() {
  if (!import.meta.client) return
  try {
    const w = Number(localStorage.getItem(BUILDER_WIDTH_KEY))
    if (w >= BUILDER_WIDTH_MIN && w <= BUILDER_WIDTH_MAX) builderWidth.value = w
    builderCollapsed.value = localStorage.getItem(BUILDER_COLLAPSED_KEY) === '1'
  } catch {  }
}
function saveBuilderWidth() {
  if (!import.meta.client) return
  try { localStorage.setItem(BUILDER_WIDTH_KEY, String(builderWidth.value)) } catch {  }
}
function toggleBuilderCollapsed() {
  builderCollapsed.value = !builderCollapsed.value
  if (import.meta.client) {
    try { localStorage.setItem(BUILDER_COLLAPSED_KEY, builderCollapsed.value ? '1' : '0') } catch {  }
  }
}

function onResizeStart(e: MouseEvent) {
  if (builderCollapsed.value) return
  e.preventDefault()
  isResizing.value = true
  resizeStartX = e.clientX
  resizeStartWidth = builderWidth.value
  if (typeof document !== 'undefined') {
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd, { once: true })
  }
}
function onResizeMove(e: MouseEvent) {
  if (!isResizing.value) return
  const delta = e.clientX - resizeStartX
  builderWidth.value = clampWidth(resizeStartWidth + delta)
}
function onResizeEnd() {
  if (!isResizing.value) return
  isResizing.value = false
  if (typeof document !== 'undefined') {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onResizeMove)
  }
  saveBuilderWidth()
}

if (import.meta.client) {
  loadBuilderGeometry()
}

const { loadIntoBuilder: loadMegamenu, setBuilderItems: setMegamenuItems, syncToDb: syncMegamenuToDb, builderOverride: megamenuBuilderItems, dirty: megamenuDirty } = useMegamenu()

const {
  loadIntoBuilder: loadThemeDb,
  updateColor: updateThemeColorDb,
  updateTypography: updateTypographyDb,
  updateUi: updateUiDb,
  syncToDb: syncThemeToDb,
  builderTheme: themeBuilderState,
  dirty: themeDbDirty,
} = useThemeDb()
const themeDbLoaded = ref(false)

const {
  loadIntoBuilder: loadFooterDb,
  updateFooterField: updateFooterFieldDb,
  updateContact: updateContactDb,
  updateBottomBar: updateBottomBarDb,
  updateNewsletter: updateNewsletterDb,
  setSocial: setSocialDb,
  syncToDb: syncFooterToDb,
  builderFooter: footerBuilderState,
  dirty: footerDbDirty,
} = useFooterDb()
const footerDbLoaded = ref(false)

const {
  loadIntoBuilder: loadHeaderDb,
  updateLogo: updateLogoDb,
  updateTopBar: updateTopBarDb,
  updateFeatures: updateFeaturesDb,
  updateContactEmail: updateContactEmailDb,
  syncToDb: syncHeaderToDb,
  builderHeader: headerBuilderState,
  dirty: headerDbDirty,
} = useHeaderDb()
const headerDbLoaded = ref(false)

const {
  loadIntoBuilder: loadHomepageDb,
  updateHero: updateHeroDb,
  updateAbout: updateAboutDb,
  updateBlog: updateBlogDb,
  updateFaq: updateFaqDb,
  setFeatures: setFeaturesDb,
  setCategories: setCategoriesDb,
  setTestimonials: setTestimonialsDb,
  setSections: setSectionsDb,
  syncToDb: syncHomepageToDb,
  builderHomepage: hpBuilderState,
  builderSections: sectionsBuilderState,
  dirty: homepageDbDirty,
} = useHomepageDb()
const homepageDbLoaded = ref(false)

const tenantLangs = ref<ClientLang[]>([{ id_lang: 1, iso_code: 'fr', name: 'Français', is_default: true }])

onMounted(async () => {
  try {
    const res = await $fetch<{ langs: ClientLang[] }>('/api/client-langs')
    if (res?.langs?.length) tenantLangs.value = res.langs
  } catch {
    
  }
  
  loadMegamenu()
  megamenuLoaded.value = true
  
  loadThemeDb()
  themeDbLoaded.value = true
  
  loadHeaderDb()
  headerDbLoaded.value = true
  
  loadFooterDb()
  footerDbLoaded.value = true
  
  loadHomepageDb()
  homepageDbLoaded.value = true
})

const saveErrors = ref<string[]>([])
function noteSaveError(domain: string, err: any) {
  const detail = err?.data?.message || err?.statusMessage || err?.message || ''
  console.error(`[builder] Erreur sauvegarde ${domain} :`, err)
  saveErrors.value = [...saveErrors.value, detail ? `${domain} — ${detail}` : domain]
}

async function saveAll() {
  saveErrors.value = []
  
  
  
  
  
  await Promise.all([
    
    
    
    
    isDirty.value ? saveConfig() : Promise.resolve(),
    megamenuDirty.value ? syncMegamenuToDb() : Promise.resolve(),
    themeDbDirty.value ? syncThemeToDb() : Promise.resolve(),
    headerDbDirty.value ? syncHeaderToDb() : Promise.resolve(),
    footerDbDirty.value ? syncFooterToDb() : Promise.resolve(),
    
    
    
    
    (homepageDbDirty.value && !isDbSections.value) ? syncHomepageToDb() : Promise.resolve(),
    dbSectionsDirty.value ? saveDbSections() : Promise.resolve(),
    pageSectionsDirty.value ? savePageSections() : Promise.resolve(),
    sectionPayloadDirty.value ? saveSectionPayload() : Promise.resolve(),
    pfSectionsDirty.value ? savePfSections() : Promise.resolve(),
    pfPayloadDirty.value ? savePfSectionPayload() : Promise.resolve(),
    siloFieldsDirty.value ? saveSiloFields() : Promise.resolve(),
    footerColumnsDirty.value ? saveFooterColumns() : Promise.resolve(),
  ])
}

const globalDirty = computed(() =>
  isDirty.value
  || dbSectionsDirty.value
  || pageSectionsDirty.value
  || sectionPayloadDirty.value
  || pfSectionsDirty.value
  || pfPayloadDirty.value
  || siloFieldsDirty.value
  || footerColumnsDirty.value
  
  
  || megamenuDirty.value
  || headerDbDirty.value
  || themeDbDirty.value
  || footerDbDirty.value
  || homepageDbDirty.value,
)
const globalDirtyCount = computed(() => {
  let n = 0
  if (isDirty.value) n++
  if (dbSectionsDirty.value) n++
  if (pageSectionsDirty.value) n++
  if (sectionPayloadDirty.value) n++
  if (pfSectionsDirty.value) n++
  if (pfPayloadDirty.value) n++
  if (siloFieldsDirty.value) n++
  if (footerColumnsDirty.value) n++
  if (megamenuDirty.value) n++
  if (headerDbDirty.value) n++
  if (themeDbDirty.value) n++
  if (footerDbDirty.value) n++
  if (homepageDbDirty.value) n++
  return n
})
const globalSaving = computed(() =>
  isSaving.value
  || dbSectionsSaving.value
  || pageSectionsSaving.value
  || sectionPayloadSaving.value
  || pfSectionsSaving.value
  || pfPayloadSaving.value
  || siloFieldsSaving.value
  || footerColumnsSaving.value,
)

const _pubDbFlags = useRuntimeConfig().public
const isDbSections = computed(() => resolveDbContentFlags(_pubDbFlags as any).dbHomepageSections)

function sectionMeta(type: string): { label: string; icon: string } {
  return SECTION_META[type] ?? { label: type, icon: '📦' }
}

const dbSectionsList = useDbHomepageSections()
const dbSectionsLoading = ref(false)
const dbSectionsDirty = ref(false)
const dbSectionsSaving = ref(false)
const dbSectionsOriginal = ref<string>('')

async function loadDbSections() {
  if (!isDbSections.value) return
  
  
  if (!surLAccueil.value) return
  dbSectionsLoading.value = true
  try {
    const res = await $fetch<{ sections: DbHomepageSection[] }>('/api/homepage-sections?all=1')
    dbSectionsList.value = res.sections ?? []
    dbSectionsOriginal.value = JSON.stringify(dbSectionsList.value)
    dbSectionsDirty.value = false
  } catch {
    dbSectionsList.value = []
  } finally {
    dbSectionsLoading.value = false
  }
}

function markDbDirty() {
  dbSectionsDirty.value = JSON.stringify(dbSectionsList.value) !== dbSectionsOriginal.value
}

function moveDbSection(from: number, to: number) {
  const arr = [...dbSectionsList.value]
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  
  arr.forEach((s, i) => { s.position = (i + 1) * 10 })
  dbSectionsList.value = arr
  markDbDirty()
}

function onDbDrop(toIndex: number) {
  if (dragFrom.value !== null && dragFrom.value !== toIndex) {
    moveDbSection(dragFrom.value, toIndex)
  }
  dragFrom.value = null
  dragOver.value = null
}

function toggleDbSection(index: number) {
  const s = dbSectionsList.value[index]
  if (!s) return
  s.active = !s.active
  markDbDirty()
}

async function saveDbSections() {
  dbSectionsSaving.value = true
  try {
    await $fetch('/api/homepage-sections', {
      method: 'POST',
      body: {
        sections: dbSectionsList.value.map(s => ({
          id: s.id,
          position: s.position,
          active: s.active,
        })),
      },
    })
    dbSectionsOriginal.value = JSON.stringify(dbSectionsList.value)
    dbSectionsDirty.value = false
  } catch (err) {
    noteSaveError(tHub('hub.ui.editor_sidebar.err_domain_homepage', 'Sections de la page d\'accueil'), err)
  } finally {
    dbSectionsSaving.value = false
  }
}

onMounted(() => {
  if (isDbSections.value) loadDbSections()
})

const pageSectionsLoading = ref(false)
const pageSectionsSaving = ref(false)
const pageSectionsDirty = ref(false)
const pageSectionsOriginal = ref<string>('')

const pageParentType = computed(() => {
  if (contextPageId.value === 'cms') return 'cms'
  if (contextPageId.value === 'silo') return 'category'
  
  
  if (contextPageId.value === 'product') return 'product'
  
  if (contextPageId.value === 'cart') return 'cart'
  if (contextPageId.value === 'checkout') return 'checkout'
  return ''
})
const pageParentId = computed(() => {
  if (contextPageId.value === 'cms') return Number(contextPayload.value?.idCms) || 0
  if (contextPageId.value === 'silo') return Number(contextPayload.value?.id_silo) || 0
  return 0
})

const pageParentSingleton = computed(() => (
  ['product', 'cart', 'checkout'].includes(pageParentType.value)
))

const pageParentOrdreFige = computed(() => (
  ['cart', 'checkout'].includes(pageParentType.value)
))
const pageParentResolu = computed(() => (
  Boolean(pageParentType.value) && (pageParentId.value > 0 || pageParentSingleton.value)
))
const pageSectionsList = computed(() => (
  pageParentResolu.value
    ? useDbPageSections(pageParentType.value, pageParentId.value).value
    : []
))

async function loadPageSections(parentType: string, parentId: number) {
  
  if (!parentType || (!parentId && !['product', 'cart', 'checkout'].includes(parentType))) return
  pageSectionsLoading.value = true
  try {
    const res = await $fetch<{ sections: DbHomepageSection[] }>('/api/page-sections', {
      query: { parent_type: parentType, parent_id: parentId, all: 1 },
    })
    useDbPageSections(parentType, parentId).value = res.sections ?? []
  } catch {
    useDbPageSections(parentType, parentId).value = []
  } finally {
    pageSectionsOriginal.value = JSON.stringify(pageSectionsList.value)
    pageSectionsDirty.value = false
    pageSectionsLoading.value = false
  }
}

watch(() => `${pageParentType.value}:${pageParentId.value}`, () => {
  if (pageParentResolu.value) {
    loadPageSections(pageParentType.value, pageParentId.value)
  }
}, { immediate: true })

function markPageSectionsDirty() {
  pageSectionsDirty.value = JSON.stringify(pageSectionsList.value) !== pageSectionsOriginal.value
}

function movePageSection(from: number, to: number) {
  const arr = [...pageSectionsList.value]
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  arr.forEach((s, i) => { s.position = (i + 1) * 10 })
  useDbPageSections(pageParentType.value, pageParentId.value).value = arr
  markPageSectionsDirty()
}

const pageDragFrom = ref<number | null>(null)
const pageDragOver = ref<number | null>(null)
function onPageDragStart(index: number) { pageDragFrom.value = index }
function onPageDragOver(index: number)  { pageDragOver.value = index }
function onPageDrop(toIndex: number) {
  if (pageDragFrom.value !== null && pageDragFrom.value !== toIndex) {
    movePageSection(pageDragFrom.value, toIndex)
  }
  pageDragFrom.value = null
  pageDragOver.value = null
}

function togglePageSection(index: number) {
  const s = pageSectionsList.value[index]
  if (!s) return
  s.active = !s.active
  markPageSectionsDirty()
}

async function savePageSections() {
  
  
  if (!pageParentType.value || !pageParentId.value) return
  pageSectionsSaving.value = true
  try {
    await $fetch('/api/page-sections', {
      method: 'POST',
      body: {
        parent_type: pageParentType.value,
        parent_id: pageParentId.value,
        sections: pageSectionsList.value.map(s => ({
          id: s.id,
          position: s.position,
          active: s.active,
        })),
      },
    })
    pageSectionsOriginal.value = JSON.stringify(pageSectionsList.value)
    pageSectionsDirty.value = false
  } catch (err) {
    noteSaveError(tHub('hub.ui.editor_sidebar.page_sections', 'Sections de la page'), err)
  } finally {
    pageSectionsSaving.value = false
  }
}

interface HomepageVariantRow {
  id_variant: number
  code: string
  label: string
  status: 'draft' | 'live' | 'archived'
  serving_strategy: string
  weight: number
  rules: Record<string, any>
  active: number
  date_add: string
  date_upd: string
}

const variantsList = ref<HomepageVariantRow[]>([])
const variantsLoading = ref(false)
const variantsError = ref('')
const confirmingLiveCode = ref<string | null>(null)
const settingLive = ref(false)

async function loadVariants() {
  variantsLoading.value = true
  try {
    const res = await $fetch<{ variants: HomepageVariantRow[] }>('/api/homepage-variants?all=1')
    variantsList.value = res.variants ?? []
  } catch (err) {
    console.error('[builder] Erreur chargement variantes homepage :', err)
    variantsList.value = []
  } finally {
    variantsLoading.value = false
  }
}

async function setVariantLive(code: string) {
  settingLive.value = true
  variantsError.value = ''
  try {
    await $fetch('/api/homepage-variants/set-live', { method: 'PUT', body: { code } })
    confirmingLiveCode.value = null
    await loadVariants()
  } catch (err: any) {
    console.error('[builder] Erreur mise en ligne variante homepage :', err)
    variantsError.value = err?.data?.message || tHub('hub.ui.editor_sidebar.err_go_live', 'Erreur lors de la mise en ligne')
  } finally {
    settingLive.value = false
  }
}

const showNewVariantForm = ref(false)
const newVariantCode = ref('')
const newVariantLabel = ref('')
const creatingVariant = ref(false)
const createVariantError = ref('')

async function createVariant() {
  createVariantError.value = ''
  const code = newVariantCode.value.trim()
  const label = newVariantLabel.value.trim()
  if (!code || !label) {
    createVariantError.value = tHub('hub.ui.editor_sidebar.err_code_label_required', 'Code et libellé requis.')
    return
  }
  creatingVariant.value = true
  try {
    await $fetch('/api/homepage-variants', {
      method: 'POST',
      body: { code, label, serving_strategy: 'default' },
    })
    newVariantCode.value = ''
    newVariantLabel.value = ''
    showNewVariantForm.value = false
    await loadVariants()
  } catch (err: any) {
    console.error('[builder] Erreur création variante homepage :', err)
    createVariantError.value = err?.data?.message
      || (err?.statusCode === 409 || err?.response?.status === 409
        ? tHub('hub.ui.editor_sidebar.err_code_in_use', 'Ce code est déjà utilisé par une autre variante.')
        : tHub('hub.ui.editor_sidebar.err_create_variant', 'Erreur lors de la création de la variante.'))
  } finally {
    creatingVariant.value = false
  }
}

const editingVariantCode = ref<string | null>(null)
const editingVariantStrategy = ref<'default' | 'rule'>('default')
const editingVariantWeight = ref<number>(100)
const editingVariantDateFrom = ref('')
const editingVariantDateTo = ref('')
const editingVariantDevice = ref<'' | 'mobile' | 'desktop'>('')
const editingVariantUtmSource = ref('')
const editingVariantUtmMedium = ref('')
const editingVariantUtmCampaign = ref('')
const editingVariantReferrer = ref('')
const editingVariantGeo = ref('')
const variantEditSaving = ref(false)
const variantEditError = ref('')

const editingVariant = computed(() =>
  variantsList.value.find(v => v.code === editingVariantCode.value) ?? null,
)

function openVariantEditor(code: string) {
  const variant = variantsList.value.find(v => v.code === code)
  if (!variant) return
  editingVariantCode.value = code
  editingVariantStrategy.value = variant.serving_strategy === 'rule' ? 'rule' : 'default'
  editingVariantWeight.value = Number.isFinite(variant.weight) ? variant.weight : 100
  const rules = variant.rules && typeof variant.rules === 'object' ? variant.rules : {}
  editingVariantDateFrom.value = typeof rules.date_from === 'string' ? rules.date_from : ''
  editingVariantDateTo.value = typeof rules.date_to === 'string' ? rules.date_to : ''
  editingVariantDevice.value = rules.device === 'mobile' || rules.device === 'desktop' ? rules.device : ''
  editingVariantUtmSource.value = rules.utm?.source ?? ''
  editingVariantUtmMedium.value = rules.utm?.medium ?? ''
  editingVariantUtmCampaign.value = rules.utm?.campaign ?? ''
  editingVariantReferrer.value = typeof rules.referrer_contains === 'string' ? rules.referrer_contains : ''
  editingVariantGeo.value = Array.isArray(rules.geo_country)
    ? rules.geo_country.join(', ')
    : (typeof rules.geo_country === 'string' ? rules.geo_country : '')
  variantEditError.value = ''
  activePanel.value = 'variant-edit'
}

function buildVariantRules(): Record<string, any> {
  const rules: Record<string, any> = {}
  if (editingVariantDateFrom.value) rules.date_from = editingVariantDateFrom.value
  if (editingVariantDateTo.value) rules.date_to = editingVariantDateTo.value
  if (editingVariantDevice.value) rules.device = editingVariantDevice.value

  const utm: Record<string, string> = {}
  if (editingVariantUtmSource.value.trim()) utm.source = editingVariantUtmSource.value.trim()
  if (editingVariantUtmMedium.value.trim()) utm.medium = editingVariantUtmMedium.value.trim()
  if (editingVariantUtmCampaign.value.trim()) utm.campaign = editingVariantUtmCampaign.value.trim()
  if (Object.keys(utm).length) rules.utm = utm

  if (editingVariantReferrer.value.trim()) rules.referrer_contains = editingVariantReferrer.value.trim()

  const geoList = editingVariantGeo.value
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
  if (geoList.length) rules.geo_country = geoList

  return rules
}

async function saveVariantEdit() {
  if (!editingVariantCode.value) return
  variantEditError.value = ''
  variantEditSaving.value = true
  try {
    
    
    const rules = editingVariantStrategy.value === 'rule' ? buildVariantRules() : {}
    await $fetch(`/api/homepage-variants/${editingVariantCode.value}`, {
      method: 'PUT',
      body: {
        serving_strategy: editingVariantStrategy.value,
        weight: Number(editingVariantWeight.value) || 100,
        rules,
      },
    })
    await loadVariants()
    activePanel.value = null
    editingVariantCode.value = null
  } catch (err: any) {
    console.error('[builder] Erreur sauvegarde règles variante homepage :', err)
    variantEditError.value = err?.data?.message || tHub('hub.ui.editor_sidebar.err_save_rules', 'Erreur lors de l\'enregistrement des règles.')
  } finally {
    variantEditSaving.value = false
  }
}

onMounted(() => {
  loadVariants()
})

const editingSectionId = ref<number | null>(null)
const sectionPayloadDirty = ref(false)
const sectionPayloadSaving = ref(false)
const sectionPayloadOriginal = ref<string>('')

function findSectionById(sectionId: number | null): DbHomepageSection | null {
  if (sectionId == null) return null
  return dbSectionsList.value.find(s => s.id === sectionId)
    ?? pageSectionsList.value.find(s => s.id === sectionId)
    ?? null
}

const editingSection = computed(() => findSectionById(editingSectionId.value))

function openSectionEditor(sectionId: number) {
  editingSectionId.value = sectionId
  const section = findSectionById(sectionId)
  if (section) {
    sectionPayloadOriginal.value = JSON.stringify({
      title: section.title,
      subtitle: section.subtitle,
      payload: section.payload,
    })
  }
  sectionPayloadDirty.value = false
  activePanel.value = 'section-edit'
}

function markSectionPayloadDirty() {
  if (!editingSection.value) return
  const current = JSON.stringify({
    title: editingSection.value.title,
    subtitle: editingSection.value.subtitle,
    payload: editingSection.value.payload,
  })
  sectionPayloadDirty.value = current !== sectionPayloadOriginal.value
}

function parseSectionI18n(value: string | Record<string, string> | null | undefined): any {
  if (!value) return null
  if (typeof value === 'object') return value  
  
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'object' && parsed !== null) return parsed
  } catch {  }
  return value
}

function updateEditingSectionTitle(value: any) {
  if (!editingSection.value) return
  
  
  editingSection.value.title = value
  markSectionPayloadDirty()
}

function updateEditingSectionSubtitle(value: any) {
  if (!editingSection.value) return
  editingSection.value.subtitle = value
  markSectionPayloadDirty()
}

function updateEditingSectionPayload(payload: any) {
  if (!editingSection.value) return
  editingSection.value.payload = payload
  markSectionPayloadDirty()
}

async function saveSectionPayload() {
  if (!editingSection.value || !sectionPayloadDirty.value) return
  sectionPayloadSaving.value = true
  try {
    const section = editingSection.value
    
    
    await $fetch(`/api/homepage-sections/${section.id}`, {
      method: 'PUT',
      body: {
        title: section.title,
        subtitle: section.subtitle,
        payload: section.payload,
      },
    })
    sectionPayloadOriginal.value = JSON.stringify({
      title: section.title,
      subtitle: section.subtitle,
      payload: section.payload,
    })
    sectionPayloadDirty.value = false
  } catch (err) {
    noteSaveError(tHub('hub.ui.editor_sidebar.err_domain_section_content', 'Contenu de la section « {type} »', { type: editingSection.value?.type ?? '' }), err)
  } finally {
    sectionPayloadSaving.value = false
  }
}

function toggleDbSectionFromLibrary(sectionId: number) {
  const index = dbSectionsList.value.findIndex(s => s.id === sectionId)
  if (index >= 0) toggleDbSection(index)
}

function sectionTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'hero-slider':      tHub('hub.ui.editor_sidebar.desc_hero_slider', 'Carousel d\'images avec texte et boutons'),
    'features':         tHub('hub.ui.editor_sidebar.desc_features', 'Bandeau d\'atouts (livraison, qualité, etc.)'),
    'categories':       tHub('hub.ui.editor_sidebar.desc_categories', 'Grille de catégories avec pictos'),
    'promotions':       tHub('hub.ui.editor_sidebar.desc_promotions', 'Grille de produits en promotion'),
    'new-products':     tHub('hub.ui.editor_sidebar.desc_new_products', 'Nouveaux produits du catalogue'),
    'narrative-blocks': tHub('hub.ui.editor_sidebar.desc_narrative', 'Blocs storytelling (sourcing, livraison, etc.)'),
    'media-rows':       tHub('hub.ui.editor_sidebar.desc_media_rows', 'Bandes image/texte pleine largeur, côté réglable par bloc'),
    'bestsellers':      tHub('hub.ui.editor_sidebar.desc_bestsellers', 'Meilleures ventes du catalogue'),
    'instagram':        tHub('hub.ui.editor_sidebar.desc_instagram', 'Bandeau Instagram / réseaux sociaux'),
    'hero-cta':         tHub('hub.ui.editor_sidebar.desc_hero_cta', 'Hero éditorial pleine largeur + kicker + boutons'),
    'text-band':        tHub('hub.ui.editor_sidebar.desc_text_band', 'Bande titre/paragraphe pleine largeur (navy/crème/or)'),
    'spec-strip':       tHub('hub.ui.editor_sidebar.desc_spec_strip', 'Rangée de caractéristiques / garanties / matériaux'),
    'steps':            tHub('hub.ui.editor_sidebar.desc_steps', 'Process numéroté (01, 02, 03…)'),
    'offers-grid':      tHub('hub.ui.editor_sidebar.desc_offers_grid', 'Cartes d\'offres : photo, titre en overlay, texte + bouton'),
  }
  return descriptions[type] ?? tHub('hub.ui.editor_sidebar.desc_default', 'Composant personnalisable')
}

import { useDbPrefooterSections } from '~/composables/useEditorState'

const pfSectionsList = useDbPrefooterSections()
const pfSectionsLoading = ref(false)
const pfSectionsDirty = ref(false)
const pfSectionsSaving = ref(false)
const pfSectionsOriginal = ref<string>('')

const editingPfSectionId = ref<number | null>(null)
const pfPayloadDirty = ref(false)
const pfPayloadSaving = ref(false)
const pfPayloadOriginal = ref<string>('')

const editingPfSection = computed(() =>
  pfSectionsList.value.find(s => s.id === editingPfSectionId.value) ?? null,
)

async function loadPfSections() {
  if (!isDbSections.value) return
  pfSectionsLoading.value = true
  try {
    const res = await $fetch<{ sections: DbHomepageSection[] }>('/api/prefooter-sections?all=1')
    pfSectionsList.value = res.sections ?? []
    pfSectionsOriginal.value = JSON.stringify(pfSectionsList.value)
    pfSectionsDirty.value = false
  } catch {
    pfSectionsList.value = []
  } finally {
    pfSectionsLoading.value = false
  }
}

function markPfDirty() {
  pfSectionsDirty.value = JSON.stringify(pfSectionsList.value) !== pfSectionsOriginal.value
}

function togglePfSection(index: number) {
  const s = pfSectionsList.value[index]
  if (!s) return
  s.active = !s.active
  markPfDirty()
}

function togglePfSectionFromLibrary(sectionId: number) {
  const index = pfSectionsList.value.findIndex(s => s.id === sectionId)
  if (index >= 0) togglePfSection(index)
}

async function savePfSections() {
  pfSectionsSaving.value = true
  try {
    await $fetch('/api/prefooter-sections', {
      method: 'POST',
      body: {
        sections: pfSectionsList.value.map(s => ({
          id: s.id,
          position: s.position,
          active: s.active,
        })),
      },
    })
    pfSectionsOriginal.value = JSON.stringify(pfSectionsList.value)
    pfSectionsDirty.value = false
  } catch (err) {
    noteSaveError(tHub('hub.ui.editor_sidebar.err_domain_prefooter', 'Sections du pré-footer'), err)
  } finally {
    pfSectionsSaving.value = false
  }
}

function openPfSectionEditor(sectionId: number) {
  editingPfSectionId.value = sectionId
  const section = pfSectionsList.value.find(s => s.id === sectionId)
  if (section) {
    pfPayloadOriginal.value = JSON.stringify({
      title: section.title,
      subtitle: section.subtitle,
      payload: section.payload,
    })
  }
  pfPayloadDirty.value = false
  activePanel.value = 'prefooter-edit'
}

function markPfPayloadDirty() {
  if (!editingPfSection.value) return
  const current = JSON.stringify({
    title: editingPfSection.value.title,
    subtitle: editingPfSection.value.subtitle,
    payload: editingPfSection.value.payload,
  })
  pfPayloadDirty.value = current !== pfPayloadOriginal.value
}

function updatePfSectionTitle(value: any) {
  if (!editingPfSection.value) return
  editingPfSection.value.title = value
  markPfPayloadDirty()
}

function updatePfSectionSubtitle(value: any) {
  if (!editingPfSection.value) return
  editingPfSection.value.subtitle = value
  markPfPayloadDirty()
}

function updatePfSectionPayload(payload: any) {
  if (!editingPfSection.value) return
  editingPfSection.value.payload = payload
  markPfPayloadDirty()
}

async function savePfSectionPayload() {
  if (!editingPfSection.value || !pfPayloadDirty.value) return
  pfPayloadSaving.value = true
  try {
    const section = editingPfSection.value
    await $fetch(`/api/prefooter-sections/${section.id}`, {
      method: 'PUT',
      body: {
        title: section.title,
        subtitle: section.subtitle,
        payload: section.payload,
      },
    })
    pfPayloadOriginal.value = JSON.stringify({
      title: section.title,
      subtitle: section.subtitle,
      payload: section.payload,
    })
    pfPayloadDirty.value = false
  } catch (err) {
    noteSaveError(tHub('hub.ui.editor_sidebar.err_domain_prefooter_content', 'Contenu de la section pré-footer'), err)
  } finally {
    pfPayloadSaving.value = false
  }
}

function prefooterTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'customer-reviews': tHub('hub.ui.editor_sidebar.desc_customer_reviews', 'Avis clients vérifiés (Google, Malt)'),
    'newsletter':       tHub('hub.ui.editor_sidebar.desc_newsletter', 'Formulaire d\'inscription newsletter'),
    'trust-badges':     tHub('hub.ui.editor_sidebar.desc_trust_badges', 'Badges de confiance et certifications'),
  }
  return descriptions[type] ?? tHub('hub.ui.editor_sidebar.desc_prefooter_default', 'Composant pré-footer')
}

onMounted(() => {
  if (isDbSections.value) loadPfSections()
})

const editorSiloState = useEditorSilo()
const editorSiloSections = useEditorSiloSections()
const siloFieldsDirty = ref(false)
const siloFieldsSaving = ref(false)
const siloFieldsOriginal = ref<string>('')
const siloSyncBusy = ref(false)
const siloSyncResult = ref<{ added: number; after: number } | null>(null)

const editorSiloRdvState = ref<{
  enabled: boolean
  repeatEvery: number
  position: 'top' | 'bottom'
  ctaLabelByLang: Record<string, string>
}>({
  enabled: true, repeatEvery: 16, position: 'top', ctaLabelByLang: {},
})
const siloRdvOriginal = ref<string>('')

watch(() => contextPageId.value, async (id) => {
  if (id === 'silo') {
    
    setTimeout(() => {
      siloFieldsOriginal.value = JSON.stringify(editorSiloState.value)
      siloFieldsDirty.value = false
    }, 100)
    
    
    try {
      const res = await $fetch<{ siloRdv: { enabled: boolean; repeatEvery: number; position: 'top' | 'bottom'; ctaLabelByLang?: Record<string, string> } }>('/api/silo-rdv-config?all_langs=1')
      editorSiloRdvState.value = {
        enabled: res.siloRdv.enabled,
        repeatEvery: res.siloRdv.repeatEvery,
        position: res.siloRdv.position,
        ctaLabelByLang: res.siloRdv.ctaLabelByLang || {},
      }
      siloRdvOriginal.value = JSON.stringify(editorSiloRdvState.value)
    } catch (err) {
      console.warn('[builder] Erreur chargement config RDV :', err)
    }
  }
}, { immediate: true })

function updateSiloRdvField<K extends keyof typeof editorSiloRdvState.value>(key: K, value: typeof editorSiloRdvState.value[K]) {
  editorSiloRdvState.value = { ...editorSiloRdvState.value, [key]: value } as any
  if (JSON.stringify(editorSiloRdvState.value) !== siloRdvOriginal.value) {
    siloFieldsDirty.value = true
  }
}

function updateSiloField(key: keyof EditorSiloData, value: string | number) {
  const coerced = key === 'id_category' ? (Number(value) || null) : (value || null)
  editorSiloState.value = { ...editorSiloState.value, [key]: coerced }
  siloFieldsDirty.value = JSON.stringify(editorSiloState.value) !== siloFieldsOriginal.value
}

function isSiloSectionActive(id: string): boolean {
  return editorSiloSections.value?.[id] !== false
}

function toggleSiloSection(id: string) {
  if (!editorSiloSections.value) {
    editorSiloSections.value = {}
  }
  editorSiloSections.value = {
    ...editorSiloSections.value,
    [id]: !isSiloSectionActive(id),
  }
  siloFieldsDirty.value = true
}

async function saveSiloFields() {
  siloFieldsSaving.value = true
  
  
  
  try {
    await $fetch('/api/silo', {
      method: 'PUT',
      body: {
        id_silo: contextPayload.value.id_silo,
        path: contextPayload.value.path,
        ...editorSiloState.value,
        sections: editorSiloSections.value,
      },
    })
    siloFieldsOriginal.value = JSON.stringify({ ...editorSiloState.value, sections: editorSiloSections.value })
  } catch (err) {
    console.warn('[builder] Save silo skipped/échoué (probablement page sans silo) :', err)
  }
  
  try {
    if (JSON.stringify(editorSiloRdvState.value) !== siloRdvOriginal.value) {
      await $fetch('/api/silo-rdv-config', { method: 'PUT', body: editorSiloRdvState.value })
      siloRdvOriginal.value = JSON.stringify(editorSiloRdvState.value)
    }
  } catch (err) {
    noteSaveError(tHub('hub.ui.editor_sidebar.err_domain_rdv', 'Configuration des rendez-vous'), err)
  }
  siloFieldsDirty.value = false
  siloFieldsSaving.value = false
}

async function syncSiloProducts() {
  siloSyncBusy.value = true
  siloSyncResult.value = null
  try {
    const result = await $fetch<{ ok: boolean; added: number; after: number }>('/api/silo/sync-products', {
      method: 'POST',
      body: { id_silo: contextPayload.value.id_silo },
    })
    siloSyncResult.value = { added: result.added, after: result.after }
  } catch (err) {
    console.error('[builder] Erreur sync produits silo :', err)
  } finally {
    siloSyncBusy.value = false
  }
}

const SILO_COMPONENTS = computed(() => [
  { id: 'hero', icon: '🦸', label: tHub('hub.ui.editor_sidebar.silo_hero_label', 'Hero'), desc: tHub('hub.ui.editor_sidebar.silo_hero_desc', 'Image + H1 + intro + sous-catégories'), conditional: false },
  { id: 'subcategories', icon: '🏷️', label: tHub('hub.ui.editor_sidebar.silo_subcategories_label', 'Sous-catégories'), desc: tHub('hub.ui.editor_sidebar.silo_subcategories_desc', 'Pills navigables dans le hero'), conditional: true },
  { id: 'products', icon: '📦', label: tHub('hub.ui.editor_sidebar.silo_products_label', 'Grille produits'), desc: tHub('hub.ui.editor_sidebar.silo_products_desc', 'Liste paginée SSR des produits'), conditional: true },
  { id: 'livraison', icon: '🚚', label: tHub('hub.ui.editor_sidebar.silo_livraison_label', 'Livraison & B2B'), desc: tHub('hub.ui.editor_sidebar.silo_livraison_desc', 'Zones de livraison, retrait, conditionnement'), conditional: false },
  { id: 'faq', icon: '❓', label: tHub('hub.ui.editor_sidebar.silo_faq_label', 'FAQ'), desc: tHub('hub.ui.editor_sidebar.silo_faq_desc', 'Accordéon + JSON-LD FAQPage'), conditional: true },
  { id: 'presentation', icon: '📝', label: tHub('hub.ui.editor_sidebar.silo_presentation_label', 'Présentation'), desc: tHub('hub.ui.editor_sidebar.silo_presentation_desc', 'Description longue PrestaShop'), conditional: true },
  { id: 'articles', icon: '📰', label: tHub('hub.ui.editor_sidebar.silo_articles_label', 'Articles liés'), desc: tHub('hub.ui.editor_sidebar.silo_articles_desc', 'Carrousel blog CMS'), conditional: true },
  { id: 'contact', icon: '✉️', label: tHub('hub.ui.editor_sidebar.silo_contact_label', 'Devis / Contact'), desc: tHub('hub.ui.editor_sidebar.silo_contact_desc', 'CTA demande de devis'), conditional: false },
] as const)

const footerColumnsList = useDbFooterColumns()
const footerColumnsLoading = ref(false)
const footerColumnsDirty = ref(false)
const footerColumnsSaving = ref(false)
const footerColumnsOriginal = ref<string>('')

async function loadFooterColumns() {
  if (!isDbSections.value) return
  footerColumnsLoading.value = true
  try {
    const res = await $fetch<{ columns: any[] }>('/api/footer?ids=1')
    
    footerColumnsList.value = (res.columns ?? []).map((col: any, ci: number) => ({
      title: col.title ?? '',
      column_position: col.links?.[0]?.column_position ?? (ci + 1),
      links: (col.links ?? []).map((l: any) => ({
        id: l.id,
        label: l.label,
        href: l.href,
        badge: l.badge,
        external: l.external ?? false,
        column_position: l.column_position ?? (ci + 1),
        link_position: l.link_position ?? 0,
      })),
    }))
    footerColumnsOriginal.value = JSON.stringify(footerColumnsList.value)
    footerColumnsDirty.value = false
  } catch {
    footerColumnsList.value = []
  } finally {
    footerColumnsLoading.value = false
  }
}

function markFooterColumnsDirty() {
  footerColumnsDirty.value = JSON.stringify(footerColumnsList.value) !== footerColumnsOriginal.value
}

function updateColumnTitle(ci: number, title: string) {
  const cols = [...footerColumnsList.value]
  if (!cols[ci]) return
  cols[ci] = { ...cols[ci], title }
  
  cols[ci].links = cols[ci].links.map(l => ({ ...l }))
  footerColumnsList.value = cols
  markFooterColumnsDirty()
}

function updateFooterLink(ci: number, li: number, patch: Partial<DbFooterLink>) {
  const cols = [...footerColumnsList.value]
  if (!cols[ci]?.links[li]) return
  cols[ci] = { ...cols[ci], links: [...cols[ci].links] }
  cols[ci].links[li] = { ...cols[ci].links[li], ...patch }
  footerColumnsList.value = cols
  markFooterColumnsDirty()
}

function addFooterLink(ci: number) {
  const cols = [...footerColumnsList.value]
  if (!cols[ci]) return
  const maxPos = Math.max(0, ...cols[ci].links.map(l => l.link_position))
  cols[ci] = {
    ...cols[ci],
    links: [...cols[ci].links, {
      id: -Date.now(), 
      label: 'Nouveau lien',
      href: '/',
      external: false,
      column_position: cols[ci].column_position,
      link_position: maxPos + 1,
    }],
  }
  footerColumnsList.value = cols
  markFooterColumnsDirty()
}

function removeFooterLink(ci: number, li: number) {
  const cols = [...footerColumnsList.value]
  if (!cols[ci]) return
  cols[ci] = { ...cols[ci], links: cols[ci].links.filter((_, i) => i !== li) }
  footerColumnsList.value = cols
  markFooterColumnsDirty()
}

function addColumn() {
  const maxPos = Math.max(0, ...footerColumnsList.value.map(c => c.column_position))
  footerColumnsList.value = [...footerColumnsList.value, {
    title: 'Nouvelle colonne',
    column_position: maxPos + 1,
    links: [],
  }]
  markFooterColumnsDirty()
}

function removeColumn(ci: number) {
  footerColumnsList.value = footerColumnsList.value.filter((_, i) => i !== ci)
  markFooterColumnsDirty()
}

async function saveFooterColumns() {
  footerColumnsSaving.value = true
  try {
    
    const originalCols: DbFooterColumn[] = JSON.parse(footerColumnsOriginal.value || '[]')
    const originalIds = new Set<number>()
    for (const col of originalCols) {
      for (const link of col.links) {
        if (link.id > 0) originalIds.add(link.id)
      }
    }

    const currentIds = new Set<number>()
    const updates: Promise<any>[] = []

    for (const col of footerColumnsList.value) {
      for (let li = 0; li < col.links.length; li++) {
        const link = col.links[li]
        if (link.id > 0) {
          
          currentIds.add(link.id)
          updates.push($fetch(`/api/footer-links/${link.id}`, {
            method: 'PUT',
            body: {
              column_title: col.title,
              column_position: col.column_position,
              link_label: link.label,
              link_href: link.href,
              link_badge: link.badge || null,
              link_external: link.external,
              link_position: li + 1,
            },
          }))
        } else {
          
          updates.push($fetch('/api/footer-links', {
            method: 'POST',
            body: {
              column_title: col.title,
              column_position: col.column_position,
              link_label: link.label,
              link_href: link.href,
              link_badge: link.badge || null,
              link_external: link.external,
              link_position: li + 1,
            },
          }))
        }
      }
    }

    
    for (const id of originalIds) {
      if (!currentIds.has(id)) {
        updates.push($fetch(`/api/footer-links/${id}`, { method: 'DELETE' }))
      }
    }

    await Promise.all(updates)

    
    await loadFooterColumns()
  } catch (err) {
    noteSaveError(tHub('hub.ui.editor_sidebar.err_domain_footer_cols', 'Colonnes du pied de page'), err)
  } finally {
    footerColumnsSaving.value = false
  }
}

onMounted(() => {
  if (isDbSections.value) loadFooterColumns()
})

type SocialPlatform = 'linkedin' | 'facebook' | 'instagram' | 'twitter' | 'x' | 'youtube' | 'tiktok' | 'github'

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'github', label: 'GitHub' },
]

const footerSocialList = computed(() => footerBuilderState.value?.social ?? [])

function addSocialItem() {
  const social = [...(footerBuilderState.value?.social ?? [])]
  social.push({ platform: 'linkedin' as any, href: '' })
  setSocialDb(social as any)
  markDirty()
}

function removeSocialItem(i: number) {
  const social = [...(footerBuilderState.value?.social ?? [])]
  social.splice(i, 1)
  setSocialDb(social as any)
  markDirty()
}

function updateSocialItem(i: number, patch: Partial<{ platform: SocialPlatform; href: string }>) {
  const social = [...(footerBuilderState.value?.social ?? [])]
  if (!social[i]) return
  social[i] = { ...social[i], ...patch }
  setSocialDb(social as any)
  markDirty()
}

type GroupId = 'apparence' | 'top' | 'page' | 'homepage' | 'variants' | 'footer'
const openGroup = ref<GroupId>('top')

function toggleGroup(group: GroupId) {
  openGroup.value = openGroup.value === group ? 'apparence' : group
}

watch(contextPageId, (ctx) => {
  if (ctx) openGroup.value = 'page'
})

const DEFAULT_PANEL_FOR_CONTEXT: Record<string, any> = {
  silo:     'silo:hero',
}
watch(contextPageId, (ctx) => {
  if (ctx && DEFAULT_PANEL_FOR_CONTEXT[ctx]) {
    activePanel.value = DEFAULT_PANEL_FOR_CONTEXT[ctx]
  }
})

const sectionsDejaOuvertesPour = ref<string | null>(null)
watch(
  () => [contextPageId.value, `${pageParentType.value}:${pageParentId.value}`, pageSectionsList.value.length] as const,
  ([ctx, clePage]) => {
    const panneau = panneauDouvertureDeLaPage({
      contexte: ctx,
      clePage: pageParentId.value ? clePage : '',
      nombreDeSections: pageSectionsList.value.length,
      panneauCourant: activePanel.value ?? null,
      dejaOuvertePour: sectionsDejaOuvertesPour.value,
    })
    if (!panneau) return
    sectionsDejaOuvertesPour.value = clePage
    activePanel.value = panneau as any
  },
  { immediate: true },
)

const exitUrl = computed(() => {
  const { edit_mode: _, ...rest } = route.query
  const qs = new URLSearchParams(rest as Record<string, string>).toString()
  return route.path + (qs ? `?${qs}` : '')
})

const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)

function onDragStart(index: number) { dragFrom.value = index }
function onDragOver(index: number)  { dragOver.value = index }
function onDrop(toIndex: number) {
  if (dragFrom.value !== null && dragFrom.value !== toIndex) {
    moveSection(dragFrom.value, toIndex)
  }
  dragFrom.value = null
  dragOver.value = null
}

const logoUploading = ref(false)
const logoUploadError = ref('')
async function handleLogoUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoUploadError.value = ''
  logoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'logos')
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', {
      method: 'POST',
      body: fd,
    })
    if (res?.url) {
      onHeaderLogoChange({ src: res.url })
    }
  } catch (err: any) {
    logoUploadError.value = err?.data?.message || err?.message || tHub('hub.ui.editor_sidebar.err_upload', 'Erreur upload')
  } finally {
    logoUploading.value = false
    
    ;(e.target as HTMLInputElement).value = ''
  }
}

function onHeaderLogoChange(patch: Record<string, any>) {
  updateLogoDb(patch)
  markDirty()
}
function onHeaderTopBarChange(patch: Record<string, any>) {
  updateTopBarDb(patch)
  markDirty()
}
function onHeaderContactChange(email: string) {
  updateContactEmailDb(email)
  markDirty()
}
function onHeaderFeatureChange(key: string, value: any) {
  updateFeaturesDb({ [key]: value })
  markDirty()
}

function addLanguage() {
  const langs = [...(headerBuilderState.value?.topBar?.languages ?? [])]
  
  langs.push({ code: 'fr', label: 'Français', href: '/' })
  updateTopBarDb({ languages: langs })
  markDirty()
}
function removeLanguage(i: number) {
  const langs = [...(headerBuilderState.value?.topBar?.languages ?? [])]
  langs.splice(i, 1)
  updateTopBarDb({ languages: langs })
  markDirty()
}
function updateLanguage(i: number, patch: Partial<{ code: string; label: string; href: string }>) {
  const langs = [...(headerBuilderState.value?.topBar?.languages ?? [])]
  if (!langs[i]) return
  langs[i] = { ...langs[i], ...patch }
  updateTopBarDb({ languages: langs })
  markDirty()
}

type MenuLink = { label: string; href: string; psId?: number; badge?: string; description?: string | Record<string, string>; psCategoryId?: number; showPsChildren?: boolean; psChildren?: any[] }
type MegaColumn = { title?: string; icon?: string; links: MenuLink[] }
type MenuItem = { label: string; href?: string; isMegaMenu?: boolean; megaMenu?: MegaColumn[]; children?: MenuLink[]; bgColor?: string; textColor?: string; style?: Record<string, string>; rightAlign?: boolean; align?: string; cssClass?: string; highlight?: boolean; external?: boolean; badge?: any; badgeBg?: string; badgeColor?: string; barVisible?: boolean }
type MenuItemKind = 'link' | 'dropdown' | 'megamenu'

const MENU_TYPES = computed<{ value: MenuItemKind; label: string }[]>(() => [
  { value: 'link',     label: tHub('hub.ui.editor_sidebar.menu_kind_link', 'Lien') },
  { value: 'dropdown', label: tHub('hub.ui.editor_sidebar.menu_kind_dropdown', 'Dropdown') },
  { value: 'megamenu', label: tHub('hub.ui.editor_sidebar.menu_kind_mega', 'Mégamenu') },
])

const expandedMenuItem = ref<number | null>(null)
const megamenuLoaded = ref(false)

const menuItems = computed<MenuItem[]>(() => {
  return (megamenuBuilderItems.value as MenuItem[]) ?? []
})

function commitMenuItems(items: MenuItem[]) {
  setMegamenuItems(items)
  markDirty()
}

function menuItemTypeOf(item: MenuItem): MenuItemKind {
  if (item.isMegaMenu === true) return 'megamenu'
  if (Array.isArray(item.megaMenu) && item.megaMenu.length > 0) return 'dropdown'
  return 'link'
}
function menuItemTypeLabel(item: MenuItem): string {
  return MENU_TYPES.value.find(t => t.value === menuItemTypeOf(item))?.label ?? '?'
}
function menuItemTypeBadge(item: MenuItem): string {
  const k = menuItemTypeOf(item)
  if (k === 'megamenu') return 'bg-violet-100 text-violet-700'
  if (k === 'dropdown') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

function addMenuItem() {
  const items = [...menuItems.value]
  items.push({ label: 'Nouvel item', href: '/' })
  commitMenuItems(items)
  expandedMenuItem.value = items.length - 1
}
function removeMenuItem(i: number) {
  const items = [...menuItems.value]
  items.splice(i, 1)
  commitMenuItems(items)
  if (expandedMenuItem.value === i) expandedMenuItem.value = null
}
function moveMenuItem(from: number, to: number) {
  if (to < 0 || to >= menuItems.value.length) return
  const items = [...menuItems.value]
  const [it] = items.splice(from, 1)
  items.splice(to, 0, it)
  commitMenuItems(items)
  if (expandedMenuItem.value === from) expandedMenuItem.value = to
}
function prevMegamenuIdx(i: number): number {
  for (let j = i - 1; j >= 0; j--) {
    if (menuItemTypeOf(menuItems.value[j]) === 'megamenu') return j
  }
  return -1
}
function nextMegamenuIdx(i: number): number {
  for (let j = i + 1; j < menuItems.value.length; j++) {
    if (menuItemTypeOf(menuItems.value[j]) === 'megamenu') return j
  }
  return -1
}
function updateMenuItem(i: number, patch: Partial<MenuItem>) {
  const items = [...menuItems.value]
  if (!items[i]) return
  items[i] = { ...items[i], ...patch }
  commitMenuItems(items)
}
function setMenuItemType(i: number, kind: MenuItemKind) {
  const items = [...menuItems.value]
  if (!items[i]) return
  const current = items[i]
  if (kind === 'link') {
    items[i] = { label: current.label, href: current.href ?? '/' }
  } else if (kind === 'dropdown') {
    const existingLinks = current.megaMenu?.[0]?.links ?? (current.megaMenu?.flatMap(c => c.links) ?? [])
    items[i] = { label: current.label, isMegaMenu: false, megaMenu: [{ links: existingLinks }] }
  } else {
    const existingCols: MegaColumn[] = current.megaMenu && current.megaMenu.length > 0
      ? current.megaMenu.map(c => ({ title: c.title ?? '', icon: c.icon ?? '', links: c.links ?? [] }))
      : [{ title: '', icon: '', links: [] }]
    items[i] = { label: current.label, isMegaMenu: true, megaMenu: existingCols }
  }
  commitMenuItems(items)
}

function addDropdownLink(i: number) {
  const items = [...menuItems.value]
  if (!items[i]) return
  const cols = items[i].megaMenu ?? [{ links: [] }]
  cols[0] = { ...cols[0], links: [...(cols[0].links ?? []), { label: 'Nouveau', href: '/' }] }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function removeDropdownLink(i: number, li: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[0]) return
  const links = [...items[i].megaMenu![0].links]
  links.splice(li, 1)
  items[i].megaMenu![0] = { ...items[i].megaMenu![0], links }
  commitMenuItems(items)
}
function moveDropdownLink(i: number, from: number, to: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[0]?.links) return
  const links = [...items[i].megaMenu![0].links]
  if (to < 0 || to >= links.length) return
  const [l] = links.splice(from, 1)
  links.splice(to, 0, l)
  items[i].megaMenu![0] = { ...items[i].megaMenu![0], links }
  commitMenuItems(items)
}
function updateDropdownLink(i: number, li: number, patch: Partial<MenuLink>) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[0]?.links?.[li]) return
  const links = [...items[i].megaMenu![0].links]
  links[li] = { ...links[li], ...patch }
  items[i].megaMenu![0] = { ...items[i].megaMenu![0], links }
  commitMenuItems(items)
}

function addMegaColumn(i: number) {
  const items = [...menuItems.value]
  if (!items[i]) return
  const cols = [...(items[i].megaMenu ?? [])]
  cols.push({ title: 'Nouvelle colonne', icon: '✨', links: [] })
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function removeMegaColumn(i: number, ci: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu) return
  const cols = [...items[i].megaMenu!]
  cols.splice(ci, 1)
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function moveMegaColumn(i: number, from: number, to: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu) return
  if (to < 0 || to >= items[i].megaMenu!.length) return
  const cols = [...items[i].megaMenu!]
  const [c] = cols.splice(from, 1)
  cols.splice(to, 0, c)
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function updateMegaColumn(i: number, ci: number, patch: Partial<MegaColumn>) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]) return
  const cols = [...items[i].megaMenu!]
  cols[ci] = { ...cols[ci], ...patch }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}

const megaIconFileInputs = ref<Record<string, HTMLInputElement>>({})
const megaIconUploading  = ref<Record<string, boolean>>({})
const megaIconError      = ref<Record<string, string>>({})

function triggerMegaIconUpload(i: number, ci: number) {
  megaIconFileInputs.value[`${i}:${ci}`]?.click()
}
async function onMegaIconFileChange(i: number, ci: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const k = `${i}:${ci}`
  megaIconError.value      = { ...megaIconError.value, [k]: '' }
  megaIconUploading.value  = { ...megaIconUploading.value, [k]: true }
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'megamenu')
    const res = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', {
      method: 'POST',
      body:   fd,
    })
    if (!res?.url) throw new Error(tHub('hub.ui.editor_sidebar.err_invalid_response', 'Réponse invalide'))
    updateMegaColumn(i, ci, { icon: res.url })
  } catch (err: any) {
    megaIconError.value = { ...megaIconError.value, [k]: err?.data?.message || err?.message || tHub('hub.ui.editor_sidebar.err_upload_failed', 'Échec upload') }
  } finally {
    megaIconUploading.value = { ...megaIconUploading.value, [k]: false }
    if (input) input.value = ''
  }
}
function addMegaLink(i: number, ci: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]) return
  const cols = [...items[i].megaMenu!]
  cols[ci] = { ...cols[ci], links: [...(cols[ci].links ?? []), { label: 'Nouveau', href: '/' }] }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function removeMegaLink(i: number, ci: number, li: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]?.links) return
  const cols = [...items[i].megaMenu!]
  const links = [...cols[ci].links]
  links.splice(li, 1)
  cols[ci] = { ...cols[ci], links }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function moveMegaLink(i: number, ci: number, from: number, to: number) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]?.links) return
  const cols = [...items[i].megaMenu!]
  const links = [...cols[ci].links]
  if (to < 0 || to >= links.length) return
  const [l] = links.splice(from, 1)
  links.splice(to, 0, l)
  cols[ci] = { ...cols[ci], links }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}
function updateMegaLink(i: number, ci: number, li: number, patch: Partial<MenuLink>) {
  const items = [...menuItems.value]
  if (!items[i]?.megaMenu?.[ci]?.links?.[li]) return
  const cols = [...items[i].megaMenu!]
  const links = [...cols[ci].links]
  links[li] = { ...links[li], ...patch }
  cols[ci] = { ...cols[ci], links }
  items[i] = { ...items[i], megaMenu: cols }
  commitMenuItems(items)
}

const headerFeaturesList = computed(() => [
  { key: 'showSearch',      label: tHub('hub.ui.editor_sidebar.feat_search', 'Barre de recherche') },
  { key: 'showWishlist',    label: tHub('hub.ui.editor_sidebar.feat_wishlist', 'Favoris / Wishlist') },
  { key: 'showLogin',       label: tHub('hub.ui.editor_sidebar.feat_login', 'Connexion client') },
  { key: 'showContact',     label: tHub('hub.ui.editor_sidebar.contact_email', 'Email de contact') },
  { key: 'showGiftcardLink', label: tHub('hub.ui.editor_sidebar.feat_giftcard', 'Lien Cartes cadeaux (après Marques)') },
  { key: 'showBlogLink',    label: tHub('hub.ui.editor_sidebar.feat_blog', 'Lien Blog (à droite du menu)') },
  { key: 'showStoresLink',  label: tHub('hub.ui.editor_sidebar.feat_stores', 'Lien Magasins / Store locator (à droite du menu)') },
  { key: 'showContactLink', label: tHub('hub.ui.editor_sidebar.feat_contact_link', 'Lien Nous contacter (à droite du menu)') },
])

const headerLayoutOptions = computed(() => [
  { value: 'stacked', label: tHub('hub.ui.editor_sidebar.layout_2_lines', '2 lignes') },
  { value: 'inline',  label: tHub('hub.ui.editor_sidebar.layout_1_line', '1 ligne') },
])

const themeColorsList = computed(() => [
  { key: 'primary',    label: tHub('hub.ui.editor_sidebar.color_primary', 'Couleur primaire') },
  { key: 'secondary',  label: tHub('hub.ui.editor_sidebar.color_secondary', 'Couleur secondaire') },
  { key: 'headerBg',   label: tHub('hub.ui.editor_sidebar.color_header_bg', 'Fond header') },
  { key: 'footerBg',   label: tHub('hub.ui.editor_sidebar.color_footer_bg', 'Fond footer') },
  { key: 'topBarBg',   label: tHub('hub.ui.editor_sidebar.color_topbar_bg', 'Fond top bar') },
  { key: 'topBarText', label: tHub('hub.ui.editor_sidebar.color_topbar_text', 'Texte top bar') },
  { key: 'background', label: tHub('hub.ui.editor_sidebar.color_background', 'Fond général') },
])

const radiusOptions = computed(() => [
  { value: 'none', label: tHub('hub.ui.editor_sidebar.radius_none', 'Carré') },
  { value: 'sm',   label: tHub('hub.ui.editor_sidebar.radius_sm', 'Léger') },
  { value: 'md',   label: tHub('hub.ui.editor_sidebar.radius_md', 'Normal') },
  { value: 'lg',   label: tHub('hub.ui.editor_sidebar.radius_lg', 'Large') },
  { value: 'full', label: tHub('hub.ui.editor_sidebar.radius_full', 'Pilule') },
])

const contentWidthOptions = computed(() => [
  { value: '6xl',  label: '6xl (1152px)' },
  { value: '7xl',  label: '7xl (1280px)' },
  { value: '8xl',  label: '8xl (1440px)' },
  { value: 'full', label: tHub('hub.ui.editor_sidebar.width_full', 'Pleine largeur') },
])

function onThemeColorChange(key: string, value: string) {
  updateThemeColorDb(key, value)
  markDirty()
}
function onThemeTypoChange(key: string, value: string) {
  updateTypographyDb(key, value)
  markDirty()
}
function onThemeUiChange(key: string, value: string | boolean) {
  updateUiDb(key, value)
  markDirty()
}

const hpDb = computed(() => hpBuilderState.value || {})

function onHpHeroChange(patch: Record<string, any>) { updateHeroDb(patch); markDirty() }

const hpHeroUploadInput = ref<HTMLInputElement | null>(null)
const hpHeroUploading = ref(false)
const hpHeroUploadError = ref<string | null>(null)
async function onHpHeroUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  hpHeroUploadError.value = null
  hpHeroUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dest', 'hero')
    const r = await $fetch<{ success: boolean; url: string }>('/api/admin/upload-image', { method: 'POST', body: fd })
    if (r?.url) {
      onHpHeroChange({ image: r.url })
    } else {
      hpHeroUploadError.value = tHub('hub.ui.editor_sidebar.err_upload_no_url', 'Upload échoué (pas d\'URL retournée)')
    }
  } catch (err: any) {
    hpHeroUploadError.value = err?.data?.message || err?.message || tHub('hub.ui.editor_sidebar.err_upload', 'Erreur upload')
  } finally {
    hpHeroUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}
function onHpAboutChange(patch: Record<string, any>) { updateAboutDb(patch); markDirty() }
function onHpBlogChange(patch: Record<string, any>) { updateBlogDb(patch); markDirty() }
function onHpFaqChange(patch: Record<string, any>) { updateFaqDb(patch); markDirty() }
function onHpMaltChange(show: boolean) {
  if (!hpBuilderState.value) loadHomepageDb()
  hpBuilderState.value = { ...hpBuilderState.value!, malt: { show } }
  markDirty()
}

function onHpAddFeature() {
  const feats = [...(hpBuilderState.value?.features || [])]
  feats.push({ icon: 'star', label: 'Nouvel atout', description: 'Description' })
  setFeaturesDb(feats); markDirty()
}
function onHpRemoveFeature(i: number) {
  const feats = [...(hpBuilderState.value?.features || [])]
  feats.splice(i, 1)
  setFeaturesDb(feats); markDirty()
}
function onHpUpdateFeature(i: number, patch: Record<string, any>) {
  const feats = [...(hpBuilderState.value?.features || [])]
  if (!feats[i]) return
  feats[i] = { ...feats[i], ...patch }
  setFeaturesDb(feats); markDirty()
}

function onHpAddCategory() {
  const cats = [...(hpBuilderState.value?.categories || [])]
  cats.push({ label: 'Nouvelle catégorie', image: '', href: '/nouvelle-categorie/' })
  setCategoriesDb(cats); markDirty()
}
function onHpRemoveCategory(i: number) {
  const cats = [...(hpBuilderState.value?.categories || [])]
  cats.splice(i, 1)
  setCategoriesDb(cats); markDirty()
}
function onHpUpdateCategory(i: number, patch: Record<string, any>) {
  const cats = [...(hpBuilderState.value?.categories || [])]
  if (!cats[i]) return
  cats[i] = { ...cats[i], ...patch }
  setCategoriesDb(cats); markDirty()
}

function onHpAddTestimonial() {
  const t = [...(hpBuilderState.value?.testimonials || [])]
  t.push({ author: 'Nom', text: 'Témoignage…', rating: 5 })
  setTestimonialsDb(t); markDirty()
}
function onHpRemoveTestimonial(i: number) {
  const t = [...(hpBuilderState.value?.testimonials || [])]
  t.splice(i, 1)
  setTestimonialsDb(t); markDirty()
}
function onHpUpdateTestimonial(i: number, patch: Record<string, any>) {
  const t = [...(hpBuilderState.value?.testimonials || [])]
  if (!t[i]) return
  t[i] = { ...t[i], ...patch }
  setTestimonialsDb(t); markDirty()
}

function onFooterFieldChange(patch: Record<string, any>) {
  updateFooterFieldDb(patch)
  markDirty()
}
function onFooterContactChange(patch: Record<string, any>) {
  updateContactDb(patch)
  markDirty()
}
function onFooterBottomBarChange(patch: Record<string, any>) {
  updateBottomBarDb(patch)
  markDirty()
}
function onFooterNewsletterChange(patch: Record<string, any>) {
  updateNewsletterDb(patch)
  markDirty()
}

const visibilityEditType = ref<SectionType | null>(null)
const visibilityRule = ref<SectionVisibilityRule>({ ...DEFAULT_VISIBILITY_RULE })

function openVisibilityPanel(type: SectionType) {
  visibilityEditType.value = type
  const existing = sections.value.find(s => s.type === type)?.visibility
  visibilityRule.value = existing
    ? { avatars: [...existing.avatars], mode: existing.mode }
    : { ...DEFAULT_VISIBILITY_RULE }
  activePanel.value = 'homepage:visibility' as any
}

function toggleAvatarInRule(avatarType: AvatarType) {
  const idx = visibilityRule.value.avatars.indexOf(avatarType)
  if (idx >= 0) {
    visibilityRule.value.avatars.splice(idx, 1)
  } else {
    visibilityRule.value.avatars.push(avatarType)
  }
}

function saveVisibilityRule() {
  if (!visibilityEditType.value) return
  updateSectionVisibility(visibilityEditType.value, { ...visibilityRule.value })
  activePanel.value = null
}

function clearVisibilityRule() {
  if (!visibilityEditType.value) return
  updateSectionVisibility(visibilityEditType.value, { ...DEFAULT_VISIBILITY_RULE })
  visibilityRule.value = { ...DEFAULT_VISIBILITY_RULE }
  activePanel.value = null
}
</script>

<style scoped>
/* ── Champs Builder (Phase 3 UX 2026-05-08, MAJ 2026-05-14) ─────────────
   Bordure marquée + focus ring 4px primary → user sait que c'est éditable.
   `:deep()` car les sous-éditeurs (I18nField, HeroSliderEditor, etc.) sont
   des composants Vue scoped séparés — sans :deep le style ne traverse pas.
   Régression 14/05 : champs i18n du builder rendus sans bordure visible. */
:deep(.field) {
  @apply block w-full px-3.5 py-2.5 text-sm rounded-lg
         border-2 border-slate-300
         bg-white text-slate-900 placeholder:text-slate-400
         shadow-sm
         focus:outline-none focus:ring-4 focus:ring-primary-200 focus:border-primary-500
         hover:border-slate-400
         transition-colors;
}
:deep(textarea.field) {
  @apply leading-relaxed py-3;
  min-height: 96px;
}
/* Inputs natifs sans class="field" mais qui sont dans le builder
   (select, input type="text", checkbox, etc.) — fallback discret pour
   ne pas avoir d'inputs unstyled. Les `.field` au-dessus prennent priorité. */
:deep(input[type="text"]:not(.field):not([class*="rounded"])),
:deep(input[type="email"]:not(.field):not([class*="rounded"])),
:deep(input[type="url"]:not(.field):not([class*="rounded"])),
:deep(input[type="number"]:not(.field):not([class*="rounded"])),
:deep(input[type="search"]:not(.field):not([class*="rounded"])),
:deep(input[type="tel"]:not(.field):not([class*="rounded"])),
:deep(textarea:not(.field):not([class*="rounded"])),
:deep(select:not(.field):not([class*="rounded"])) {
  @apply px-2 py-1 text-sm rounded-md
         border border-slate-300
         bg-white text-slate-900 placeholder:text-slate-400
         focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500
         hover:border-slate-400 transition-colors;
}
:deep(.field-label) {
  @apply flex items-center gap-1.5
         text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5;
}
:deep(.field-help) {
  @apply mt-1 text-[10px] text-slate-400 leading-snug;
}
:deep(.field-counter) {
  @apply ml-auto text-[10px] font-mono text-slate-400 normal-case tracking-normal;
}

/* ── Resize handle (bord droit de la sidebar, 4px largeur, cursor col-resize)
   Visible au hover + état actif (drag en cours). */
.builder-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 120ms ease;
  z-index: 5;
}
.builder-resize-handle:hover,
.builder-resize-handle.is-resizing {
  background: rgba(99, 102, 241, 0.45); /* primary-400/50 */
}

/* ── Mode collapsed (rail 56px) — masque le contenu non-essentiel.
   Pattern : font-size:0 sur les labels (les nœuds texte deviennent
   invisibles, les SVG/icônes restent intrinsèquement dimensionnés). */
.builder-sidebar.is-collapsed .builder-header-text,
.builder-sidebar.is-collapsed .builder-resize-handle {
  display: none !important;
}
.builder-sidebar.is-collapsed > div:not(:first-child) {
  display: none !important;
}
.builder-sidebar.is-collapsed > div:first-child {
  padding: 0.75rem 0.5rem !important;
}
</style>
