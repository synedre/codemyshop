
<script setup lang="ts">
import { isAccountProfileHub } from '~/utils/account-nav-entries'

definePageMeta({
  layout: false,
  ssr: false,
  
  
  
  middleware: [
    (to) => {
      if (!isAccountProfileHub(useRuntimeConfig().public as any)) return
      return navigateTo(to.path.replace(/\/+$/, '').replace(/[^/]+$/, 'profil'), { replace: true })
    },
  ],
})

const { t } = useHubT()
const brandName = String((useRuntimeConfig().public as any).brandName ?? '')
const { isSidebarAccount } = useAccountLayout()
const book = ref<{ showForm: boolean, openForm: () => void } | null>(null)

useHead({ title: brandName ? `${t('account.addresses_head_title', 'Mes adresses')} — ${brandName}` : t('account.addresses_head_title', 'Mes adresses') })
</script>

<template>
  <NuxtLayout name="white-label">
    <AccountShell
      :title="isSidebarAccount
        ? t('account.addresses_delivery_title', 'Vos adresses de livraison')
        : t('account.addresses_title', 'Mes adresses')"
      legacy-width="max-w-3xl"
    >
      <template v-if="!isSidebarAccount" #actions>
        <button v-if="!book?.showForm" class="text-sm text-primary-600 hover:underline" @click="book?.openForm()">+ {{ t('account.addresses_add', 'Ajouter une adresse') }}</button>
      </template>

      <AccountAddressBook ref="book" />
    </AccountShell>
  </NuxtLayout>
</template>
