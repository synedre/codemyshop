<template>
  <div class="flex-1 overflow-auto">
    
    <header class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <NuxtLink to="/hub/projects" class="text-gray-400 hover:text-primary-600 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </NuxtLink>
        <div v-if="project">
          <h1 class="text-lg font-bold text-gray-800 dark:text-slate-100 leading-tight">{{ project.project_title }}</h1>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusBadge(project.project_status)">
              {{ STATUSES[project.project_status] || project.project_status }}
            </span>
            <span v-if="project.contact_name" class="text-xs text-gray-400">{{ project.contact_name }}</span>
          </div>
        </div>
      </div>
    </header>

    <div v-if="loadingProject" class="text-center py-20 text-gray-400">{{ tHub('hub.ui.project_detail.loading', 'Chargement…') }}</div>

    
    <div v-else-if="!project" class="p-6">
      <div class="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40 p-6 text-sm text-rose-800 dark:text-rose-200">
        <p class="font-semibold mb-1">{{ tHub('hub.ui.project_detail.load_failed', 'Impossible de charger ce projet') }}</p>
        <p class="text-xs opacity-80 mb-3">{{ loadError || tHub('hub.ui.project_detail.no_data', 'Aucune donnée renvoyée par l\'API.') }}</p>
        <NuxtLink to="/hub/projects" class="inline-block text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium">
          {{ tHub('hub.ui.project_detail.back_to_list', '← Retour à la liste') }}
        </NuxtLink>
      </div>
    </div>

    <div v-else class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div v-if="loadError" class="lg:col-span-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
        ⚠ {{ loadError }}
      </div>

      
      <div class="lg:col-span-2 space-y-6">

        
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm">{{ tHub('hub.ui.project_detail.info_title', 'Informations projet') }}</h2>
            <button @click="editingInfo = !editingInfo" class="text-xs text-primary-500 hover:text-primary-700">
              {{ editingInfo ? tHub('hub.ui.project_detail.cancel', 'Annuler') : tHub('hub.ui.project_detail.edit', 'Modifier') }}
            </button>
          </div>

          <div v-if="!editingInfo" class="space-y-4 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div><span class="text-gray-400 text-xs">{{ tHub('hub.ui.project_detail.f_type', 'Type') }}</span><p class="text-gray-700">{{ PROJECT_TYPES[project.project_type] || project.project_type || '—' }}</p></div>
              <div><span class="text-gray-400 text-xs">{{ tHub('hub.ui.project_detail.f_budget', 'Budget') }}</span><p class="text-gray-700">{{ BUDGETS[project.budget] || '—' }}</p></div>
              <div><span class="text-gray-400 text-xs">{{ tHub('hub.ui.project_detail.final_price', 'Prix final') }}</span><p class="text-gray-700">{{ project.final_price ? formatPrice(project.final_price) : '—' }}</p></div>
              <div><span class="text-gray-400 text-xs">{{ tHub('hub.ui.project_detail.meeting', 'RDV') }}</span><p class="text-gray-700">{{ project.meeting_date ? formatDate(project.meeting_date) : '—' }}</p></div>
              <div><span class="text-gray-400 text-xs">{{ tHub('hub.ui.project_detail.received_on', 'Reçue le') }}</span><p class="text-gray-700">{{ project.date_add ? formatDate(project.date_add) : '—' }}</p></div>
              <div><span class="text-gray-400 text-xs">{{ tHub('hub.ui.project_detail.client_ref', 'Réf. client') }}</span><p class="text-gray-700 font-mono">{{ project.reference_client || '—' }}</p></div>
            </div>

            
            <div v-if="requestedProducts.length">
              <div class="flex items-baseline justify-between flex-wrap gap-2">
                <span class="text-gray-400 text-xs">{{ requestedProducts.length > 1 ? tHub('hub.ui.project_detail.requested_other', 'Produits demandés ({n} références)', { n: requestedProducts.length }) : tHub('hub.ui.project_detail.requested_one', 'Produits demandés ({n} référence)', { n: requestedProducts.length }) }}</span>
                <div class="flex items-center gap-3">
                  <a
                    v-if="project.quote_request_id"
                    :href="`/api/bo/smartproject/projects/${projectId}/quote-pdf`"
                    target="_blank"
                    rel="noopener"
                    class="text-xs text-primary-600 hover:underline inline-flex items-center gap-1"
                    :title="tHub('hub.ui.project_detail.quote_pdf_title', 'Voir le PDF envoyé au lead lors de la demande de devis')"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    {{ tHub('hub.ui.project_detail.quote_pdf', 'Voir le devis PDF') }}
                  </a>
                  <span class="text-gray-400 text-xs">{{ tHub('hub.ui.project_detail.total_qty', 'Total qté :') }} <b class="text-gray-700">{{ requestedTotalQty }}</b></span>
                </div>
              </div>
              <div class="mt-2 rounded-lg border border-gray-100 overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th class="text-left px-3 py-2 font-medium">{{ tHub('hub.ui.project_detail.th_product', 'Produit') }}</th>
                      <th class="text-left px-3 py-2 font-medium w-24">{{ tHub('hub.ui.project_detail.th_ref', 'Réf.') }}</th>
                      <th class="text-right px-3 py-2 font-medium w-14">{{ tHub('hub.ui.project_detail.th_qty', 'Qté') }}</th>
                      <th class="text-right px-3 py-2 font-medium w-24">{{ tHub('hub.ui.project_detail.th_unit_ht', 'PU HT') }}</th>
                      <th class="text-right px-3 py-2 font-medium w-28">{{ tHub('hub.ui.project_detail.th_total_ht', 'Total HT') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(p, i) in requestedProducts" :key="i" class="border-t border-gray-100">
                      <td class="px-3 py-2 text-gray-800">
                        <NuxtLink v-if="p.id" :to="`/produit/${p.id}`" target="_blank" class="text-gray-800 hover:text-primary-600 hover:underline">{{ p.name }}</NuxtLink>
                        <span v-else>{{ p.name }}</span>
                      </td>
                      <td class="px-3 py-2 text-gray-500 font-mono text-xs">{{ p.reference || '—' }}</td>
                      <td class="px-3 py-2 text-right text-gray-700 font-semibold">{{ p.quantity }}</td>
                      <td class="px-3 py-2 text-right text-gray-500 tabular-nums">
                        <span v-if="p.id && needsPricing[p.id] != null">{{ formatPriceHt(needsPricing[p.id]) }}</span>
                        <span v-else class="text-gray-300">—</span>
                      </td>
                      <td class="px-3 py-2 text-right text-gray-800 font-semibold tabular-nums">
                        <span v-if="p.id && needsPricing[p.id] != null">{{ formatPriceHt(lineTotalHt(p)) }}</span>
                        <span v-else class="text-gray-300">—</span>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot v-if="requestedTotalHt > 0">
                    <tr class="border-t-2 border-gray-200 bg-gray-50">
                      <td colspan="4" class="px-3 py-2 text-right text-xs uppercase tracking-wider text-gray-500 font-medium">{{ tHub('hub.ui.project_detail.total_ht_gross', 'Total HT brut') }}</td>
                      <td class="px-3 py-2 text-right text-gray-900 font-bold tabular-nums">{{ formatPriceHt(requestedTotalHt) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div class="mt-2 text-[11px] text-gray-500 space-y-0.5">
                <p v-if="purchaseMinimumHt > 0">
                  {{ tHub('hub.ui.project_detail.min_order', 'Minimum de commande :') }} <span class="font-semibold text-gray-700">{{ tHub('hub.ui.project_detail.price_ht', '{price} HT', { price: formatPriceHt(purchaseMinimumHt) }) }}</span>
                </p>
                <p v-if="primaryCarrier && primaryCarrier.freeFromHt > 0">
                  {{ tHub('hub.ui.project_detail.shipping_free_from', 'Frais de port ({carrier}) : franco à partir de', { carrier: primaryCarrier.name }) }}
                  <span class="font-semibold text-gray-700">{{ tHub('hub.ui.project_detail.price_ht', '{price} HT', { price: formatPriceHt(primaryCarrier.freeFromHt) }) }}</span>
                  <span v-if="primaryCarrier.flatCostBelowHt > 0">{{ tHub('hub.ui.project_detail.below_threshold', '— {price} HT en-dessous', { price: formatPriceHt(primaryCarrier.flatCostBelowHt) }) }}</span>.
                </p>
                <p v-else-if="primaryCarrier && primaryCarrier.flatCostBelowHt > 0">
                  {{ tHub('hub.ui.project_detail.shipping_flat', 'Frais de port ({carrier}) : {price} HT.', { carrier: primaryCarrier.name, price: formatPriceHt(primaryCarrier.flatCostBelowHt) }) }}
                </p>
                <p v-else>{{ tHub('hub.ui.project_detail.shipping_extra', 'Frais de port : en sus, selon transporteur et adresse.') }}</p>
                <p
                  v-if="purchaseMinimumHt > 0 && requestedTotalHt > 0 && requestedTotalHt < purchaseMinimumHt"
                  class="text-amber-700 font-medium"
                >
                  {{ tHub('hub.ui.project_detail.under_minimum', '⚠ Devis sous le minimum — complément requis : {price} HT.', { price: formatPriceHt(purchaseMinimumHt - requestedTotalHt) }) }}
                </p>
                <p
                  v-else-if="primaryCarrier && primaryCarrier.freeFromHt > 0 && requestedTotalHt > 0 && requestedTotalHt < primaryCarrier.freeFromHt"
                  class="text-amber-700 font-medium"
                >
                  {{ tHub('hub.ui.project_detail.under_franco', '⚠ Sous le franco — ajoutez {price} HT pour la livraison offerte.', { price: formatPriceHt(primaryCarrier.freeFromHt - requestedTotalHt) }) }}
                </p>
              </div>
              
              <div v-if="requestedMessage" class="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <span class="text-amber-700 text-xs font-semibold">{{ tHub('hub.ui.project_detail.client_message', 'Message client') }}</span>
                <p class="text-gray-700 whitespace-pre-wrap mt-1 text-sm">{{ requestedMessage }}</p>
              </div>

              
              <div class="mt-3 rounded-lg border border-gray-100 px-3 py-3 flex flex-wrap items-center justify-between gap-3">
                <div class="text-xs text-gray-600 flex-1 min-w-0">
                  <template v-if="project.cart_sent_at">
                    <span class="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      {{ tHub('hub.ui.project_detail.cart_sent', 'Panier envoyé') }}
                    </span>
                    {{ tHub('hub.ui.project_detail.cart_sent_on', 'le {date}', { date: formatDateTime(project.cart_sent_at) }) }}<span v-if="project.cart_sent_by"> {{ tHub('hub.ui.project_detail.cart_sent_by', 'par {by}', { by: project.cart_sent_by }) }}</span>.
                    <span v-if="project.cart_consumed_at" class="ml-2 text-emerald-700 font-medium" :title="tHub('hub.ui.project_detail.cart_opened_on', 'Ouvert le {date}', { date: formatDateTime(project.cart_consumed_at) })">{{ tHub('hub.ui.project_detail.lead_clicked', '· Lead a cliqué ✓') }}</span>
                    <span v-else class="ml-2 text-gray-400">{{ tHub('hub.ui.project_detail.awaiting_click', '· En attente du clic') }}</span>
                  </template>
                  <template v-else>
                    {{ tHub('hub.ui.project_detail.cart_hint', 'Le commercial peut transformer ce devis en panier d\'achat — le lead reçoit un email avec un lien direct (pré-rempli, mot de passe à saisir).') }}
                  </template>
                </div>
                <button
                  @click="onSendCart"
                  :disabled="sendingCart || !project.email || cartBlockedUnderMin"
                  class="text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium inline-flex items-center gap-1.5 shrink-0"
                  :title="cartBlockedUnderMin
                    ? tHub('hub.ui.project_detail.cart_blocked_title', 'Devis sous le minimum ({total} < {min}). Forcer via BO Configuration → PS_QUOTE_ALLOW_MAGICLINK_UNDER_MIN=1 si politique commerciale change.', { total: formatPriceHt(requestedTotalHt), min: formatPriceHt(purchaseMinimumHt) })
                    : (!project.email ? tHub('hub.ui.project_detail.no_contact_email', 'Le projet n\'a pas d\'email de contact') : (project.cart_sent_at ? tHub('hub.ui.project_detail.resend_cart_title', 'Renvoyer un nouveau panier (révoque l\'ancien)') : tHub('hub.ui.project_detail.send_cart_title', 'Envoyer un panier au lead')))"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
                  {{ sendingCart ? tHub('hub.ui.project_detail.sending', 'Envoi…') : (project.cart_sent_at ? tHub('hub.ui.project_detail.resend_cart', 'Renvoyer le panier') : tHub('hub.ui.project_detail.make_cart', 'Transformer en panier')) }}
                </button>
              </div>
              <p v-if="sendCartError" class="mt-2 text-xs text-red-600">{{ sendCartError }}</p>
              <p v-if="sendCartSuccess" class="mt-2 text-xs text-emerald-600">{{ sendCartSuccess }}</p>

              
              <details class="mt-3" :open="!!cartEmailBody">
                <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                  {{ tHub('hub.ui.project_detail.customize_mail', '✏️ Personnaliser le texte du mail') }}
                  <span v-if="cartEmailBodySaved" class="text-emerald-600 text-[10px] ml-2">{{ tHub('hub.ui.project_detail.saved', '✓ enregistré') }}</span>
                </summary>
                <textarea
                  v-model="cartEmailBody"
                  @blur="onSaveCartEmailBody"
                  rows="4"
                  :placeholder="tHub('hub.ui.project_detail.custom_body_ph', 'Texte personnalisé qui remplacera l\'intro par défaut (ex : « Bonjour Camille, voici votre devis tel qu\'on en a discuté hier — n\'hésite pas à m\'appeler si tu veux ajuster les quantités. »). Laissez vide pour le texte par défaut.')"
                  class="mt-2 w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-y"
                />
                <p class="text-[10px] text-gray-400 mt-1">
                  {{ tHub('hub.ui.project_detail.custom_body_hint', 'Le texte est inséré tel quel — pas de HTML. Les retours à la ligne sont préservés. Sauvegarde automatique à la sortie du champ.') }}
                </p>
              </details>
            </div>

            
            <div v-else-if="project.needs">
              <span class="text-gray-400 text-xs">{{ tHub('hub.ui.project_detail.needs', 'Besoins') }}</span>
              <p class="text-gray-700 whitespace-pre-wrap mt-1">{{ project.needs }}</p>
            </div>
          </div>

          <form v-else @submit.prevent="saveInfo" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">{{ tHub('hub.ui.project_detail.f_status', 'Statut') }}</label>
                <select v-model="infoForm.project_status" class="input-field">
                  <option v-for="(l, k) in STATUSES" :key="k" :value="k">{{ l }}</option>
                </select>
              </div>
              <div>
                <label class="label">{{ tHub('hub.ui.project_detail.f_type', 'Type') }}</label>
                <select v-model="infoForm.project_type" class="input-field">
                  <option value="">—</option>
                  <option v-for="(l, k) in PROJECT_TYPES" :key="k" :value="k">{{ l }}</option>
                </select>
              </div>
              <div>
                <label class="label">{{ tHub('hub.ui.project_detail.f_budget', 'Budget') }}</label>
                <select v-model="infoForm.budget" class="input-field">
                  <option value="">—</option>
                  <option v-for="(l, k) in BUDGETS" :key="k" :value="k">{{ l }}</option>
                </select>
              </div>
              <div>
                <label class="label">{{ tHub('hub.ui.project_detail.final_price_eur', 'Prix final (€)') }}</label>
                <input v-model="infoForm.final_price" type="number" class="input-field" />
              </div>
            </div>
            <div>
              <label class="label">{{ tHub('hub.ui.project_detail.needs', 'Besoins') }}</label>
              <textarea v-model="infoForm.needs" rows="4" class="input-field resize-none" />
            </div>
            <button type="submit" class="btn-primary text-xs px-4 py-2">{{ tHub('hub.ui.project_detail.save', 'Enregistrer') }}</button>
          </form>
        </section>

        
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm">{{ tHub('hub.ui.project_detail.tasks_title', 'Tâches ({n})', { n: tasks.length }) }}</h2>
            <button @click="showAddTask = true" class="text-xs text-primary-500 hover:text-primary-700">{{ tHub('hub.ui.project_detail.add_plus', '+ Ajouter') }}</button>
          </div>

          <div v-if="!tasks.length" class="text-sm text-gray-400 text-center py-4">{{ tHub('hub.ui.project_detail.no_tasks', 'Aucune tâche') }}</div>

          <div class="space-y-2">
            <div
              v-for="t in tasks"
              :key="t.id_ac_smarttask"
              class="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-800 hover:bg-gray-50"
            >
              <button @click="toggleTask(t)" class="shrink-0">
                <div :class="['w-4 h-4 rounded border-2 flex items-center justify-center transition-colors', t.task_status === 'done' ? 'bg-success-500 border-success-500' : 'border-gray-300']">
                  <svg v-if="t.task_status === 'done'" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
              </button>
              <div class="flex-1 min-w-0">
                <p :class="['text-sm truncate', t.task_status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-slate-200']">
                  {{ t.task_title }}
                </p>
                <p v-if="t.date_deadline" class="text-xs text-gray-400">{{ formatDate(t.date_deadline) }}</p>
              </div>
              <button @click="deleteTask(t.id_ac_smarttask)" class="text-gray-300 hover:text-danger-400 text-xs shrink-0">✕</button>
            </div>
          </div>

          
          <div v-if="showAddTask" class="mt-3 flex gap-2">
            <input v-model="newTaskTitle" @keyup.enter="addTask" :placeholder="tHub('hub.ui.project_detail.task_title_ph', 'Titre de la tâche…')" class="input-field flex-1 text-xs" />
            <button @click="addTask" class="btn-primary text-xs px-3 py-1.5">{{ tHub('hub.ui.project_detail.add', 'Ajouter') }}</button>
            <button @click="showAddTask = false" class="text-xs text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        </section>

        
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm">{{ tHub('hub.ui.project_detail.emails_title', 'Emails ({n})', { n: emails.length }) }}</h2>
            <button @click="showSendEmail = !showSendEmail" class="text-xs text-primary-500 hover:text-primary-700">
              {{ showSendEmail ? tHub('hub.ui.project_detail.cancel', 'Annuler') : tHub('hub.ui.project_detail.send_plus', '+ Envoyer') }}
            </button>
          </div>

          <div v-if="showSendEmail" class="mb-4 space-y-2 p-3 bg-gray-50 rounded-lg">
            <input v-model="emailForm.subject" :placeholder="tHub('hub.ui.project_detail.subject_ph', 'Objet')" class="input-field text-xs" />
            <textarea v-model="emailForm.body" rows="4" :placeholder="tHub('hub.ui.project_detail.body_ph', 'Corps de l\'email…')" class="input-field text-xs resize-none" />
            <button @click="sendEmail" :disabled="sendingEmail" class="btn-primary text-xs px-4 py-1.5">
              {{ sendingEmail ? tHub('hub.ui.project_detail.sending', 'Envoi…') : tHub('hub.ui.project_detail.send', 'Envoyer') }}
            </button>
          </div>

          <div v-if="!emails.length && !showSendEmail" class="text-sm text-gray-400 text-center py-4">{{ tHub('hub.ui.project_detail.no_emails', 'Aucun email') }}</div>

          <div class="space-y-2">
            <div v-for="e in emails" :key="e.id_ac_smartemail" class="p-3 rounded-lg border border-gray-100 dark:border-slate-800">
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">{{ e.email_title }}</p>
                <span class="text-xs text-gray-400 shrink-0 ml-2">{{ formatDate(e.date_add) }}</span>
              </div>
              <p class="text-xs text-gray-500 line-clamp-2">{{ e.email_message }}</p>
            </div>
          </div>
        </section>
      </div>

      
      <div class="space-y-6">

        
        <section v-if="project.contact_name" class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 class="font-semibold text-gray-700 text-sm mb-4">{{ tHub('hub.ui.project_detail.contact', 'Contact') }}</h2>

          
          <div class="flex items-center gap-3 mb-4">
            <div class="w-11 h-11 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-base shrink-0">
              {{ project.contact_name?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-gray-900 text-sm truncate">{{ project.contact_name }}</p>
              <p v-if="project.company_name" class="text-xs text-gray-500 truncate">{{ project.company_name }}</p>
              <p v-else-if="project.profession" class="text-xs text-gray-400 truncate">{{ project.profession }}</p>
            </div>
          </div>

          
          <div class="space-y-2 mb-4">
            <a
              v-if="project.phone"
              :href="`tel:${project.phone.replace(/\s/g,'')}`"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <span class="font-mono">{{ project.phone }}</span>
            </a>

            <a
              v-if="project.email"
              :href="`mailto:${project.email}`"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-gray-700 text-sm hover:bg-gray-100 transition-colors"
            >
              <svg class="w-4 h-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <span class="truncate flex-1">{{ project.email }}</span>
            </a>

            <a
              v-if="project.phone_whatsapp || project.phone"
              :href="`https://wa.me/${(project.phone_whatsapp || project.phone).replace(/\D/g, '').replace(/^0/, '33')}`"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-success-50 text-success-700 text-sm hover:bg-success-100 transition-colors"
            >
              <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </a>
          </div>

          
          <dl class="space-y-2 pt-3 border-t border-gray-100 text-xs">
            <div v-if="project.siret" class="flex justify-between gap-2">
              <dt class="text-gray-400">SIRET</dt>
              <dd class="text-gray-700 font-mono">{{ project.siret }}</dd>
            </div>
            <div v-if="project.activite" class="flex justify-between gap-2">
              <dt class="text-gray-400">{{ tHub('hub.ui.project_detail.activity_field', 'Activité') }}</dt>
              <dd class="text-gray-700 text-right">{{ project.activite }}</dd>
            </div>
            <div v-if="project.lead_source" class="flex justify-between gap-2">
              <dt class="text-gray-400">{{ tHub('hub.ui.project_detail.source', 'Source') }}</dt>
              <dd>
                <span class="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{{ LEAD_SOURCE_LABEL[project.lead_source] || project.lead_source }}</span>
              </dd>
            </div>
            <div v-if="project.lead_intent" class="flex justify-between gap-2">
              <dt class="text-gray-400">{{ tHub('hub.ui.project_detail.intent', 'Intention') }}</dt>
              <dd>
                <span class="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{{ LEAD_INTENT_LABEL[project.lead_intent] || project.lead_intent }}</span>
              </dd>
            </div>
          </dl>
        </section>

        
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm">{{ tHub('hub.ui.project_detail.documents_title', 'Documents ({n})', { n: documents.length }) }}</h2>
            <label class="text-xs text-primary-500 hover:text-primary-700 cursor-pointer">
              {{ tHub('hub.ui.project_detail.add_plus', '+ Ajouter') }}
              <input type="file" class="hidden" @change="uploadDocument" />
            </label>
          </div>

          <div v-if="!documents.length" class="text-xs text-gray-400 text-center py-3">{{ tHub('hub.ui.project_detail.no_documents', 'Aucun document') }}</div>

          <div class="space-y-2">
            <div v-for="d in documents" :key="d.id_ac_document" class="flex items-center gap-2 text-xs">
              <span class="text-gray-400">📎</span>
              <span class="flex-1 text-gray-700 dark:text-slate-200 truncate">{{ d.document_title || d.file_name }}</span>
              <button @click="deleteDocument(d.id_ac_document)" class="text-gray-300 hover:text-danger-400">✕</button>
            </div>
          </div>
        </section>

        
        <section class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <h2 class="font-semibold text-gray-700 dark:text-slate-200 text-sm mb-3">{{ tHub('hub.ui.project_detail.activity_log', 'Activité') }}</h2>
          <div v-if="!logs.length" class="text-xs text-gray-400 text-center py-3">{{ tHub('hub.ui.project_detail.no_activity', 'Aucune activité') }}</div>
          <div class="space-y-2">
            <div v-for="l in logs.slice(0, 10)" :key="l.id_ac_smartautomation_log" class="text-xs text-gray-500">
              <span class="text-gray-400">{{ formatDate(l.date_execution) }}</span>
              — {{ l.title || tHub('hub.ui.project_detail.automation_ran', 'Automation exécutée') }}
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'hub', middleware: 'crm-auth', ssr: false })
const { t: tHub } = useHubT()

const route        = useRoute()
const projectId    = computed(() => Number(route.params.id))

const project       = ref<any>(null)
const tasks         = ref<any[]>([])
const documents     = ref<any[]>([])
const emails        = ref<any[]>([])
const logs          = ref<any[]>([])

const needsPricing  = ref<Record<number, number>>({})

const sendingCart    = ref(false)
const sendCartError  = ref<string | null>(null)
const sendCartSuccess = ref<string | null>(null)

const cartEmailBody       = ref<string>('')
const cartEmailBodySaved  = ref(false)
const loadingProject = ref(true)
const loadError      = ref<string | null>(null)
const editingInfo   = ref(false)
const showAddTask   = ref(false)
const newTaskTitle  = ref('')
const showSendEmail = ref(false)
const sendingEmail  = ref(false)

const infoForm = ref<any>({})
const emailForm = ref({ subject: '', body: '' })

const STATUSES = computed<Record<string, string>>(() => ({
  perdu_standby: tHub('hub.ui.project_detail.st_lost', 'Perdu / Standby'),
  lead_entrant: tHub('hub.ui.project_detail.st_lead', 'Lead entrant'),
  qualification: tHub('hub.ui.project_detail.st_qualif', 'Qualification'),
  devis_envoye: tHub('hub.ui.project_detail.st_quote_sent', 'Devis envoyé'),
  devis_accepte: tHub('hub.ui.project_detail.st_quote_ok', 'Devis accepté'),
  en_cours: tHub('hub.ui.project_detail.st_ongoing', 'En cours'),
  livraison: tHub('hub.ui.project_detail.st_delivery', 'Livraison'),
  facture: tHub('hub.ui.project_detail.st_invoiced', 'Facturé'),
  gagne: tHub('hub.ui.project_detail.st_won', 'Gagné'),
}))

const PROJECT_TYPES = computed<Record<string, string>>(() => ({
  site_web: tHub('hub.ui.project_detail.pt_site', 'Site PS complet'),
  module_ps: tHub('hub.ui.project_detail.pt_module', 'Module PS sur-mesure'),
  integration: tHub('hub.ui.project_detail.pt_integration', 'Intégration'),
  migration: tHub('hub.ui.project_detail.pt_migration', 'Migration'),
  headless: tHub('hub.ui.project_detail.pt_headless', 'Headless'),
  seo: tHub('hub.ui.project_detail.pt_seo', 'SEO'),
  audit: tHub('hub.ui.project_detail.pt_audit', 'Audit'),
  formation: tHub('hub.ui.project_detail.pt_training', 'Formation'),
  maintenance: tHub('hub.ui.project_detail.pt_maintenance', 'TMA'),
  conseil: tHub('hub.ui.project_detail.pt_consulting', 'Conseil'),
  autre: tHub('hub.ui.project_detail.pt_other', 'Autre'),
}))

const BUDGETS: Record<string, string> = {
  moins_1k: '< 1 000 €', '1k_3k': '1 000–3 000 €', '3k_8k': '3 000–8 000 €',
  '8k_20k': '8 000–20 000 €', '20k_60k': '20 000–60 000 €', '60k_plus': '> 60 000 €',
}

const LEAD_SOURCE_LABEL = computed<Record<string, string>>(() => ({
  demande_devis: tHub('hub.ui.project_detail.ls_quote', 'Demande de devis'),
  rdv: tHub('hub.ui.project_detail.ls_meeting', 'Rendez-vous'),
  contact: tHub('hub.ui.project_detail.ls_contact', 'Formulaire contact'),
  newsletter: tHub('hub.ui.project_detail.ls_newsletter', 'Newsletter'),
  chatbot: tHub('hub.ui.project_detail.ls_chatbot', 'Chatbot'),
  whatsapp: tHub('hub.ui.project_detail.ls_whatsapp', 'WhatsApp'),
  smartlead: tHub('hub.ui.project_detail.ls_prospecting', 'Prospection'),
  import: tHub('hub.ui.project_detail.ls_import', 'Import'),
}))
const LEAD_INTENT_LABEL = computed<Record<string, string>>(() => ({
  achat_grossiste: tHub('hub.ui.project_detail.li_wholesale', 'Achat grossiste'),
  achat_retail: tHub('hub.ui.project_detail.li_retail', 'Achat détail'),
  prestation: tHub('hub.ui.project_detail.li_service', 'Prestation'),
  information: tHub('hub.ui.project_detail.li_info', 'Information'),
  partenariat: tHub('hub.ui.project_detail.li_partnership', 'Partenariat'),
}))

interface RequestedProduct { id?: number; name: string; reference?: string; quantity: number }
function parseNeedsJson(raw: unknown): { items: any[]; message: string } | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return { items: parsed, message: '' }
    if (parsed && Array.isArray(parsed.items)) {
      return { items: parsed.items, message: typeof parsed.message === 'string' ? parsed.message : '' }
    }
    return null
  } catch { return null }
}
const requestedProducts = computed<RequestedProduct[]>(() => {
  const decoded = parseNeedsJson(project.value?.needs)
  if (!decoded) return []
  return decoded.items
    .filter((p) => p && (p.name || p.id))
    .map((p) => ({
      id:        typeof p.id === 'number' ? p.id : undefined,
      name:      String(p.name ?? tHub('hub.ui.project_detail.product_n', 'Produit #{id}', { id: p.id ?? '?' })),
      reference: p.reference ? String(p.reference) : undefined,
      quantity:  Number(p.quantity ?? 1),
    }))
})
const requestedMessage = computed<string>(() => parseNeedsJson(project.value?.needs)?.message || '')
const requestedTotalQty = computed<number>(() =>
  requestedProducts.value.reduce((s, p) => s + (Number.isFinite(p.quantity) ? p.quantity : 0), 0),
)
function lineTotalHt(p: RequestedProduct): number {
  if (!p.id) return 0
  const unit = needsPricing.value[p.id]
  if (!Number.isFinite(unit)) return 0
  return unit * (Number.isFinite(p.quantity) ? p.quantity : 0)
}
const requestedTotalHt = computed<number>(() =>
  requestedProducts.value.reduce((s, p) => s + lineTotalHt(p), 0),
)

interface CarrierPolicy { idCarrier: number; name: string; freeFromHt: number; flatCostBelowHt: number }
const purchaseMinimumHt = ref<number>(0)
const carriers = ref<CarrierPolicy[]>([])
const allowMagicLinkUnderMin = ref<boolean>(false)
const primaryCarrier = computed<CarrierPolicy | null>(() => carriers.value[0] ?? null)

const cartBlockedUnderMin = computed<boolean>(() =>
  purchaseMinimumHt.value > 0
  && requestedTotalHt.value > 0
  && requestedTotalHt.value < purchaseMinimumHt.value
  && !allowMagicLinkUnderMin.value,
)
async function loadSalesPolicy() {
  try {
    const r = await $fetch<{ purchaseMinimumHt: number; carriers: CarrierPolicy[]; allowMagicLinkUnderMin: boolean }>('/api/hub/configuration/sales-policy')
    purchaseMinimumHt.value = Number(r?.purchaseMinimumHt || 0)
    carriers.value = r?.carriers || []
    allowMagicLinkUnderMin.value = Boolean(r?.allowMagicLinkUnderMin)
  } catch { purchaseMinimumHt.value = 0; carriers.value = []; allowMagicLinkUnderMin.value = false }
}
onMounted(loadSalesPolicy)

const STATUS_BADGE: Record<string, string> = {
  perdu_standby: 'bg-gray-100 dark:bg-slate-800 text-gray-500',
  lead_entrant:  'bg-stage-lead-100 text-stage-lead-600',
  qualification: 'bg-stage-qualify-100 text-stage-qualify-600',
  devis_envoye:  'bg-stage-quoted-100 text-stage-quoted-700',
  devis_accepte: 'bg-stage-accepted-100 text-stage-accepted-600',
  en_cours:      'bg-stage-active-100 text-stage-active-600',
  livraison:     'bg-stage-delivery-100 text-stage-delivery-600',
  facture:       'bg-stage-invoiced-100 text-stage-invoiced-600',
  gagne:         'bg-stage-won-100 text-stage-won-600',
}

const statusBadge = (s: string) => STATUS_BADGE[s] || 'bg-gray-100 dark:bg-slate-800 text-gray-500'
const formatPrice = (v: any) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))

