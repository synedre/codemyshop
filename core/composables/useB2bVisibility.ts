

import { computed } from 'vue'

export type CommerceMode = 'b2c' | 'b2b' | 'dual'

export function useB2bVisibility() {
  const { public: publicCfg } = useRuntimeConfig()
  const customerAuth = useCustomerAuth()
  const psFlags = useState<Record<string, string>>('ps_flags', () => ({}))

  const commerceMode = computed<CommerceMode>(() => {
    const rawMode = psFlags.value?.CMS_COMMERCE_MODE?.trim()?.toLowerCase()
    if (rawMode === 'dual' || rawMode === 'b2b' || rawMode === 'b2c') {
      return rawMode as CommerceMode
    }
    const dbFlag = psFlags.value?.PS_B2B_ENABLE
    if (dbFlag === '1') return 'b2b'
    if (dbFlag === '0') return 'b2c'
    
    if ((publicCfg as any).commerceMode && ['b2c', 'b2b', 'dual'].includes((publicCfg as any).commerceMode)) {
      return (publicCfg as any).commerceMode as CommerceMode
    }
    return publicCfg.b2bMode === true ? 'b2b' : 'b2c'
  })

  
  
  const isB2b = computed(() => {
    if (commerceMode.value === 'dual') {
      
      
      return customerAuth.loggedIn.value && !!(customerAuth as any).customer?.value?.company
    }
    return commerceMode.value === 'b2b'
  })

  const isDual = computed(() => commerceMode.value === 'dual')
  const isStrictB2b = computed(() => commerceMode.value === 'b2b')
  const isCatalogMode = computed(() => psFlags.value?.PS_CATALOG_MODE === '1')

  
  
  const showPrices = computed(() => {
    if (commerceMode.value === 'dual' || commerceMode.value === 'b2c') return true
    return customerAuth.loggedIn.value
  })

  return {
    showPrices,
    isB2b,
    isDual,
    isStrictB2b,
    commerceMode,
    isCatalogMode,
    loggedIn: customerAuth.loggedIn,
  }
}

