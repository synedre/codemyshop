
<script setup lang="ts">
import type { CustomerData } from '~/server/connectors/base'

definePageMeta({ layout: false, ssr: false })
const { localePath } = useLocalePath()

const { t } = useHubT()
const _cfg = useRuntimeConfig()
const brandName = String((_cfg.public as any).brandName ?? '')
const { customer, checkSession } = useCustomerAuth()
const { isB2b } = useB2bVisibility()
const { isSidebarAccount, isProfileHub } = useAccountLayout()

const profile = ref<CustomerData | null>(null)
const loading = ref(true)
const saving = ref(false)
const savedMsg = ref('')

const form = reactive({ firstname: '', lastname: '', company: '', siret: '', email: '', birthday: '' })
const pwForm = reactive({ newPassword: '', confirmPassword: '' })
const pwError = ref('')
const pwSuccess = ref('')
const pwSaving = ref(false)

const editingBlock = ref<'details' | 'email' | 'password' | null>(null)

function openBlock(block: 'details' | 'email' | 'password') {
  
  
  if (profile.value) {
    form.firstname = profile.value.firstname
    form.lastname = profile.value.lastname
    form.email = profile.value.email
    form.birthday = profile.value.birthday || ''
  }
  Object.assign(pwForm, { newPassword: '', confirmPassword: '' })
  pwError.value = ''
  editingBlock.value = block
}

const formattedBirthday = computed(() => {
  const value = profile.value?.birthday
  if (!value) return ''
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { timeZone: 'UTC' })
})

async function loadProfile() {
  if (!customer.value) {
    await checkSession()
    if (!customer.value) return navigateTo(localePath('/connexion'))
  }
  loading.value = true
  try {
    profile.value = await $fetch<CustomerData>('/api/catalogue/customer/profile', {
      query: { customerId: customer.value!.customerId },
    })
    form.firstname = profile.value.firstname
    form.lastname = profile.value.lastname
    form.company = profile.value.company || ''
    form.siret = profile.value.siret || ''
    form.email = profile.value.email
    form.birthday = profile.value.birthday || ''
  } catch {  }
  finally { loading.value = false }
}

async function onSaveProfile() {
  if (!customer.value) return
  saving.value = true
  savedMsg.value = ''
  try {
    const updated = await $fetch<CustomerData>('/api/catalogue/customer/profile', {
      method: 'PUT',
      body: { customerId: customer.value.customerId, ...form },
    })
    
    
    if (profile.value) profile.value = { ...profile.value, ...updated }
    editingBlock.value = null
    savedMsg.value = t('account.profile_saved', 'Modifications enregistrées.')
    setTimeout(() => { savedMsg.value = '' }, 3000)
  } catch { savedMsg.value = t('account.profile_save_error', 'L\'enregistrement a échoué.') }
  finally { saving.value = false }
}

async function onChangePassword() {
  pwError.value = ''
  pwSuccess.value = ''

  if (pwForm.newPassword !== pwForm.confirmPassword) {
    pwError.value = t('account.profile_password_mismatch', 'Les deux mots de passe ne correspondent pas.')
    return
  }
  if (pwForm.newPassword.length < 8) {
    pwError.value = t('account.profile_password_min_length', 'Le mot de passe doit faire au moins 8 caractères.')
    return
  }

  pwSaving.value = true
  try {
    await $fetch('/api/catalogue/customer/password', {
      method: 'PUT',
      body: { newPassword: pwForm.newPassword },
    })
    pwSuccess.value = t('account.profile_password_changed', 'Mot de passe modifié.')
    Object.assign(pwForm, { newPassword: '', confirmPassword: '' })
    setTimeout(() => { pwSuccess.value = '' }, 3000)
  } catch (err: any) {
    pwError.value = err?.data?.message || t('account.profile_password_error', 'Le changement a échoué.')
  } finally { pwSaving.value = false }
}

onMounted(loadProfile)
useHead({ title: brandName ? `${t('account.profile_head_title', 'Mon profil')} — ${brandName}` : t('account.profile_head_title', 'Mon profil') })
</script>