const formatPriceHt = (v: any) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))
const formatDate  = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const formatDateTime = (d: string) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

const loadAll = async () => {
  loadingProject.value = true
  loadError.value = null
  try {
    
    
    
    
    const [pRes, tRes, dRes, eRes, lRes] = await Promise.allSettled([
      $fetch<{ project: any }>(`/api/bo/smartproject/projects/${projectId.value}`),
      $fetch<{ tasks: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/tasks`),
      $fetch<{ documents: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/documents`),
      $fetch<{ emails: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/mails`),
      $fetch<{ logs: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/logs`),
    ])

    if (pRes.status === 'fulfilled') {
      project.value = pRes.value.project || null
    } else {
      console.error('[projects/[id]] project load KO:', pRes.reason)
      loadError.value = tHub('hub.ui.project_detail.project_not_found', 'Projet introuvable : {reason}', { reason: pRes.reason?.data?.statusMessage || pRes.reason?.message || tHub('hub.ui.project_detail.db_error', 'erreur DB') })
    }

    tasks.value     = tRes.status === 'fulfilled' ? (tRes.value.tasks     || []) : []
    documents.value = dRes.status === 'fulfilled' ? (dRes.value.documents || []) : []
    emails.value    = eRes.status === 'fulfilled' ? (eRes.value.emails    || []) : []
    logs.value      = lRes.status === 'fulfilled' ? (lRes.value.logs      || []) : []

    
    
    
    const subErrors = [
      tRes.status === 'rejected' ? tHub('hub.ui.project_detail.sub_tasks', 'tâches') : null,
      dRes.status === 'rejected' ? tHub('hub.ui.project_detail.sub_documents', 'documents') : null,
      eRes.status === 'rejected' ? tHub('hub.ui.project_detail.sub_emails', 'emails') : null,
      lRes.status === 'rejected' ? tHub('hub.ui.project_detail.sub_logs', 'logs') : null,
    ].filter(Boolean) as string[]
    if (subErrors.length && project.value) {
      loadError.value = tHub('hub.ui.project_detail.sub_unavailable', 'Sous-ressources indisponibles : {list}. Le projet est consultable mais la barre latérale est partielle.', { list: subErrors.join(', ') })
      ;[tRes, dRes, eRes, lRes].forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[projects/[id]] sub-resource ${i} KO:`, r.reason)
      })
    }

    if (project.value) {
      infoForm.value = {
        project_status: project.value.project_status,
        project_type:   project.value.project_type,
        budget:         project.value.budget,
        final_price:    project.value.final_price,
        needs:          project.value.needs,
      }
      cartEmailBody.value = project.value.cart_email_custom_body || ''
      
      
      
      $fetch<{ pricing: Record<string, number> }>(
        `/api/bo/smartproject/projects/${projectId.value}/needs-pricing`,
      ).then((r) => {
        const out: Record<number, number> = {}
        for (const [k, v] of Object.entries(r.pricing || {})) out[Number(k)] = Number(v)
        needsPricing.value = out
      }).catch((err) => {
        console.warn('[projects/[id]] needs-pricing KO:', err?.message)
      })
    }
  } catch (err: any) {
    console.error('[projects/[id]] loadAll fatal:', err)
    loadError.value = err?.data?.statusMessage || err?.message || tHub('hub.ui.project_detail.err_unknown', 'Erreur inconnue lors du chargement')
  } finally {
    loadingProject.value = false
  }
}

const onSaveCartEmailBody = async () => {
  
  const value = (cartEmailBody.value || '').trim()
  if ((project.value?.cart_email_custom_body || '') === value) return 
  cartEmailBodySaved.value = false
  try {
    await $fetch(`/api/bo/smartproject/projects/${projectId.value}`, {
      method: 'PUT',
      body: { project: { cart_email_custom_body: value || null } },
    })
    if (project.value) project.value.cart_email_custom_body = value || null
    cartEmailBodySaved.value = true
    setTimeout(() => { cartEmailBodySaved.value = false }, 2000)
  } catch (err: any) {
    console.error('[projects/[id]] save cart_email_custom_body KO:', err?.message)
  }
}

const onSendCart = async () => {
  if (sendingCart.value) return
  if (project.value?.cart_sent_at) {
    if (!confirm(tHub('hub.ui.project_detail.confirm_resend', 'Renvoyer un nouveau panier ?\nL\'ancien lien sera révoqué.'))) return
  }
  sendingCart.value     = true
  sendCartError.value   = null
  sendCartSuccess.value = null
  try {
    const r = await $fetch<{
      ok: boolean; cartId: number; isNewAccount: boolean;
      sentTo: string; sentAt: string; nbProducts: number; totalQty: number
    }>(`/api/bo/smartproject/projects/${projectId.value}/send-cart`, { method: 'POST' })
    sendCartSuccess.value = r.isNewAccount ? tHub('hub.ui.project_detail.cart_sent_ok_new', 'Panier envoyé à {to} (cart #{id}) — compte créé.', { to: r.sentTo, id: r.cartId }) : tHub('hub.ui.project_detail.cart_sent_ok', 'Panier envoyé à {to} (cart #{id}).', { to: r.sentTo, id: r.cartId })
    
    if (project.value) {
      project.value = { ...project.value, cart_sent_at: r.sentAt, cart_id_cart: r.cartId, cart_consumed_at: null }
    }
    
    $fetch<{ project: any }>(`/api/bo/smartproject/projects/${projectId.value}`)
      .then((p) => { if (p.project) project.value = p.project })
      .catch(() => {  })
  } catch (err: any) {
    sendCartError.value = err?.data?.statusMessage || err?.message || tHub('hub.ui.project_detail.err_send_cart', 'Erreur lors de l\'envoi du panier')
  } finally {
    sendingCart.value = false
  }
}

const saveInfo = async () => {
  await $fetch(`/api/bo/smartproject/projects/${projectId.value}`, {
    method: 'PUT',
    body: { project: { ...infoForm.value } },
  })
  project.value = { ...project.value, ...infoForm.value }
  editingInfo.value = false
}

const addTask = async () => {
  if (!newTaskTitle.value.trim()) return
  const data = await $fetch<{ success: boolean; inserted: number }>(
    `/api/bo/smartproject/projects/${projectId.value}/tasks`,
    {
      method: 'POST',
      body: {
        tasks: [
          { name: newTaskTitle.value, status: 'todo' },
        ],
      },
    },
  )
  if (data.success && data.inserted > 0) {
    
    const refresh = await $fetch<{ tasks: any[] }>(
      `/api/bo/smartproject/projects/${projectId.value}/tasks`,
    )
    tasks.value = refresh.tasks || []
    newTaskTitle.value = ''
    showAddTask.value = false
  }
}

const toggleTask = async (t: any) => {
  const newStatus = t.task_status === 'done' ? 'todo' : 'done'
  t.task_status = newStatus
  await $fetch(`/api/bo/smartproject/tasks/${t.id_ac_smarttask}`, {
    method: 'PUT',
    body: { task_status: newStatus },
  })
}

const deleteTask = async (id: number) => {
  await $fetch(`/api/bo/smartproject/tasks/${id}`, { method: 'DELETE' })
  tasks.value = tasks.value.filter(t => t.id_ac_smarttask !== id)
}

const sendEmail = async () => {
  sendingEmail.value = true
  try {
    await $fetch(`/api/bo/smartproject/projects/${projectId.value}/email`, {
      method: 'POST',
      body: {
        subject: emailForm.value.subject,
        body:    emailForm.value.body,
      },
    })
    emailForm.value = { subject: '', body: '' }
    showSendEmail.value = false
    const eData = await $fetch<{ emails: any[] }>(`/api/bo/smartproject/projects/${projectId.value}/mails`)
    emails.value = eData.emails || []
  } finally {
    sendingEmail.value = false
  }
}

const uploadDocument = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  fd.append('title', file.name)
  const data = await $fetch<{ success: boolean; document?: any }>(
    `/api/bo/smartproject/projects/${projectId.value}/documents`,
    { method: 'POST', body: fd },
  )
  if (data.success && data.document) {
    documents.value.push(data.document)
  }
}

const deleteDocument = async (id: number) => {
  await $fetch(`/api/bo/smartproject/documents/${id}`, { method: 'DELETE' })
  documents.value = documents.value.filter(d => d.id_ac_document !== id)
}

onMounted(loadAll)
</script>

<style scoped>
.input-field { @apply w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300; }
.label { @apply block text-xs font-medium text-gray-600 mb-1; }
.btn-primary { @apply bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50; }
</style>
