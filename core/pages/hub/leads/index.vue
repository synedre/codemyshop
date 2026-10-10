<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.leads.title', 'Leads & Contacts') }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ t('hub.ui.leads.count', '{n} leads', { n: total }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button @click="setSource('')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="source === '' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.leads.all', 'Tous') }}</button>
          <button @click="setSource('lead')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="source === 'lead' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.leads.leads_tab', 'Leads') }}</button>
          <button @click="setSource('contact')" class="px-3 py-1.5 text-xs font-medium transition-colors" :class="source === 'contact' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ t('hub.ui.leads.form', 'Formulaire') }}</button>
        </div>
        <input v-model="search" type="text" :placeholder="t('hub.ui.leads.search_ph', 'Nom, email, société…')" class="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" @keyup.enter="goPage(1)" />
        <button @click="goPage(1)" class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">{{ t('hub.ui.leads.search', 'Rechercher') }}</button>
        <a
          href="/api/bo/leads/export"
          download
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          :title="t('hub.ui.leads.export_tip', 'Télécharger tous les leads (CSV)')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          {{ t('hub.ui.leads.export', 'Exporter') }}
        </a>
        <button
          @click="importOpen = true"
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          :title="t('hub.ui.leads.import_tip', 'Importer des leads depuis un CSV')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          {{ t('hub.ui.leads.import', 'Importer') }}
        </button>
        <button
          @click="capaModalOpen = true"
          class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          :title="t('hub.ui.leads.capa_tip', 'Configurer le scoring Capa pour ce tenant')"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Capa
        </button>
        <button @click="showCreate = true" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          {{ t('hub.ui.leads.new_lead', 'Nouveau lead') }}
        </button>
      </div>
    </header>

    
    <nav class="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 px-6 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
      <span class="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 mr-2 shrink-0">{{ t('hub.ui.leads.enrich', 'Enrichir (gratuit)') }}</span>
      <button
        v-for="src in enrichmentSources"
        :key="src.key"
        @click="openEnrichment(src.key)"
        class="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 shrink-0 border"
        :class="src.available
          ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
          : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'"
        :title="src.tagline"
      >
        <span class="text-base leading-none">{{ src.icon }}</span>
        <span>{{ src.label }}</span>
        <span v-if="!src.available" class="text-[9px] uppercase text-gray-400 ml-0.5">·&nbsp;{{ t('hub.ui.leads.todo', 'todo') }}</span>
      </button>
    </nav>

    
    <div
      v-if="enrichmentOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="enrichmentOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div class="flex items-start gap-3">
          <span class="text-3xl leading-none">{{ currentSource?.icon }}</span>
          <div class="flex-1">
            <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ currentSource?.label }}</h2>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ currentSource?.tagline }}</p>
          </div>
          <span
            class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold"
            :class="currentSource?.available
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-500'"
          >{{ currentSource?.available ? t('hub.ui.leads.avail', 'Dispo') : t('hub.ui.leads.to_code', 'À coder') }}</span>
        </div>
        <dl class="text-xs space-y-2">
          <div class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">{{ t('hub.ui.leads.cost', 'Coût') }}</dt>
            <dd class="text-gray-700 dark:text-slate-200">{{ currentSource?.cost }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">{{ t('hub.ui.leads.coverage', 'Couverture') }}</dt>
            <dd class="text-gray-700 dark:text-slate-200">{{ currentSource?.coverage }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">{{ t('hub.ui.leads.legal', 'Légal') }}</dt>
            <dd class="text-gray-700 dark:text-slate-200">{{ currentSource?.legal }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">{{ t('hub.ui.leads.method', 'Méthode') }}</dt>
            <dd class="text-gray-700 dark:text-slate-200">{{ currentSource?.method }}</dd>
          </div>
          <div v-if="currentSource?.docUrl" class="flex gap-2">
            <dt class="font-medium text-gray-500 w-32 shrink-0">{{ t('hub.ui.leads.doc', 'Doc') }}</dt>
            <dd>
              <a :href="currentSource.docUrl" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">{{ currentSource.docUrl }}</a>
            </dd>
          </div>
        </dl>
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button @click="enrichmentOpen = false" class="text-xs px-3 py-1.5 bg-white border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">{{ t('hub.ui.leads.close', 'Fermer') }}</button>
          <button
            :disabled="!currentSource?.available"
            class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            :title="currentSource?.available ? t('hub.ui.leads.launch_enrich', 'Lancer l\'enrichissement') : t('hub.ui.leads.scraper_todo', 'Scraper pas encore codé')"
          >{{ currentSource?.available ? t('hub.ui.leads.launch', 'Lancer') : t('hub.ui.leads.soon', 'Bientôt') }}</button>
        </div>
      </div>
    </div>

    <HubImportModal
      :open="importOpen"
      :title="t('hub.ui.leads.imp_title', 'Importer des leads')"
      :subtitle="t('hub.ui.leads.imp_sub', 'CSV — UPSERT par email. Crée ou met à jour uniquement la fiche lead (cs_smartlead).')"
      endpoint="/api/bo/leads/import"
      :target-fields="importTargetFields"
      :field-aliases="importFieldAliases"
      :matching-keys="['email']"
      :create-missing-label="t('hub.ui.leads.imp_create_label', 'Créer les leads manquants')"
      :create-missing-hint="t('hub.ui.leads.imp_create_hint', 'Insère un nouveau lead si l\'email n\'existe pas encore. Statut par défaut : new, source : import.')"
      @close="importOpen = false"
      @done="load"
    />

    
    <HubCreateModal v-model="showCreate" :title="t('hub.ui.leads.new_lead', 'Nouveau lead')" :loading="creating" @submit="createLead">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.firstname', 'Prénom') }}</label><input v-model="newLead.firstname" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
          <div><label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.name', 'Nom') }}</label><input v-model="newLead.lastname" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        </div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.email', 'Email') }}</label><input v-model="newLead.email" type="email" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.company', 'Société') }}</label><input v-model="newLead.company" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.phone', 'Téléphone') }}</label><input v-model="newLead.phone" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" /></div>
        <p v-if="createError" class="text-xs text-red-500">{{ createError }}</p>
      </div>
    </HubCreateModal>

    <HubPaginationBar v-if="total > 0" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.leads.leads_label', 'leads')"
      :per-page="perPage" :per-page-options="perPageOptions"
      @go="goPage" @update:per-page="setPerPage"
      class="border-b border-gray-100 dark:border-slate-800" />

    
    <div
      v-if="selection.size > 0"
      class="bg-primary-50 dark:bg-primary-950/40 border-b border-primary-200 dark:border-primary-800 px-6 py-2 flex items-center gap-3 shrink-0"
    >
      <span class="text-xs font-medium text-primary-700 dark:text-primary-300">
        {{ selection.size > 1 ? t('hub.ui.leads.selected_other', '{n} sélectionnés', { n: selection.size }) : t('hub.ui.leads.selected_one', '{n} sélectionné', { n: selection.size }) }}
      </span>
      <button
        @click="exportSelectionCsv"
        class="text-xs px-3 py-1 bg-white dark:bg-slate-900 border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/40 flex items-center gap-1"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        {{ t('hub.ui.leads.export_csv', 'Exporter CSV') }}
      </button>
      <button
        @click="openBulkVerify"
        :disabled="!selectionEmailCount"
        class="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        :title="selectionEmailCount ? t('hub.ui.leads.smtp_probe_tip', 'Sondage SMTP sur {n} email(s)', { n: selectionEmailCount }) : t('hub.ui.leads.no_email_verify', 'Aucun email à vérifier dans la sélection')"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
        {{ t('hub.ui.leads.verify_emails', 'Vérifier emails') }}<span v-if="selectionEmailCount" class="opacity-80">&nbsp;({{ selectionEmailCount }})</span>
      </button>
      <button
        @click="bulkDeleteOpen = true"
        class="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
        {{ t('hub.ui.leads.delete', 'Supprimer') }}
      </button>
      <button
        @click="clearSelection"
        class="text-xs px-3 py-1 text-primary-700 dark:text-primary-300 hover:underline ml-auto"
      >
        {{ t('hub.ui.leads.deselect', 'Désélectionner') }}
      </button>
    </div>

    
    <div
      v-if="bulkDeleteOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="bulkDeleteOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ selection.size > 1 ? t('hub.ui.leads.del_title_other', 'Supprimer {n} fiches ?', { n: selection.size }) : t('hub.ui.leads.del_title_one', 'Supprimer {n} fiche ?', { n: selection.size }) }}</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {{ t('hub.ui.leads.del_warning', 'Action irréversible (sauf soft-delete des comptes boutique). Leads de prospection et messages de contact : suppression définitive. Comptes boutique : voir le mode ci-dessous — leurs commandes sont toujours préservées pour archive.') }}
          </p>
          <ul class="text-xs text-gray-600 dark:text-slate-300 mt-3 space-y-0.5 pl-1">
            <li v-if="selectionCounts.lead">• <b>{{ selectionCounts.lead }}</b> {{ selectionCounts.lead > 1 ? t('hub.ui.leads.prospect_lead_other', 'leads de prospection') : t('hub.ui.leads.prospect_lead_one', 'lead de prospection') }}</li>
            <li v-if="selectionCounts.contact">• <b>{{ selectionCounts.contact }}</b> {{ selectionCounts.contact > 1 ? t('hub.ui.leads.contact_msg_other', 'messages de contact') : t('hub.ui.leads.contact_msg_one', 'message de contact') }}</li>
            <li v-if="selectionCounts.customerNoorder">• <b>{{ selectionCounts.customerNoorder }}</b> {{ selectionCounts.customerNoorder > 1 ? t('hub.ui.leads.shop_acc_other', 'comptes boutique') : t('hub.ui.leads.shop_acc_one', 'compte boutique') }}</li>
          </ul>
        </div>

        
        <div v-if="selectionCounts.customerNoorder" class="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2">
          <p class="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            {{ selectionCounts.customerNoorder > 1 ? t('hub.ui.leads.mode_for_other', 'Mode pour {n} comptes boutique', { n: selectionCounts.customerNoorder }) : t('hub.ui.leads.mode_for_one', 'Mode pour {n} compte boutique', { n: selectionCounts.customerNoorder }) }}
          </p>
          <label class="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-200 cursor-pointer">
            <input v-model="bulkDeleteMode" type="radio" value="soft" class="mt-0.5" />
            <span>
              <b>Soft</b> {{ t('hub.ui.leads.soft_desc', '— compte marqué supprimé (deleted=1). L\'email redevient libre, le client peut se réinscrire.') }}
              <span class="text-emerald-600 dark:text-emerald-400">{{ t('hub.ui.leads.recommended', 'Recommandé.') }}</span>
            </span>
          </label>
          <label class="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-200 cursor-pointer">
            <input v-model="bulkDeleteMode" type="radio" value="hard" class="mt-0.5" />
            <span>
              <b>Hard</b> {{ t('hub.ui.leads.hard_desc', '— RGPD : DELETE complet du compte + adresses non commandées, carts pending, sessions. Les commandes restent pour archive.') }}
              <span class="text-red-600 dark:text-red-400">{{ t('hub.ui.leads.irreversible', 'Irréversible.') }}</span>
            </span>
          </label>
        </div>

        <p v-if="bulkDeleteError" class="text-xs text-red-500">{{ bulkDeleteError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="bulkDeleteOpen = false" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">{{ t('hub.ui.leads.cancel', 'Annuler') }}</button>
          <button @click="submitBulkDelete" :disabled="bulkDeleting" class="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{{ bulkDeleting ? t('hub.ui.leads.deleting', 'Suppression…') : t('hub.ui.leads.confirm_delete', 'Confirmer la suppression') }}</button>
        </div>
      </div>
    </div>

    
    <div
      v-if="bulkVerifyOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeBulkVerify"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.leads.bv_title', 'Vérification SMTP en lot') }}</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {{ t('hub.ui.leads.bv_intro', 'Sondage RCPT TO sur') }} <b>{{ bulkVerifyTotal }}</b> {{ bulkVerifyTotal > 1 ? t('hub.ui.leads.email_other', 'emails') : t('hub.ui.leads.email_one', 'email') }}
            {{ t('hub.ui.leads.bv_note', '(concurrence 3, ~3-5 s par email). Tu peux interrompre à tout moment.') }}
          </p>
        </div>

        
        <div v-if="bulkVerifyRunning || bulkVerifyDone > 0" class="space-y-1.5">
          <div class="flex justify-between text-[11px] text-gray-600 dark:text-slate-300 font-mono">
            <span>{{ bulkVerifyDone }} / {{ bulkVerifyTotal }}</span>
            <span>{{ bulkVerifyTotal ? Math.round(100 * bulkVerifyDone / bulkVerifyTotal) : 0 }} %</span>
          </div>
          <div class="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 transition-all duration-200"
              :style="{ width: bulkVerifyTotal ? (100 * bulkVerifyDone / bulkVerifyTotal) + '%' : '0%' }"
            />
          </div>
        </div>

        
        <div v-if="bulkVerifyDone > 0" class="grid grid-cols-3 gap-2 text-[11px]">
          <div class="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-1.5 text-center">
            <div class="font-semibold text-base leading-tight">{{ bulkVerifyCounts.ok }}</div>
            <div class="opacity-70">{{ t('hub.ui.leads.bv_ok', 'Vérifiés') }}</div>
          </div>
          <div class="rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-2 py-1.5 text-center">
            <div class="font-semibold text-base leading-tight">{{ bulkVerifyCounts.rejected }}</div>
            <div class="opacity-70">{{ t('hub.ui.leads.bv_rej', 'Rejetés') }}</div>
          </div>
          <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2 py-1.5 text-center">
            <div class="font-semibold text-base leading-tight">{{ bulkVerifyCounts.unknown + bulkVerifyCounts.errors }}</div>
            <div class="opacity-70">{{ t('hub.ui.leads.bv_unk', 'Inconcluants') }}</div>
          </div>
        </div>

        
        <p v-if="bulkVerifyRunning && bulkVerifyCurrent" class="text-[11px] text-gray-500 dark:text-slate-400 truncate">
          {{ t('hub.ui.leads.in_progress', 'En cours : {name}', { name: bulkVerifyCurrent }) }}
        </p>

        <p v-if="bulkVerifyError" class="text-xs text-red-500">{{ bulkVerifyError }}</p>

        <div class="flex justify-end gap-2">
          <button
            v-if="!bulkVerifyRunning && bulkVerifyDone === 0"
            @click="closeBulkVerify"
            class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
          >{{ t('hub.ui.leads.cancel', 'Annuler') }}</button>
          <button
            v-if="bulkVerifyRunning"
            @click="bulkVerifyShouldStop = true"
            class="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >{{ t('hub.ui.leads.interrupt', 'Interrompre') }}</button>
          <button
            v-if="!bulkVerifyRunning && bulkVerifyDone === 0"
            @click="runBulkVerify"
            class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >{{ t('hub.ui.leads.run_verify', 'Lancer la vérification') }}</button>
          <button
            v-if="!bulkVerifyRunning && bulkVerifyDone > 0"
            @click="closeBulkVerify"
            class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >{{ t('hub.ui.leads.close', 'Fermer') }}</button>
        </div>
      </div>
    </div>

    
    <div
      v-if="linkedinLead"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeLinkedinModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            LinkedIn
            <span v-if="linkedinLead.linkedinUrl" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase tracking-wider">{{ t('hub.ui.leads.verified', 'Vérifié') }}</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {{ linkedinLead.name }}<span v-if="linkedinLead.company"> · {{ linkedinLead.company }}</span>
          </p>
        </div>

        
        <div class="border border-gray-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">{{ t('hub.ui.leads.li_step1', 'Étape 1 — Trouver le profil') }}</p>
          <a
            v-if="linkedinSearchUrl(linkedinLead)"
            :href="linkedinSearchUrl(linkedinLead)!"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            {{ t('hub.ui.leads.li_google', 'Rechercher sur Google (site:linkedin.com/in/)') }}
          </a>
          <p v-else class="text-xs text-gray-400">{{ t('hub.ui.leads.li_name_inc', 'Nom incomplet — recherche indisponible.') }}</p>
        </div>

        
        <div class="border border-gray-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <p class="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">{{ t('hub.ui.leads.li_step2', 'Étape 2 — Coller l\'URL du profil vérifié') }}</p>
          <input
            v-model="linkedinUrlInput"
            type="url"
            placeholder="https://www.linkedin.com/in/…"
            class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2"
            @keyup.enter="submitLinkedin"
          />
          <a
            v-if="linkedinUrlInput && /^https?:\/\/.+linkedin\.com\//i.test(linkedinUrlInput)"
            :href="linkedinUrlInput"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:underline"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            {{ t('hub.ui.leads.li_open', 'Ouvrir le profil dans un nouvel onglet') }}
          </a>
        </div>

        <p v-if="linkedinError" class="text-xs text-red-500">{{ linkedinError }}</p>
        <div class="flex justify-between items-center gap-2">
          <button
            v-if="linkedinLead.linkedinUrl"
            @click="clearLinkedin"
            :disabled="linkedinSaving"
            class="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg disabled:opacity-50"
          >{{ t('hub.ui.leads.li_remove', 'Retirer le lien') }}</button>
          <span v-else />
          <div class="flex gap-2">
            <button @click="closeLinkedinModal" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">{{ t('hub.ui.leads.close', 'Fermer') }}</button>
            <button
              @click="submitLinkedin"
              :disabled="linkedinSaving || !linkedinUrlInput.trim()"
              class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >{{ linkedinSaving ? t('hub.ui.leads.saving', 'Enregistrement…') : t('hub.ui.leads.li_save', 'Enregistrer comme vérifié') }}</button>
          </div>
        </div>
      </div>
    </div>

    
    <div
      v-if="emailLead"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeEmailModal"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            {{ t('hub.ui.leads.email', 'Email') }}
            <span v-if="emailLead.emailVerifiedStatus" class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
              :class="emailStatusBadgeClass(emailLead.emailVerifiedStatus)">
              {{ emailStatusLabel(emailLead.emailVerifiedStatus) }}
            </span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">
            {{ emailLead.email }}<span v-if="emailLead.name"> · {{ emailLead.name }}</span>
          </p>
        </div>

        
        <div class="border border-gray-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
          <div class="flex items-start gap-2">
            <span class="text-base">✓</span>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-gray-700 dark:text-slate-200">SMTP verify</p>
              <p class="text-[11px] text-gray-500 dark:text-slate-400 leading-snug">
                {{ t('hub.ui.leads.smtp_desc', 'Handshake socket + RCPT TO sans envoi réel. Couverture ~75% (Gmail/Outlook/OVH/IONOS), inconcluant si le serveur fait du greylisting ou refuse les sondes.') }}
              </p>
            </div>
          </div>
          <button
            @click="runEmailVerify"
            :disabled="emailVerifying"
            class="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >{{ emailVerifying ? t('hub.ui.leads.probing', 'Sondage en cours…') : t('hub.ui.leads.run_smtp', 'Lancer la vérification SMTP') }}</button>

          
          <div v-if="emailVerifyResult" class="text-[11px] mt-2 space-y-0.5 bg-gray-50 dark:bg-slate-800 rounded p-2">
            <p>
              <span class="font-semibold">{{ t('hub.ui.leads.status_colon', 'Statut :') }}</span>
              <span :class="emailStatusTextClass(emailVerifyResult.status)" class="font-semibold ml-1">{{ emailStatusLabel(emailVerifyResult.status) }}</span>
            </p>
            <p v-if="emailVerifyResult.mxHost"><span class="text-gray-500">MX :</span> {{ emailVerifyResult.mxHost }}</p>
            <p v-if="emailVerifyResult.code"><span class="text-gray-500">{{ t('hub.ui.leads.smtp_code', 'Code SMTP :') }}</span> {{ emailVerifyResult.code }}</p>
            <p v-if="emailVerifyResult.detail" class="text-gray-500 break-all">{{ emailVerifyResult.detail }}</p>
            <p v-if="!emailVerifyResult.persisted" class="text-amber-600 dark:text-amber-400 mt-1">
              {{ t('hub.ui.leads.src_word', 'Source') }} <b>{{ sourceLabel(emailLead) }}</b>{{ t('hub.ui.leads.not_persisted', ': résultat non persisté (table sans colonne dédiée).') }}
            </p>
          </div>

          
          <p v-else-if="emailLead.emailVerifiedAt" class="text-[11px] text-gray-500 dark:text-slate-400">
            {{ t('hub.ui.leads.last_check', 'Dernière vérification :') }} <b>{{ emailStatusLabel(emailLead.emailVerifiedStatus) }}</b>
            {{ t('hub.ui.leads.on_date', 'le {date}', { date: formatDate(emailLead.emailVerifiedAt) }) }}.
          </p>
        </div>

        <p v-if="emailVerifyError" class="text-xs text-red-500">{{ emailVerifyError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="closeEmailModal" class="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">{{ t('hub.ui.leads.close', 'Fermer') }}</button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-50 dark:bg-slate-800/80 z-10">
          <tr class="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th class="px-3 py-2.5 w-8">
              <input
                type="checkbox"
                :checked="allOnPageSelected"
                :indeterminate.prop="someOnPageSelected"
                @change="togglePage"
                class="cursor-pointer"
                :title="t('hub.ui.leads.select_page', 'Tout sélectionner sur la page')"
              />
            </th>
            <th @click="toggleSort('source')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.h_source', 'Source') }}<span class="text-gray-300">{{ sortGlyph('source') }}</span></span></th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.leads.h_already', 'Déjà client') }}</th>
            <th @click="toggleSort('name')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.name', 'Nom') }}<span class="text-gray-300">{{ sortGlyph('name') }}</span></span></th>
            <th @click="toggleSort('profession')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.h_job', 'Fonction') }}<span class="text-gray-300">{{ sortGlyph('profession') }}</span></span></th>
            <th @click="toggleSort('company')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.company', 'Société') }}<span class="text-gray-300">{{ sortGlyph('company') }}</span></span></th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.leads.h_activity', 'Activité') }}</th>
            <th @click="toggleSort('city')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.h_city', 'Ville') }}<span class="text-gray-300">{{ sortGlyph('city') }}</span></span></th>
            
            <th class="px-4 py-2.5 font-medium" :title="t('hub.ui.leads.addr_tip', 'Adresse SIRENE (siège social) — remplie depuis l\'API recherche-entreprises.api.gouv.fr quand un SIRET est connu.')">{{ t('hub.ui.leads.h_address', 'Adresse') }}</th>
            <th @click="toggleSort('website')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.h_site', 'Site') }}<span class="text-gray-300">{{ sortGlyph('website') }}</span></span></th>
            <th v-if="hasFeature('crm-leads-stack-detection')" @click="toggleSort('stack')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Stack<span class="text-gray-300">{{ sortGlyph('stack') }}</span></span></th>
            
            <th v-if="hasFeature('lead.ca')" @click="toggleSort('ca')" class="px-4 py-2.5 font-medium text-right cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.h_rev', 'CA') }}<span class="text-gray-300">{{ sortGlyph('ca') }}</span></span></th>
            <th v-if="hasFeature('lead.capa')" @click="toggleSort('capa')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">Capa<span class="text-gray-300">{{ sortGlyph('capa') }}</span></span></th>
            <th v-if="hasFeature('crm-leads-generation-detection')" @click="toggleSort('generation')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.h_gen', 'Génération') }}<span class="text-gray-300">{{ sortGlyph('generation') }}</span></span></th>
            <th @click="toggleSort('email')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.email', 'Email') }}<span class="text-gray-300">{{ sortGlyph('email') }}</span></span></th>
            <th class="px-4 py-2.5 font-medium">{{ t('hub.ui.leads.h_tel', 'Tél') }}</th>
            <th @click="toggleSort('date')" class="px-4 py-2.5 font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-200"><span class="inline-flex items-center gap-1">{{ t('hub.ui.leads.h_date', 'Date') }}<span class="text-gray-300">{{ sortGlyph('date') }}</span></span></th>
          </tr>
          
          <tr class="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <th class="px-2 py-1.5">
              <button
                v-if="hasActiveColFilter"
                @click="clearColFilters"
                class="text-[10px] text-primary-600 hover:underline whitespace-nowrap"
                :title="t('hub.ui.leads.reset_filters', 'Réinitialiser les filtres')"
              >×</button>
            </th>
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fSourceCol" class="filter-input">
                <option value="">{{ t('hub.ui.leads.all', 'Tous') }}</option>
                <option value="lead">{{ t('hub.ui.leads.f_lead', 'Lead') }}</option>
                <option value="customer-noorder">{{ t('hub.ui.leads.f_shop', 'Compte boutique') }}</option>
                <option value="contact">{{ t('hub.ui.leads.form', 'Formulaire') }}</option>
              </select>
            </th>
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fOrderedBefore" class="filter-input" :title="t('hub.ui.leads.already_tip', 'Déjà client (a commandé)')">
                <option value="0">{{ t('hub.ui.leads.no', 'Non') }}</option>
                <option value="1">{{ t('hub.ui.leads.yes', 'Oui') }}</option>
                <option value="all">{{ t('hub.ui.leads.all', 'Tous') }}</option>
              </select>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fName" type="text" :placeholder="t('hub.ui.leads.ph_name', 'Nom…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fProfession" type="text" :placeholder="t('hub.ui.leads.ph_job', 'Fonction…')" class="filter-input" /></th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCompany" type="text" :placeholder="t('hub.ui.leads.ph_company', 'Société…')" class="filter-input" /></th>
            <th class="px-2 py-1.5">
              <select v-model="colFilters.fActivite" class="filter-input">
                <option value="">{{ t('hub.ui.leads.all_f', 'Toutes') }}</option>
                <option v-for="a in activityOptions" :key="a.code" :value="a.code">{{ a.label }}</option>
              </select>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fCity" type="text" :placeholder="t('hub.ui.leads.ph_city', 'Ville…')" class="filter-input" /></th>
            <th class="px-2 py-1.5" />
            <th class="px-2 py-1.5"><input v-model="colFilters.fWebsite" type="text" :placeholder="t('hub.ui.leads.ph_site', 'Site…')" class="filter-input" /></th>
            <th v-if="hasFeature('crm-leads-stack-detection')" class="px-2 py-1.5" />
            <th v-if="hasFeature('lead.ca')" class="px-2 py-1.5"><input v-model.number="colFilters.fCaMin" type="number" min="0" step="100000" :placeholder="t('hub.ui.leads.ph_camin', 'CA min')" class="filter-input text-right tabular-nums" /></th>
            <th v-if="hasFeature('lead.capa')" class="px-2 py-1.5" />
            <th v-if="hasFeature('crm-leads-generation-detection')" class="px-2 py-1.5" />
            <th class="px-2 py-1.5">
              <div class="flex gap-1 items-center">
                <input v-model="colFilters.fEmail" type="text" :placeholder="t('hub.ui.leads.ph_email', 'Email…')" class="filter-input flex-1" />
                <select v-model="colFilters.fEmailVerified" class="filter-input flex-shrink-0 w-16" :title="t('hub.ui.leads.verif_status', 'Statut vérification')">
                  <option value="">·</option>
                  <option value="ok">✓</option>
                  <option value="rejected">✗</option>
                  <option value="unknown">?</option>
                  <option value="none">—</option>
                </select>
              </div>
            </th>
            <th class="px-2 py-1.5"><input v-model="colFilters.fPhone" type="text" :placeholder="t('hub.ui.leads.ph_tel', 'Tél…')" class="filter-input" /></th>
            <th class="px-2 py-1.5" />
          </tr>
        </thead>
        <tbody>
          
          <HubTableSkeletonRows v-if="loading" :rows="10" :colspan="20" />
          <tr v-else-if="!leads.length">
            <td colspan="20" class="text-center py-20 text-sm text-gray-400">{{ t('hub.ui.leads.no_lead', 'Aucun lead trouvé') }}</td>
          </tr>
          <tr v-else v-for="l in leads" :key="`${l.source}-${l.id}`"
              class="border-b border-gray-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              :class="selection.has(rowKey(l)) ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''"
              @click="onRowClick(l)">
            <td class="px-3 py-2.5 w-8" @click.stop>
              <input
                type="checkbox"
                :checked="selection.has(rowKey(l))"
                @change="toggleRow(l)"
                class="cursor-pointer"
              />
            </td>
            <td class="px-4 py-2.5">
              <a
                v-if="sourceLink(l)"
                :href="sourceLink(l)!"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 underline-offset-2 hover:underline"
                :title="sourceLabelTitle(l)"
                @click.stop
              >{{ sourceLabel(l) }}</a>
              <span
                v-else
                class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                :class="sourceBadgeClass(l)"
              >{{ sourceLabel(l) }}</span>
            </td>
            <td class="px-4 py-2.5">
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                :class="l.nbOrders > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500'"
                :title="l.nbOrders > 0 ? t('hub.ui.leads.n_orders', '{n} commande(s)', { n: l.nbOrders }) : t('hub.ui.leads.no_orders', 'Aucune commande')"
              >{{ l.nbOrders > 0 ? t('hub.ui.leads.yes', 'Oui') : t('hub.ui.leads.no', 'Non') }}</span>
            </td>
            <td class="px-4 py-2.5 text-gray-800 dark:text-slate-100">
              <span class="inline-flex items-center gap-1">
                <span>{{ l.name || '—' }}</span>
                <button
                  v-if="canShowLinkedin(l)"
                  type="button"
                  @click.stop="openLinkedinModal(l)"
                  :title="l.linkedinUrl ? t('hub.ui.leads.li_verified', 'LinkedIn vérifié') : t('hub.ui.leads.li_check', 'Vérifier le profil LinkedIn de {name}', { name: l.name })"
                  :class="l.linkedinUrl
                    ? 'text-[10px] px-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-0.5'
                    : 'text-[10px] px-1 rounded text-blue-600 hover:bg-blue-50'"
                >
                  <span>in</span>
                  <svg v-if="l.linkedinUrl" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </button>
              </span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ professionLabel(l) || '—' }}</td>
            <td class="px-4 py-2.5 text-xs text-gray-500">
              <span class="inline-flex items-center gap-1">
                <span>{{ l.company || '—' }}</span>
                <a v-if="inseeUrl(l)" :href="inseeUrl(l)!" target="_blank" rel="noopener noreferrer" class="text-[10px] px-1 rounded text-emerald-700 hover:bg-emerald-50" :title="l.siren ? t('hub.ui.leads.insee_sheet', 'Fiche INSEE {siren}', { siren: l.siren }) : t('hub.ui.leads.insee_search', 'Rechercher {company} sur annuaire-entreprises', { company: l.company })" @click.stop>🇫🇷</a>
              </span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <span v-if="l.activite" class="inline-block px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-medium">{{ activityLabel(l.activite) }}</span>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">
              <span v-if="l.city || l.country" :title="l.country ? `${l.city || ''} (${l.country})` : (l.city || '')">
                {{ l.city || '' }}<span v-if="l.country && l.country !== 'France'" class="text-[10px] text-gray-400"> · {{ l.country }}</span>
              </span>
              <span v-else class="text-gray-400">—</span>
            </td>
            
            <td class="px-4 py-2.5 text-xs text-gray-500 max-w-[260px]">
              <span v-if="l.address || l.postalCode || l.city"
                    :title="[l.address, [l.postalCode, l.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')"
                    class="inline-block max-w-full leading-tight">
                <span v-if="l.address" class="block truncate">{{ l.address }}</span>
                <span v-if="l.postalCode || l.city" class="block text-[11px] text-gray-400">
                  <span v-if="l.postalCode">{{ l.postalCode }}</span>
                  <span v-if="l.city" :class="l.postalCode ? 'ml-1' : ''">{{ l.city }}</span>
                </span>
              </span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <a v-if="l.website" :href="normalizeUrl(l.website)" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline truncate inline-block max-w-[180px]" :title="l.website" @click.stop>{{ stripScheme(l.website) }}</a>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td v-if="hasFeature('crm-leads-stack-detection')" class="px-4 py-2.5 text-xs">
              <span v-if="l.websiteTech" class="px-1.5 py-0.5 rounded text-[10px] font-medium" :class="techBadgeClass(l.websiteTech)">{{ l.websiteTech }}</span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td v-if="hasFeature('lead.ca')" class="px-4 py-2.5 text-xs text-right text-gray-700 dark:text-slate-200 font-mono tabular-nums">{{ formatCa(l.annualRevenue) }}</td>
            <td v-if="hasFeature('lead.capa')" class="px-4 py-2.5 text-xs">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-medium" :class="capacityClass(l)" :title="capacityTooltip(l)">{{ capacityLabel(l) }}</span>
            </td>
            <td v-if="hasFeature('crm-leads-generation-detection')" class="px-4 py-2.5 text-xs">
              <span v-if="generationOf(l).label !== '?'" class="px-1.5 py-0.5 rounded text-[10px] font-medium" :class="generationClass(l)" :title="generationTooltip(l)">{{ generationOf(l).label }}</span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <button
                v-if="l.email"
                type="button"
                @click.stop="openEmailModal(l)"
                :title="emailVerifyTooltip(l)"
                class="inline-flex items-center gap-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800 px-1 py-0.5 transition-colors"
                :class="emailBadgeTextClass(l)"
              >
                <span class="truncate max-w-[180px]">{{ l.email }}</span>
                <span v-if="l.emailVerifiedStatus === 'ok'" class="shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700" :title="t('hub.ui.leads.smtp_verified', 'Vérifié SMTP')">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </span>
                <span v-else-if="l.emailVerifiedStatus === 'rejected'" class="shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-100 text-red-700" :title="t('hub.ui.leads.smtp_rejected', 'Rejeté SMTP')">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </span>
                <span v-else-if="l.emailVerifiedStatus" class="shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-700" :title="t('hub.ui.leads.inconclusive', 'Inconcluant')">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.007M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </span>
              </button>
              <span v-else class="text-gray-300">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs">
              <a v-if="l.phone" :href="`tel:${normalizePhone(l.phone)}`" class="text-gray-600 dark:text-slate-300 hover:text-primary-600" @click.stop>{{ formatPhone(l.phone) }}</a>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-xs text-gray-500">{{ formatDate(l.dateAdd) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <HubPaginationBar v-if="totalPages > 1" :page="page" :total-pages="totalPages" :total="total" :label="t('hub.ui.leads.leads_label', 'leads')" @go="goPage" class="border-t border-gray-100 dark:border-slate-800" />

    
    <div
      v-if="capaModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="capaModalOpen = false"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ t('hub.ui.leads.capa_title', 'Configurer le scoring Capa') }}</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ t('hub.ui.leads.capa_sub', 'Personnalisé par tenant — détermine quand un client est "Confortable", "Faisable" ou "Risqué" selon votre ticket commercial') }}</p>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.capa_label', 'Libellé (optionnel)') }}</label>
            <input v-model="capaForm.label" type="text" :placeholder="t('hub.ui.leads.capa_ph', 'ex : Capa B2B Bacchus')" maxlength="64" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.capa_ticket', 'Ticket annuel cible (€)') }}</label>
            <input v-model.number="capaForm.ticketAnnuelEur" type="number" min="0" step="100" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
            <p class="text-[10px] text-gray-400 mt-0.5">{{ t('hub.ui.leads.capa_ticket_hint', 'Pour info — votre offre annuelle moyenne (abo + projet) en €.') }}</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-emerald-600 mb-1">{{ t('hub.ui.leads.capa_cmin_high', 'CA min "Confortable" (€)') }}</label>
              <input v-model.number="capaForm.caConfortableMin" type="number" min="0" step="100000" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label class="block text-xs font-medium text-blue-600 mb-1">{{ t('hub.ui.leads.capa_cmin_mid', 'CA min "Faisable" (€)') }}</label>
              <input v-model.number="capaForm.caFaisableMin" type="number" min="0" step="100000" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-red-600 mb-1">{{ t('hub.ui.leads.capa_loss', 'Ratio perte max toléré (% du CA)') }}</label>
            <div class="flex items-center gap-2">
              <input v-model.number="capaLossPercent" type="number" min="0" max="100" step="1" class="w-24 text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2" />
              <span class="text-xs text-gray-500">{{ t('hub.ui.leads.capa_beyond', '% — au-delà → "Risqué"') }}</span>
            </div>
          </div>
        </div>
        
        <div class="text-xs bg-gray-50 dark:bg-slate-800 rounded-lg p-3 space-y-1">
          <p class="font-medium text-gray-700 dark:text-slate-200 mb-1">{{ t('hub.ui.leads.capa_preview', 'Aperçu sur les leads chargés :') }}</p>
          <div class="flex flex-wrap gap-2">
            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{{ t('hub.ui.leads.capa_p_high', '🟢 Confortable : {n}', { n: capaPreview.high }) }}</span>
            <span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{{ t('hub.ui.leads.capa_p_mid', '🔵 Faisable : {n}', { n: capaPreview.mid }) }}</span>
            <span class="px-2 py-0.5 rounded-full bg-red-50 text-red-700">{{ t('hub.ui.leads.capa_p_low', '🔴 Risqué : {n}', { n: capaPreview.low }) }}</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">⚪ ? : {{ capaPreview.na }}</span>
          </div>
        </div>
        <p v-if="capaError" class="text-xs text-red-500">{{ capaError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="capaModalOpen = false" class="text-xs px-3 py-1.5 bg-white border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">{{ t('hub.ui.leads.cancel', 'Annuler') }}</button>
          <button @click="submitCapaConfig" :disabled="capaSaving" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{{ capaSaving ? t('hub.ui.leads.saving', 'Enregistrement…') : t('hub.ui.leads.save', 'Enregistrer') }}</button>
        </div>
      </div>
    </div>

    
    <div
      v-if="editLead"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closeEdit"
    >
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 class="text-base font-bold text-gray-800 dark:text-slate-100">{{ editLead.name || t('hub.ui.leads.f_lead', 'Lead') }}</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ editLead.company || '—' }}{{ editLead.profession ? ' · ' + editLead.profession : '' }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.e_vertical', 'Verticale cible') }}</label>
            <select v-model="editForm.verticalTarget" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2">
              <option value="a-classer">{{ t('hub.ui.leads.e_toclass', 'À classer') }}</option>
              <option value="bacchus">Bacchus (food premium)</option>
              <option value="ceres">Cérès (food générique)</option>
              <option value="poseidon">Poséidon (mer)</option>
              <option value="hephaistos">Héphaïstos (transformation)</option>
              <option value="hermes">Hermès (négoce)</option>
              <option value="hors-cible">{{ t('hub.ui.leads.e_offtarget', 'Hors-cible') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Tier</label>
            <select v-model="editForm.tier" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2">
              <option value="a-classer">{{ t('hub.ui.leads.e_toclass', 'À classer') }}</option>
              <option value="t1">{{ t('hub.ui.leads.e_t1', 'T1 (top 10-15)') }}</option>
              <option value="t2">T2</option>
              <option value="t3">T3</option>
              <option value="veille">{{ t('hub.ui.leads.e_watch', 'Veille') }}</option>
              <option value="ecarte">{{ t('hub.ui.leads.e_dropped', 'Écarté') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.e_status', 'Statut') }}</label>
            <select v-model="editForm.atlasStatus" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2">
              <option value="nouveau">{{ t('hub.ui.leads.e_new', 'Nouveau') }}</option>
              <option value="qualifie">{{ t('hub.ui.leads.e_qual', 'Qualifié') }}</option>
              <option value="veille">{{ t('hub.ui.leads.e_watch', 'Veille') }}</option>
              <option value="pret-contact">{{ t('hub.ui.leads.e_ready', 'Prêt à contacter') }}</option>
              <option value="contacte">{{ t('hub.ui.leads.e_contacted', 'Contacté') }}</option>
              <option value="ecarte">{{ t('hub.ui.leads.e_dropped', 'Écarté') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">{{ t('hub.ui.leads.e_risk', 'Risque relationnel') }}</label>
            <select v-model="editForm.relationalRisk" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2">
              <option value="a-verifier">{{ t('hub.ui.leads.e_tocheck', 'À vérifier') }}</option>
              <option value="aucun">{{ t('hub.ui.leads.e_none', 'Aucun') }}</option>
              <option value="voisin-example-shop">Voisin Example Shop</option>
              <option value="client-aude-connu">Client Aude connu</option>
              <option value="client-ac-connu">Client AC connu</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Notes atlas</label>
          <textarea v-model="editForm.notesAtlas" rows="3" class="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2"></textarea>
        </div>
        <p v-if="editError" class="text-xs text-red-500">{{ editError }}</p>
        <div class="flex justify-end gap-2">
          <button @click="closeEdit" class="text-xs px-3 py-1.5 bg-white border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">{{ t('hub.ui.leads.cancel', 'Annuler') }}</button>
          <button @click="submitEdit" :disabled="editSaving" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{{ editSaving ? t('hub.ui.leads.saving', 'Enregistrement…') : t('hub.ui.leads.save', 'Enregistrer') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })

const router = useRouter()
const route = useRoute()
const { t } = useHubT()
if (router.getRoutes().some(r => r.path === '/hub/crm/comptes')) {
  const q = String(route.query.search || route.query.q || '')
  await navigateTo(q ? `/hub/crm/comptes?q=${encodeURIComponent(q)}` : '/hub/crm/comptes', { replace: true })
}

const { hasFeature, loadFeatures, loaded: featuresLoaded } = useFeatureFlag()

const leads = ref<any[]>([])
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
const source = ref('')
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const newLead = reactive({ firstname: '', lastname: '', email: '', company: '', phone: '' })

type EnrichmentSource = {
  key: string
  label: string
  icon: string
  tagline: string
  cost: string
  coverage: string
  legal: string
  method: string
  available: boolean
  docUrl?: string
}
const enrichmentSources = computed<EnrichmentSource[]>(() => [
  {
    key: 'sirene',
    label: 'Sirene',
    icon: '🇫🇷',
    tagline: t('hub.ui.leads.sirene_tagline', 'Annuaire entreprises gov — SIRET, NAF, adresse, dirigeant légal'),
    cost: t('hub.ui.leads.sirene_cost', 'Gratuit, sans clé API'),
    coverage: t('hub.ui.leads.sirene_coverage', '100% des entreprises FR actives (squelette identitaire)'),
    legal: t('hub.ui.leads.sirene_legal', 'Données publiques INSEE — base légale OK'),
    method: t('hub.ui.leads.sirene_method', 'API recherche-entreprises.api.gouv.fr → INSERT/UPDATE company_name, siret, dirigeant'),
    available: true,
    docUrl: 'https://recherche-entreprises.api.gouv.fr/docs/',
  },
  {
    key: 'gmaps',
    label: 'Google Maps Places',
    icon: '📍',
    tagline: t('hub.ui.leads.gmaps_tagline', 'Discovery géolocalisée — commerces d\'une catégorie dans un rayon donné'),
    cost: t('hub.ui.leads.gmaps_cost', 'Free tier 200 $/mois ≈ 10 000 fiches gratuites'),
    coverage: t('hub.ui.leads.gmaps_coverage', '~95% des commerces physiques (name, tel, site, IG/FB parfois)'),
    legal: t('hub.ui.leads.gmaps_legal', 'API officielle Google — TOS OK pour usage commercial modéré'),
    method: t('hub.ui.leads.gmaps_method', 'Places API Nearby Search par catégorie + rayon, INSERT smartlead lead_source=gmaps'),
    available: false,
    docUrl: 'https://developers.google.com/maps/documentation/places/web-service',
  },
  {
    key: 'mentions-legales',
    label: t('hub.ui.leads.mentions', 'Mentions légales'),
    icon: '📄',
    tagline: t('hub.ui.leads.legalm_tagline', 'Scrape /mentions-legales du site → email pro + dirigeant'),
    cost: t('hub.ui.leads.legalm_cost', 'Gratuit (curl direct)'),
    coverage: t('hub.ui.leads.legalm_coverage', '~60% des sites artisanaux conformes LCEN'),
    legal: t('hub.ui.leads.legalm_legal', 'Affichage obligatoire LCEN — scraping légal sur données publiques'),
    method: t('hub.ui.leads.legalm_method', 'curl + extract regex SIREN/email/tel/dirigeant, fallback /contact /cgv'),
    available: false,
  },
  {
    key: 'instagram',
    label: 'Instagram Pro',
    icon: '📷',
    tagline: t('hub.ui.leads.insta_tagline', 'Profil Pro/Creator → email pro + tél cliquables (filon premium)'),
    cost: t('hub.ui.leads.insta_cost', 'Gratuit (JSON public profil)'),
    coverage: t('hub.ui.leads.insta_coverage', '~70% des artisans premium (pâtissiers/chocolatiers MOF)'),
    legal: t('hub.ui.leads.insta_legal', 'Données publiques affichées par le compte — base légale OK'),
    method: t('hub.ui.leads.insta_method', 'Fetch https://www.instagram.com/<handle>/?__a=1 puis parse business_email'),
    available: false,
  },
  {
    key: 'facebook',
    label: 'Facebook Page',
    icon: '👥',
    tagline: t('hub.ui.leads.fb_tagline', 'Onglet "À propos" page publique → email + tel + horaires'),
    cost: t('hub.ui.leads.fb_cost', 'Gratuit'),
    coverage: t('hub.ui.leads.fb_coverage', '~40% des artisans (FB en déclin chez <40 ans)'),
    legal: t('hub.ui.leads.fb_legal', 'Données publiques affichées par la page — OK'),
    method: t('hub.ui.leads.fb_method', 'Scrape page publique /<slug>/about (rate limit 1 req/2s)'),
    available: false,
  },
  {
    key: 'pappers',
    label: 'Pappers HTML',
    icon: '📊',
    tagline: t('hub.ui.leads.pappers_tagline', 'Consultation publique → dirigeant nom+prénom+date naissance'),
    cost: t('hub.ui.leads.pappers_cost', 'Gratuit (consultation HTML, pas l\'API)'),
    coverage: t('hub.ui.leads.pappers_coverage', '~90% (mandataires sociaux légaux publics)'),
    legal: t('hub.ui.leads.pappers_legal', 'BODACC/Infogreffe — données légales publiques'),
    method: t('hub.ui.leads.pappers_method', 'Scrape doux 1 req/sec sur pappers.fr/entreprise/<slug>'),
    available: false,
    docUrl: 'https://www.pappers.fr',
  },
  {
    key: 'smtp-verify',
    label: 'SMTP verify',
    icon: '✓',
    tagline: t('hub.ui.leads.smtpv_tagline', 'Valider un email deviné via handshake SMTP (sans envoi)'),
    cost: t('hub.ui.leads.smtpv_cost', 'Gratuit (socket + RCPT TO)'),
    coverage: t('hub.ui.leads.smtpv_coverage', '~75% des serveurs MX répondent (Gmail/Outlook/OVH/IONOS)'),
    legal: t('hub.ui.leads.smtpv_legal', 'Aucun envoi réel — pas de spam, RGPD-clean'),
    method: t('hub.ui.leads.smtpv_method', 'Connexion MX, MAIL FROM + RCPT TO, lecture code 250/550, fermeture'),
    available: false,
  },
])

const enrichmentOpen = ref(false)
const enrichmentKey = ref<string | null>(null)
const currentSource = computed<EnrichmentSource | null>(
  () => enrichmentSources.value.find((s) => s.key === enrichmentKey.value) || null,
)
function openEnrichment(key: string) {
  enrichmentKey.value = key
  enrichmentOpen.value = true
}

const importOpen = ref(false)
const importTargetFields = computed(() => [
  { key: 'email', label: t('hub.ui.leads.email', 'Email'), required: true },
  { key: 'firstname', label: t('hub.ui.leads.firstname', 'Prénom') },
  { key: 'lastname', label: t('hub.ui.leads.name', 'Nom') },
  { key: 'phone', label: t('hub.ui.leads.phone', 'Téléphone') },
  { key: 'company', label: t('hub.ui.leads.company', 'Société') },
  { key: 'siret', label: 'SIRET' },
  { key: 'type', label: t('hub.ui.leads.f_type', 'Type') },
  { key: 'status', label: t('hub.ui.leads.e_status', 'Statut') },
  { key: 'leadSource', label: t('hub.ui.leads.h_source', 'Source') },
  { key: 'note', label: t('hub.ui.leads.f_note', 'Note') },
])
const importFieldAliases: Record<string, string[]> = {
  email: ['email', 'mail', 'e-mail', 'courriel'],
  firstname: ['prenom', 'prénom', 'firstname', 'first name'],
  lastname: ['nom', 'lastname', 'last name', 'name'],
  phone: ['telephone', 'téléphone', 'phone', 'tel'],
  company: ['societe', 'société', 'company', 'company_name', 'entreprise'],
  siret: ['siret', 'siren'],
  type: ['type', 'categorie', 'catégorie'],
  status: ['statut', 'status', 'etat', 'état'],
  leadSource: ['source', 'lead_source', 'origine', 'canal'],
  note: ['note', 'notes', 'commentaire', 'remarque'],
}

function setSource(s: string) {
  source.value = s
  page.value = 1
  load()
}

async function createLead() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/bo/leads/create', { method: 'POST', body: newLead })
    showCreate.value = false
    Object.assign(newLead, { firstname: '', lastname: '', email: '', company: '', phone: '' })
    await load()
  } catch (err: any) {
    createError.value = err?.data?.message || t('hub.ui.leads.err_create', 'Erreur de création')
  } finally { creating.value = false }
}

async function goPage(p: number) {
  if (p < 1 || (p > totalPages.value && totalPages.value > 0)) return
  page.value = p
  await load()
}

const colFilters = reactive({
  fSourceCol: '' as string,
  
  
  fOrderedBefore: '0' as string,
  fName: '' as string,
  fProfession: '' as string,
  fCompany: '' as string,
  fActivite: '' as string,
  fCity: '' as string,
  fWebsite: '' as string,
  fCaMin: null as number | null,
  fEmail: '' as string,
  fEmailVerified: '' as string,
  fPhone: '' as string,
})
const hasActiveColFilter = computed(() => {
  return Boolean(
    colFilters.fSourceCol || (colFilters.fOrderedBefore && colFilters.fOrderedBefore !== '0') || colFilters.fName || colFilters.fProfession ||
    colFilters.fCompany || colFilters.fActivite || colFilters.fCity ||
    colFilters.fWebsite || colFilters.fEmail || colFilters.fPhone ||
    colFilters.fEmailVerified ||
    (colFilters.fCaMin != null && colFilters.fCaMin > 0),
  )
})
function clearColFilters() {
  colFilters.fSourceCol = ''
  colFilters.fOrderedBefore = '0'
  colFilters.fName = ''
  colFilters.fProfession = ''
  colFilters.fCompany = ''
  colFilters.fActivite = ''
  colFilters.fCity = ''
  colFilters.fWebsite = ''
  colFilters.fCaMin = null
  colFilters.fEmail = ''
  colFilters.fEmailVerified = ''
  colFilters.fPhone = ''
}

async function load() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/bo/leads', {
      query: {
        page: page.value, perPage: perPage.value,
        search: search.value, source: source.value,
        sort: sortKey.value || undefined, dir: sortDir.value || undefined,
        
        fSourceCol:    colFilters.fSourceCol || undefined,
        fOrderedBefore: colFilters.fOrderedBefore || undefined,
        fName:         colFilters.fName || undefined,
        fProfession:   colFilters.fProfession || undefined,
        fCompany:      colFilters.fCompany || undefined,
        fActivite:     colFilters.fActivite || undefined,
        fCity:         colFilters.fCity || undefined,
        fWebsite:      colFilters.fWebsite || undefined,
        fCaMin:        colFilters.fCaMin && colFilters.fCaMin > 0 ? colFilters.fCaMin : undefined,
        fEmail:        colFilters.fEmail || undefined,
        fEmailVerified: colFilters.fEmailVerified || undefined,
        fPhone:        colFilters.fPhone || undefined,
      },
    })
    leads.value = data.leads ?? []
    total.value = data.total ?? 0
    totalPages.value = data.totalPages ?? 0
  } finally { loading.value = false }
}

let colFilterTimer: any = null
watch(colFilters, () => {
  if (colFilterTimer) clearTimeout(colFilterTimer)
  colFilterTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}, { deep: true })

const sortKey = ref<string>('ca')
const sortDir = ref<'asc' | 'desc'>('desc')

const SORT_PREF_KEY = 'hub:leads:sort'
function loadSortPref() {
  try {
    const raw = localStorage.getItem(SORT_PREF_KEY)
    if (!raw) return
    const obj = JSON.parse(raw)
    if (obj?.key && typeof obj.key === 'string') sortKey.value = obj.key
    if (obj?.dir === 'asc' || obj?.dir === 'desc') sortDir.value = obj.dir
  } catch {  }
}
watch([sortKey, sortDir], ([k, d]) => {
  try {
    localStorage.setItem(SORT_PREF_KEY, JSON.stringify({ key: k, dir: d }))
  } catch {  }
})
function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    
    
    
    
    sortDir.value = ['ca', 'generation', 'date'].includes(key) ? 'desc' : 'asc'
  }
  page.value = 1
  load()
}
function sortGlyph(key: string): string {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('fr-FR') : '' }
function formatEur(n: number) { return Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }

const { activites: activityOptions, libelle: activityLabel } = useCustomerActivities()

function normalizeUrl(u: string): string {
  if (!u) return '#'
  if (/^https?:\/\//i.test(u)) return u
  return 'https://' + u.replace(/^\/+/, '')
}
function stripScheme(u: string): string {
  return (u || '').replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

function professionLabel(l: any): string {
  return (l?.profession && String(l.profession).trim())
    || (l?.dirigeantRole && String(l.dirigeantRole).trim())
    || ''
}

function linkedinSearchUrl(l: any): string | null {
  const parts: string[] = []
  if (l?.firstname) parts.push(String(l.firstname))
  if (l?.lastname) parts.push(String(l.lastname))
  if (l?.company) parts.push('"' + String(l.company) + '"')
  if (parts.length < 2) return null
  const q = encodeURIComponent('site:linkedin.com/in/ ' + parts.join(' '))
  return `https://www.google.com/search?q=${q}`
}

function normalizePhone(p: string): string {
  return (p || '').replace(/[^\d+]/g, '')
}
function formatPhone(p: string): string {
  
  const digits = (p || '').replace(/[^\d]/g, '')
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  }
  if (digits.length === 11 && digits.startsWith('33')) {
    return '0' + digits.slice(2).replace(/(\d{2})(?=\d)/g, '$1 ').trim()
  }
  return p
}
function inseeUrl(l: any): string | null {
  const siren = l?.siren ? String(l.siren).replace(/\D/g, '').slice(0, 9) : ''
  if (siren.length === 9) {
    return `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`
  }
  if (l?.company && String(l.company).trim().length >= 3) {
    return `https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${encodeURIComponent(String(l.company).trim())}`
  }
  return null
}

const LEAD_SOURCE_DOCS = computed<Record<string, { label: string; url?: string }>>(() => ({
  'rungis-carnet-2025': {
    label: t('hub.ui.leads.src_rungis', 'Carnet Rungis 2025'),
    url: 'https://cms.rungisinternational.com/uploads/Carnet_d_adresses_du_Marche_2024_b1458ab6e0.pdf',
  },
  shop_signup: { label: t('hub.ui.leads.f_shop', 'Compte boutique') },
  contact_form: { label: t('hub.ui.leads.form', 'Formulaire') },
  manual: { label: t('hub.ui.leads.src_manual', 'Manuel') },
  calendly: { label: 'Calendly' },
}))

function sourceLink(l: any): string | null {
  const src = l?.leadSource
  if (src && LEAD_SOURCE_DOCS.value[src]?.url) return LEAD_SOURCE_DOCS.value[src].url!
  return null
}
function sourceLabel(l: any): string {
  const src = l?.leadSource
  if (src && LEAD_SOURCE_DOCS.value[src]) return LEAD_SOURCE_DOCS.value[src].label
  if (l?.source === 'customer-noorder') return t('hub.ui.leads.f_shop', 'Compte boutique')
  if (l?.source === 'contact') return t('hub.ui.leads.src_contact', 'Contact')
  return t('hub.ui.leads.f_lead', 'Lead')
}
function sourceLabelTitle(l: any): string {
  const src = l?.leadSource
  if (src && LEAD_SOURCE_DOCS.value[src]?.url)
    return t('hub.ui.leads.open_src_doc', 'Ouvrir le document source : {label}', { label: LEAD_SOURCE_DOCS.value[src].label })
  return ''
}
function sourceBadgeClass(l: any): string {
  if (l?.source === 'customer-noorder') return 'bg-orange-50 text-orange-700'
  if (l?.source === 'contact') return 'bg-amber-50 text-amber-600'
  return 'bg-indigo-50 text-indigo-600' 
}

function formatCa(v: any): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' M€'
  if (n >= 1_000) return Math.round(n / 1_000) + ' k€'
  return n + ' €'
}

const TECH_BADGE: Record<string, string> = {
  prestashop: 'bg-emerald-50 text-emerald-700',
  shopify: 'bg-emerald-50 text-emerald-700',
  magento: 'bg-emerald-50 text-emerald-700',
  shopware: 'bg-emerald-50 text-emerald-700',
  oxatis: 'bg-emerald-50 text-emerald-700',
  pageshop: 'bg-emerald-50 text-emerald-700',
  wordpress: 'bg-blue-50 text-blue-700',
  drupal: 'bg-blue-50 text-blue-700',
  joomla: 'bg-blue-50 text-blue-700',
  wix: 'bg-purple-50 text-purple-700',
  squarespace: 'bg-purple-50 text-purple-700',
  webflow: 'bg-purple-50 text-purple-700',
  custom: 'bg-gray-100 text-gray-600',
  vetuste: 'bg-amber-50 text-amber-700',
  indispo: 'bg-red-50 text-red-700',
}
function techBadgeClass(tech: string): string {
  return TECH_BADGE[(tech || '').toLowerCase()] ?? 'bg-gray-100 text-gray-600'
}

const capaConfig = reactive({
  ticketAnnuelEur: 10000,
  caConfortableMin: 5_000_000,
  caFaisableMin: 1_000_000,
  lossRatioMax: 0.10,
  label: '',
})

function computeCapacity(l: any): { label: string; level: 'high' | 'mid' | 'low' | 'na' } {
  const ca = Number(l?.annualRevenue ?? 0)
  const net = l?.netResult != null ? Number(l.netResult) : null
  if (!ca && net == null) return { label: '?', level: 'na' }
  
  if (net != null && net < 0 && ca > 0 && Math.abs(net) / ca > capaConfig.lossRatioMax) {
    return { label: 'Risqué', level: 'low' }
  }
  
  if (ca > 0 && ca < capaConfig.caFaisableMin) return { label: 'Risqué', level: 'low' }
  
  if (ca >= capaConfig.caConfortableMin && (net == null || net >= 0))
    return { label: 'Confortable', level: 'high' }
  
  if (ca >= capaConfig.caFaisableMin && (net == null || net >= 0))
    return { label: 'Faisable', level: 'mid' }
  
  if (ca >= capaConfig.caConfortableMin && net != null && net < 0)
    return { label: 'Faisable', level: 'mid' }
  
  if (net != null && net > 100_000)
    return { label: 'Faisable', level: 'mid' }
  return { label: '?', level: 'na' }
}

function capacityLabel(l: any): string {
  const lv = computeCapacity(l).level
  if (lv === 'high') return t('hub.ui.leads.cap_high', 'Confortable')
  if (lv === 'mid') return t('hub.ui.leads.cap_mid', 'Faisable')
  if (lv === 'low') return t('hub.ui.leads.cap_low', 'Risqué')
  return '?'
}

const CAP_CLASS: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700',
  mid: 'bg-blue-50 text-blue-700',
  low: 'bg-red-50 text-red-700',
  na: 'bg-gray-100 text-gray-500',
}
function capacityClass(l: any): string {
  return CAP_CLASS[computeCapacity(l).level]
}

function capacityTooltip(l: any): string {
  const ca = Number(l?.annualRevenue ?? 0)
  const net = l?.netResult != null ? Number(l.netResult) : null
  const parts: string[] = []
  if (ca > 0) parts.push(t('hub.ui.leads.cap_ca', 'CA {v}', { v: formatCa(ca) }))
  if (net != null) parts.push(t('hub.ui.leads.cap_net', 'Net {v}', { v: formatCa(net) }))
  if (l?.headcount) parts.push(t('hub.ui.leads.cap_sal', '{n} sal.', { n: l.headcount }))
  if (parts.length === 0) return t('hub.ui.leads.cap_nodata', 'Données financières non publiées')
  return t('hub.ui.leads.cap_est', '{parts} — capacité estimée pour abo 800€/m + projet 10k€', { parts: parts.join(' · ') })
}

const CURRENT_YEAR = new Date().getFullYear()
function generationOf(l: any): { label: string; level: 'young' | 'pivot' | 'senior' | 'na'; age: number | null } {
  const year = l?.dirigeantBirthYear != null ? Number(l.dirigeantBirthYear) : null
  if (!year || year < 1900) return { label: '?', level: 'na', age: null }
  const age = CURRENT_YEAR - year
  if (age < 45) return { label: t('hub.ui.leads.gen_young', 'Jeune'), level: 'young', age }
  if (age <= 60) return { label: t('hub.ui.leads.gen_pivot', 'Pivot'), level: 'pivot', age }
  return { label: t('hub.ui.leads.gen_senior', 'Senior'), level: 'senior', age }
}
const GEN_CLASS: Record<string, string> = {
  young: 'bg-emerald-50 text-emerald-700',
  pivot: 'bg-blue-50 text-blue-700',
  senior: 'bg-amber-50 text-amber-700',
  na: 'bg-gray-100 text-gray-500',
}
function generationClass(l: any): string {
  return GEN_CLASS[generationOf(l).level]
}
function generationTooltip(l: any): string {
  const g = generationOf(l)
  const role = l?.dirigeantRole ? ` ${l.dirigeantRole}` : ''
  const name = l?.dirigeantFullName ? ` ${l.dirigeantFullName}` : ''
  if (g.age == null) return t('hub.ui.leads.gen_nodata', 'Dirigeant légal non publié au RNE')
  const ageWord = g.level === 'senior'
    ? ' ' + t('hub.ui.leads.gen_senior_hint', '— chercher l\'héritier opérationnel sur LinkedIn')
    : g.level === 'young' ? ' ' + t('hub.ui.leads.gen_young_hint', '— profil "repreneur moderne", cible idéale') : ''
  return `${t('hub.ui.leads.gen_age', '{age} ans', { age: g.age })}${role}${name}${ageWord}`
}

const capaModalOpen = ref(false)
const capaSaving = ref(false)
const capaError = ref('')
const capaForm = reactive({
  label: '',
  ticketAnnuelEur: 10000,
  caConfortableMin: 5_000_000,
  caFaisableMin: 1_000_000,
  lossRatioMax: 0.10,
})

const capaLossPercent = computed({
  get: () => Math.round((capaForm.lossRatioMax ?? 0) * 100),
  set: (v: number) => { capaForm.lossRatioMax = Math.max(0, Math.min(100, Number(v) || 0)) / 100 },
})

const capaPreview = computed(() => {
  const buckets = { high: 0, mid: 0, low: 0, na: 0 }
  const form = capaForm
  for (const l of leads.value) {
    const ca = Number(l?.annualRevenue ?? 0)
    const net = l?.netResult != null ? Number(l.netResult) : null
    if (!ca && net == null) { buckets.na++; continue }
    if (net != null && net < 0 && ca > 0 && Math.abs(net) / ca > form.lossRatioMax) {
      buckets.low++; continue
    }
    if (ca > 0 && ca < form.caFaisableMin) { buckets.low++; continue }
    if (ca >= form.caConfortableMin && (net == null || net >= 0)) { buckets.high++; continue }
    if (ca >= form.caFaisableMin && (net == null || net >= 0)) { buckets.mid++; continue }
    if (ca >= form.caConfortableMin && net != null && net < 0) { buckets.mid++; continue }
    if (net != null && net > 100_000) { buckets.mid++; continue }
    buckets.na++
  }
  return buckets
})

async function loadCapaConfig() {
  try {
    const data = await $fetch<any>('/api/bo/leads/capa-config')
    if (data?.config) {
      Object.assign(capaConfig, data.config)
      Object.assign(capaForm, data.config)
    }
  } catch (err) {
    console.warn('[capa-config] load failed', err)
  }
}
async function submitCapaConfig() {
  capaSaving.value = true
  capaError.value = ''
  try {
    const data = await $fetch<any>('/api/bo/leads/capa-config', {
      method: 'PUT',
      body: { ...capaForm },
    })
    if (data?.config) {
      Object.assign(capaConfig, data.config)
    }
    capaModalOpen.value = false
  } catch (err: any) {
    capaError.value = err?.data?.statusMessage || err?.message || t('hub.ui.leads.err_save', 'Erreur de sauvegarde')
  } finally {
    capaSaving.value = false
  }
}

const router2 = useRouter()
const editLead = ref<any | null>(null)
const editSaving = ref(false)
const editError = ref('')
const editForm = reactive({
  verticalTarget: 'a-classer',
  tier: 'a-classer',
  atlasStatus: 'nouveau',
  relationalRisk: 'a-verifier',
  notesAtlas: '',
})

function onRowClick(l: any) {
  
  
  if (!l?.id) return
  const kind = l.source === 'customer-noorder' ? 'customer-noorder'
             : l.source === 'contact' ? 'contact'
             : 'lead'
  router2.push(`/hub/leads/${l.id}?kind=${kind}`)
}
function closeEdit() {
  editLead.value = null
  editError.value = ''
}
async function submitEdit() {
  if (!editLead.value) return
  editSaving.value = true
  editError.value = ''
  try {
    await $fetch(`/api/bo/leads/${editLead.value.id}/atlas`, {
      method: 'PUT',
      body: { ...editForm },
    })
    closeEdit()
    await load()
  } catch (err: any) {
    editError.value = err?.data?.statusMessage || err?.message || t('hub.ui.leads.err_save', 'Erreur de sauvegarde')
  } finally {
    editSaving.value = false
  }
}

const linkedinLead = ref<any | null>(null)
const linkedinUrlInput = ref('')
const linkedinSaving = ref(false)
const linkedinError = ref('')

function canShowLinkedin(l: any): boolean {
  return Boolean(l?.firstname || l?.lastname || l?.name)
}
function openLinkedinModal(l: any) {
  linkedinLead.value = l
  linkedinUrlInput.value = (l?.linkedinUrl || '').toString()
  linkedinError.value = ''
}
function closeLinkedinModal() {
  linkedinLead.value = null
  linkedinError.value = ''
}
async function submitLinkedin() {
  if (!linkedinLead.value) return
  const url = linkedinUrlInput.value.trim()
  if (!url) { linkedinError.value = t('hub.ui.leads.err_url_req', 'URL requise (ou clique « Retirer le lien »).'); return }
  if (!/^https?:\/\/.+linkedin\.com\//i.test(url)) {
    linkedinError.value = t('hub.ui.leads.err_url_bad', 'URL LinkedIn invalide (doit commencer par https://…linkedin.com/).')
    return
  }
  linkedinSaving.value = true
  linkedinError.value = ''
  try {
    const source = linkedinLead.value.source
    await $fetch(`/api/bo/leads/${linkedinLead.value.id}/linkedin`, {
      method: 'PUT',
      body: { url, source },
    })
    const row = leads.value.find((r) => r.source === source && r.id === linkedinLead.value!.id)
    if (row) row.linkedinUrl = url
    closeLinkedinModal()
  } catch (err: any) {
    linkedinError.value = err?.data?.statusMessage || err?.message || t('hub.ui.leads.err_save', 'Erreur de sauvegarde')
  } finally {
    linkedinSaving.value = false
  }
}
async function clearLinkedin() {
  if (!linkedinLead.value) return
  linkedinSaving.value = true
  linkedinError.value = ''
  try {
    const source = linkedinLead.value.source
    await $fetch(`/api/bo/leads/${linkedinLead.value.id}/linkedin`, {
      method: 'PUT',
      body: { url: '', source },
    })
    const row = leads.value.find((r) => r.source === source && r.id === linkedinLead.value!.id)
    if (row) row.linkedinUrl = ''
    closeLinkedinModal()
  } catch (err: any) {
    linkedinError.value = err?.data?.statusMessage || err?.message || t('hub.ui.leads.err_save', 'Erreur de sauvegarde')
  } finally {
    linkedinSaving.value = false
  }
}

function emailStatusLabel(s: string | null | undefined): string {
  const labels: Record<string, string> = {
    ok: t('hub.ui.leads.verified', 'Vérifié'),
    rejected: t('hub.ui.leads.st_rej', 'Rejeté'),
    unknown: t('hub.ui.leads.inconclusive', 'Inconcluant'),
    mx_missing: t('hub.ui.leads.st_mx', 'MX absent'),
    connect_failed: t('hub.ui.leads.st_conn', 'Injoignable'),
    invalid_input: t('hub.ui.leads.st_inv', 'Email invalide'),
  }
  return labels[String(s || '')] || t('hub.ui.leads.st_untested', 'Non testé')
}
function emailStatusBadgeClass(s: string): string {
  if (s === 'ok') return 'bg-emerald-100 text-emerald-700'
  if (s === 'rejected') return 'bg-red-100 text-red-700'
  if (s === 'mx_missing' || s === 'invalid_input') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}
function emailStatusTextClass(s: string): string {
  if (s === 'ok') return 'text-emerald-700 dark:text-emerald-400'
  if (s === 'rejected' || s === 'mx_missing' || s === 'invalid_input') return 'text-red-600 dark:text-red-400'
  return 'text-amber-600 dark:text-amber-400'
}
function emailBadgeTextClass(l: any): string {
  if (l?.emailVerifiedStatus === 'ok') return 'text-gray-600 dark:text-slate-300'
  if (l?.emailVerifiedStatus === 'rejected' || l?.emailVerifiedStatus === 'mx_missing') return 'text-gray-400 line-through'
  return 'text-gray-400'
}
function emailVerifyTooltip(l: any): string {
  if (!l?.emailVerifiedStatus) return l?.email ? t('hub.ui.leads.verify_tip', 'Vérifier {email} via SMTP', { email: l.email }) : t('hub.ui.leads.verify_tip_generic', 'Vérifier l\'email via SMTP')
  const when = l?.emailVerifiedAt ? ' ' + t('hub.ui.leads.on_date', 'le {date}', { date: formatDate(l.emailVerifiedAt) }) : ''
  return t('hub.ui.leads.email_status_tip', 'Email {status}{when}', { status: emailStatusLabel(l.emailVerifiedStatus).toLowerCase(), when })
}

const emailLead = ref<any | null>(null)
const emailVerifying = ref(false)
const emailVerifyError = ref('')
const emailVerifyResult = ref<{
  status: string; code: number | null; detail: string | null; mxHost: string | null; persisted: boolean
} | null>(null)

function openEmailModal(l: any) {
  emailLead.value = l
  emailVerifyResult.value = null
  emailVerifyError.value = ''
}
function closeEmailModal() {
  emailLead.value = null
  emailVerifyResult.value = null
  emailVerifyError.value = ''
}
async function runEmailVerify() {
  if (!emailLead.value) return
  emailVerifying.value = true
  emailVerifyError.value = ''
  emailVerifyResult.value = null
  try {
    const res = await $fetch<any>(`/api/bo/leads/${emailLead.value.id}/email-verify`, {
      method: 'POST',
      body: { source: emailLead.value.source, email: emailLead.value.email },
      timeout: 12000,
    })
    emailVerifyResult.value = {
      status:    String(res?.status || 'unknown'),
      code:      res?.code ?? null,
      detail:    res?.detail ?? null,
      mxHost:    res?.mxHost ?? null,
      persisted: Boolean(res?.persisted),
    }
    
    if (res?.persisted && emailLead.value.source === 'lead') {
      const row = leads.value.find((r) => r.source === 'lead' && r.id === emailLead.value!.id)
      if (row) {
        row.emailVerifiedStatus = res.status
        row.emailVerifiedAt = res.verifiedAt
      }
      emailLead.value.emailVerifiedStatus = res.status
      emailLead.value.emailVerifiedAt = res.verifiedAt
    }
  } catch (err: any) {
    emailVerifyError.value = err?.data?.statusMessage || err?.message || t('hub.ui.leads.err_verify', 'Erreur de vérification')
  } finally {
    emailVerifying.value = false
  }
}

const selection = reactive<Set<string>>(new Set())
function rowKey(l: any): string { return `${l.source}-${l.id}` }
function toggleRow(l: any) {
  const k = rowKey(l)
  if (selection.has(k)) selection.delete(k); else selection.add(k)
}
function clearSelection() { selection.clear() }
const allOnPageSelected = computed(
  () => leads.value.length > 0 && leads.value.every((l) => selection.has(rowKey(l))),
)
const someOnPageSelected = computed(
  () => !allOnPageSelected.value && leads.value.some((l) => selection.has(rowKey(l))),
)
function togglePage() {
  if (allOnPageSelected.value) {
    for (const l of leads.value) selection.delete(rowKey(l))
  } else {
    for (const l of leads.value) selection.add(rowKey(l))
  }
}

const selectionCounts = computed(() => {
  const counts = { lead: 0, contact: 0, customerNoorder: 0 }
  for (const l of leads.value) {
    if (!selection.has(rowKey(l))) continue
    if (l.source === 'lead') counts.lead++
    else if (l.source === 'contact') counts.contact++
    else if (l.source === 'customer-noorder') counts.customerNoorder++
  }
  return counts
})

const selectionEmailCount = computed(() => {
  let n = 0
  for (const l of leads.value) {
    if (!selection.has(rowKey(l))) continue
    if (l.email) n++
  }
  return n
})

const bulkVerifyOpen = ref(false)
const bulkVerifyRunning = ref(false)
const bulkVerifyShouldStop = ref(false)
const bulkVerifyTotal = ref(0)
const bulkVerifyDone = ref(0)
const bulkVerifyCurrent = ref('')
const bulkVerifyError = ref('')
const bulkVerifyCounts = reactive({ ok: 0, rejected: 0, unknown: 0, errors: 0 })

function openBulkVerify() {
  if (!selectionEmailCount.value) return
  bulkVerifyTotal.value = selectionEmailCount.value
  bulkVerifyDone.value = 0
  bulkVerifyCurrent.value = ''
  bulkVerifyError.value = ''
  bulkVerifyShouldStop.value = false
  Object.assign(bulkVerifyCounts, { ok: 0, rejected: 0, unknown: 0, errors: 0 })
  bulkVerifyOpen.value = true
}
function closeBulkVerify() {
  if (bulkVerifyRunning.value) return
  bulkVerifyOpen.value = false
}

async function runBulkVerify() {
  const targets = leads.value.filter((l) => selection.has(rowKey(l)) && l.email)
  if (!targets.length) { bulkVerifyOpen.value = false; return }

  bulkVerifyRunning.value = true
  bulkVerifyError.value = ''
  bulkVerifyShouldStop.value = false
  bulkVerifyTotal.value = targets.length
  bulkVerifyDone.value = 0
  Object.assign(bulkVerifyCounts, { ok: 0, rejected: 0, unknown: 0, errors: 0 })

  const queue = [...targets]
  const CONCURRENCY = 3

  async function worker() {
    while (queue.length > 0 && !bulkVerifyShouldStop.value) {
      const l = queue.shift()
      if (!l) break
      bulkVerifyCurrent.value = l.email
      try {
        const res = await $fetch<any>(`/api/bo/leads/${l.id}/email-verify`, {
          method: 'POST',
          body: { source: l.source, email: l.email },
          timeout: 12000,
        })
        const status = String(res?.status || 'unknown')
        if (status === 'ok') bulkVerifyCounts.ok++
        else if (status === 'rejected' || status === 'mx_missing') bulkVerifyCounts.rejected++
        else bulkVerifyCounts.unknown++
        
        const row = leads.value.find((r) => r.source === l.source && r.id === l.id)
        if (row) {
          row.emailVerifiedStatus = status
          row.emailVerifiedAt = res?.verifiedAt
        }
      } catch (err: any) {
        bulkVerifyCounts.errors++
        console.warn('[bulk-verify]', l.email, err?.message)
      } finally {
        bulkVerifyDone.value++
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  } catch (err: any) {
    bulkVerifyError.value = err?.message || t('hub.ui.leads.err_probe', 'Erreur durant le sondage')
  } finally {
    bulkVerifyRunning.value = false
    bulkVerifyCurrent.value = ''
  }
}

function exportSelectionCsv() {
  const rows = leads.value.filter((l) => selection.has(rowKey(l)))
  if (!rows.length) return
  const headers = [
    'Source', 'ID', 'Nom', 'Email', 'Téléphone', 'Société', 'SIRET', 'Activité',
    'Ville', 'Pays', 'Site', 'CA', 'Date',
  ]
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [headers.join(';')]
  for (const r of rows) {
    lines.push([
      r.source, r.id,
      esc(r.name), esc(r.email), esc(r.phone), esc(r.company), esc(r.siren || r.siret),
      esc(r.activite), esc(r.city), esc(r.country),
      esc(r.website),
      r.annualRevenue || '',
      r.dateAdd ? new Date(r.dateAdd).toISOString().slice(0, 10) : '',
    ].join(';'))
  }
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-selection-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

const bulkDeleteOpen = ref(false)
const bulkDeleting = ref(false)
const bulkDeleteError = ref('')
const bulkDeleteMode = ref<'soft' | 'hard'>('soft')
async function submitBulkDelete() {
  bulkDeleting.value = true
  bulkDeleteError.value = ''
  try {
    const items = leads.value
      .filter((l) => selection.has(rowKey(l)))
      .map((l) => ({ source: l.source, id: l.id }))
    await $fetch('/api/bo/leads/bulk-delete', {
      method: 'POST',
      body: { items, mode: bulkDeleteMode.value },
    })
    selection.clear()
    bulkDeleteOpen.value = false
    await load()
  } catch (err: any) {
    bulkDeleteError.value = err?.data?.statusMessage || err?.message || t('hub.ui.leads.err_delete', 'Erreur de suppression')
  } finally {
    bulkDeleting.value = false
  }
}

onMounted(() => {
  if (!featuresLoaded.value) loadFeatures()
  loadCapaConfig()
  loadSortPref()
  load()
})
</script>

<style scoped>
.filter-input {
  @apply w-full text-[11px] border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300 transition-colors;
}
</style>