<template>
  <NuxtLayout name="white-label">
    <AccountShell
      :title="isSidebarAccount
        ? t('account.profile_personal_details', 'Renseignements personnels')
        : t('account.profile_title', 'Mon profil')"
      legacy-width="max-w-2xl"
    >
      <div :class="isSidebarAccount ? 'max-w-2xl' : ''">

        <div v-if="loading" class="text-center py-12 text-gray-400 text-sm">{{ t('account.account_loading', 'Chargement…') }}</div>

        
        <div v-else-if="isSidebarAccount" class="space-y-12">

          
          <section>
            <h2 class="text-base text-gray-900 mb-4">{{ t('account.profile_details', 'Détails') }}</h2>
            <template v-if="editingBlock !== 'details'">
              <p class="text-sm text-gray-700">{{ profile?.firstname }} {{ profile?.lastname }}</p>
              <p v-if="formattedBirthday" class="text-sm text-gray-700 mt-2">
                {{ t('account.profile_label_birthday', 'Date de naissance') }}: {{ formattedBirthday }}
              </p>
              <button type="button" class="mt-4 px-4 py-2 text-sm border border-gray-300 rounded hover:border-gray-900 transition-colors" @click="openBlock('details')">
                {{ t('account.profile_edit', 'Modifier') }}
              </button>
            </template>
            <form v-else class="space-y-4" @submit.prevent="onSaveProfile">
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_firstname', 'Prénom') }}</label>
                  <input v-model="form.firstname" type="text" required class="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:border-gray-900 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_lastname', 'Nom') }}</label>
                  <input v-model="form.lastname" type="text" required class="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:border-gray-900 focus:outline-none" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_birthday', 'Date de naissance') }}</label>
                <input v-model="form.birthday" type="date" class="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:border-gray-900 focus:outline-none" />
              </div>
              <div v-if="isB2b" class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_company', 'Société') }}</label>
                  <input v-model="form.company" type="text" class="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:border-gray-900 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">SIRET</label>
                  <input v-model="form.siret" type="text" class="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:border-gray-900 focus:outline-none" />
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button type="submit" :disabled="saving" class="py-2 px-5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm rounded transition-colors">
                  {{ saving ? t('account.profile_saving', 'Enregistrement…') : t('account.profile_save', 'Enregistrer') }}
                </button>
                <button type="button" class="text-sm text-gray-500 hover:text-gray-900" @click="editingBlock = null">
                  {{ t('common.cancel', 'Annuler') }}
                </button>
                <span v-if="savedMsg" class="text-sm text-primary-600">{{ savedMsg }}</span>
              </div>
            </form>
          </section>

          
          <section>
            <h2 class="text-base text-gray-900 mb-4">{{ t('account.profile_login_email', 'Courriel de connexion') }}</h2>
            <template v-if="editingBlock !== 'email'">
              <p class="text-sm text-gray-700">{{ profile?.email }}</p>
              <button type="button" class="mt-4 px-4 py-2 text-sm border border-gray-300 rounded hover:border-gray-900 transition-colors" @click="openBlock('email')">
                {{ t('account.profile_edit', 'Modifier') }}
              </button>
            </template>
            <form v-else class="space-y-4" @submit.prevent="onSaveProfile">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_email', 'Adresse mail') }}</label>
                <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:border-gray-900 focus:outline-none" />
              </div>
              <div class="flex items-center gap-3">
                <button type="submit" :disabled="saving" class="py-2 px-5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm rounded transition-colors">
                  {{ saving ? t('account.profile_saving', 'Enregistrement…') : t('account.profile_save', 'Enregistrer') }}
                </button>
                <button type="button" class="text-sm text-gray-500 hover:text-gray-900" @click="editingBlock = null">
                  {{ t('common.cancel', 'Annuler') }}
                </button>
              </div>
            </form>
          </section>

          
          <section>
            <h2 class="text-base text-gray-900 mb-4">{{ t('account.profile_change_password', 'Mot de passe') }}</h2>
            <template v-if="editingBlock !== 'password'">
              <p class="text-sm text-gray-700 tracking-widest">••••••••••••</p>
              <button type="button" class="mt-4 px-4 py-2 text-sm border border-gray-300 rounded hover:border-gray-900 transition-colors" @click="openBlock('password')">
                {{ t('account.profile_edit', 'Modifier') }}
              </button>
            </template>
            <form v-else class="space-y-4" @submit.prevent="onChangePassword">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_new_password', 'Nouveau mot de passe') }}</label>
                <input v-model="pwForm.newPassword" type="password" required minlength="8" class="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:border-gray-900 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_confirm_new_password', 'Confirmer le nouveau mot de passe') }}</label>
                <input v-model="pwForm.confirmPassword" type="password" required class="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:border-gray-900 focus:outline-none" />
              </div>
              <p v-if="pwError" class="text-red-500 text-xs">{{ pwError }}</p>
              <p v-if="pwSuccess" class="text-primary-600 text-xs">{{ pwSuccess }}</p>
              <div class="flex items-center gap-3">
                <button type="submit" :disabled="pwSaving" class="py-2 px-5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm rounded transition-colors">
                  {{ pwSaving ? t('account.profile_password_changing', 'Changement…') : t('account.profile_password_button', 'Changer le mot de passe') }}
                </button>
                <button type="button" class="text-sm text-gray-500 hover:text-gray-900" @click="editingBlock = null">
                  {{ t('common.cancel', 'Annuler') }}
                </button>
              </div>
            </form>
          </section>

          
          <template v-if="isProfileHub">
            <section>
              <h2 class="text-base text-gray-900 mb-4">{{ t('account.addresses_delivery_title', 'Vos adresses de livraison') }}</h2>
              <AccountAddressBook embedded />
            </section>

            <section>
              <h2 class="text-base text-gray-900 mb-4">{{ t('account.payment_title', 'Vos méthodes de paiement') }}</h2>
              <p class="text-sm text-gray-700">
                {{ t('account.payment_intro', 'Indiquez une méthode de paiement préférentielle pour accélérer le paiement.') }}
              </p>
            </section>
          </template>
        </div>

        
        <div v-else class="space-y-8">
          
          <form class="bg-white rounded-xl p-6 border border-gray-100 space-y-4" @submit.prevent="onSaveProfile">
            <h2 class="text-sm font-bold text-gray-500">{{ t('account.profile_personal_info', 'Informations personnelles') }}</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_firstname', 'Prénom') }}</label>
                <input v-model="form.firstname" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_lastname', 'Nom') }}</label>
                <input v-model="form.lastname" type="text" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_email', 'Adresse mail') }}</label>
              <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div v-if="isB2b" class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_label_company', 'Société') }}</label>
                <input v-model="form.company" type="text" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">SIRET</label>
                <input v-model="form.siret" type="text" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button type="submit" :disabled="saving" class="py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
                {{ saving ? t('account.profile_saving', 'Enregistrement…') : t('account.profile_save', 'Enregistrer') }}
              </button>
              <span v-if="savedMsg" class="text-sm text-primary-600">{{ savedMsg }}</span>
            </div>
          </form>

          
          <form class="bg-white rounded-xl p-6 border border-gray-100 space-y-4" @submit.prevent="onChangePassword">
            <h2 class="text-sm font-bold text-gray-500">{{ t('account.profile_change_password', 'Mot de passe') }}</h2>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_new_password', 'Nouveau mot de passe') }}</label>
              <input v-model="pwForm.newPassword" type="password" required minlength="8" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">{{ t('account.profile_confirm_new_password', 'Confirmer le nouveau mot de passe') }}</label>
              <input v-model="pwForm.confirmPassword" type="password" required class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
            </div>
            <p v-if="pwError" class="text-red-500 text-xs">{{ pwError }}</p>
            <p v-if="pwSuccess" class="text-primary-600 text-xs">{{ pwSuccess }}</p>
            <button type="submit" :disabled="pwSaving" class="py-3 px-6 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-colors">
              {{ pwSaving ? t('account.profile_password_changing', 'Changement…') : t('account.profile_password_button', 'Changer le mot de passe') }}
            </button>
          </form>
        </div>
      </div>
    </AccountShell>
  </NuxtLayout>
</template>
