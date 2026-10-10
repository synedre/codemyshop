

const PS_FLAGS_FAILSAFE: Record<string, string> = {
  PS_GUEST_CHECKOUT_ENABLED: '1',
  PS_PWA_INSTALL_BANNER: '1',
}

export default defineNuxtPlugin(async () => {
  let flags: Record<string, string> | null = null
  for (let attempt = 0; attempt < 2 && flags === null; attempt++) {
    try {
      const res = await $fetch<{ flags: Record<string, string> }>('/api/configuration/flags-public')
      flags = res?.flags ?? null
    } catch {
      
    }
  }
  useState('ps_flags', () => flags ?? PS_FLAGS_FAILSAFE)
})
