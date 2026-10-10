

import { getCurrentInstance, onMounted } from 'vue'
import type { CartData, CartItemData } from '~/server/connectors/base'
import { corpsAjoutServeur, lireCleLigne, cleLigneServeur, personnalisationLigneServeur } from '~/utils/cart-line-layout'
import { useT } from './useT'
import { remiseAttenteHT, type RemiseEnAttente } from '~/utils/cart-totals'

export interface LocalCartItem {
  id: number
  

  combinationId?: number
  name: string
  price: string
  priceRaw: number
  quantity: number
  image?: string
  ref?: string
  

  variantLabel?: string
  

  variantAttributes?: Array<{ group: string; value: string }>
  
  
  
  format?: string
  packaging?: string
  caliber?: string
  pricePerKgFormatted?: string
  taxRate?: number
  
  priceFormattedBeforeDiscount?: string
  pricePerKgFormattedBeforeDiscount?: string
  reductionLabel?: string
  
  unitLabel?: string
  

  customization?: {
    text: string
    
    colorHex: string
    colorLabel?: string
    fee: number
    
    label?: string
    
    kind?: 'textile' | 'racket'
  }
}

function cartLineKey(item: { id: number; combinationId?: number; customization?: { text: string; colorHex: string } }): string {
  const c = item.customization
  
  
  
  
  const base = item.combinationId ? `${item.id}#${item.combinationId}` : String(item.id)
  return c ? `${base}::${c.text}|${c.colorHex}` : base
}

const reprisesEnCours = new Map<string, Promise<void>>()

export function useServerCart(clientId?: string) {
  const resolvedClientId = clientId || useRuntimeConfig().public.clientId as string || 'default'
  const cartStorageKey = `${resolvedClientId}-cart`

  const cart = useState<CartData | null>('server-cart', () => null)
  const localCart = useState<LocalCartItem[]>('local-cart', () => [])
  const cartLoading = useState<boolean>('cart-loading', () => false)
  const cartId = useState<number | null>('cart-id', () => null)
  

  const promoEnAttente = useState<RemiseEnAttente | null>('promo-attente', () => null)
  
  const promoAttenteErreur = useState<string | null>('promo-attente-erreur', () => null)

  

  const cartHydrated = useState<boolean>('cart-hydrated', () => false)
  

  const cartError = useState<string | null>('cart-error', () => null)
  if (import.meta.client) {
    
    
    
    if (getCurrentInstance()) onMounted(() => { cartHydrated.value = true })
    else cartHydrated.value = true
  }

  
  if (import.meta.client) {
    const saved = localStorage.getItem(cartStorageKey)
    if (saved && !localCart.value.length) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) localCart.value = parsed.filter((i: any) => i.id && typeof i.priceRaw === 'number')
      } catch {  }
    }
    watch(localCart, (val) => {
      localStorage.setItem(cartStorageKey, JSON.stringify(val))
    }, { deep: true })
    const promoKey = `${cartStorageKey}:promo`
    const promoSaved = localStorage.getItem(promoKey)
    if (promoSaved && !promoEnAttente.value) {
      try {
        const parsed = JSON.parse(promoSaved)
        if (parsed && typeof parsed.code === 'string') promoEnAttente.value = parsed
      } catch {  }
    }
    watch(promoEnAttente, (val) => {
      if (val) localStorage.setItem(promoKey, JSON.stringify(val))
      else localStorage.removeItem(promoKey)
    })
  }

  const isServerMode = computed(() => !!cart.value && !!cartId.value)

  const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
  const { t } = useT()

  const items = computed(() => {
    if (isServerMode.value && cart.value) {
      
      const cordageLabel = t('product.racket_config_line', 'Cordage')
      return cart.value.items.map(i => ({
        id: i.productId,
        
        
        
        
        
        lineKey: cleLigneServeur(i),
        
        
        customization: personnalisationLigneServeur(i.customization, cordageLabel) as LocalCartItem['customization'],
        name: i.name,
        price: fmtEur(i.priceHT),
        priceRaw: i.priceHT,
        
        
        
        priceTTCRaw: i.priceTTC,
        priceTTCBeforeDiscountRaw: i.priceHTBeforeDiscount !== undefined && i.priceHT > 0
          ? Math.round(i.priceHTBeforeDiscount * (i.priceTTC / i.priceHT) * 100) / 100
          : undefined,
        quantity: i.quantity,
        image: i.image,
        ref: i.reference,
        combinationId: i.combinationId,
        format: i.format,
        packaging: i.packaging,
        caliber: i.caliber,
        pricePerKgFormatted: i.pricePerKgFormatted,
        taxRate: i.taxRate,
        priceFormattedBeforeDiscount: i.priceHTBeforeDiscount !== undefined
          ? fmtEur(i.priceHTBeforeDiscount)
          : undefined,
        pricePerKgFormattedBeforeDiscount: i.pricePerKgFormattedBeforeDiscount,
        reductionLabel: i.reductionLabel,
        unitLabel: i.unitLabel,
        
        
        
        
        variantAttributes: i.variantAttributes,
      }))
    }
    return localCart.value.map(i => ({ ...i, lineKey: cartLineKey(i) }))
  })

  
  
  
  const subtotalHT = computed(() => {
    if (isServerMode.value && cart.value) return (cart.value as any).subtotalHT ?? cart.value.totalHT
    return localCart.value.reduce((sum, i) => sum + (i.priceRaw || 0) * i.quantity, 0)
  })

  const subtotalTTC = computed(() => {
    if (isServerMode.value && cart.value) return (cart.value as any).subtotalTTC ?? cart.value.totalTTC
    return subtotalHT.value * 1.20
  })

  const totalHT = computed(() => {
    if (isServerMode.value && cart.value) return cart.value.totalHT
    
    return subtotalHT.value - remiseAttenteHT(subtotalHT.value, promoEnAttente.value)
  })

  const totalTTC = computed(() => {
    if (isServerMode.value && cart.value) return cart.value.totalTTC
    return totalHT.value * 1.20 
  })

  const totalItems = computed(() => {
    return items.value.reduce((sum, i) => sum + i.quantity, 0)
  })

  const subtotalFormatted    = computed(() => fmtEur(subtotalHT.value))
  const subtotalTTCFormatted = computed(() => fmtEur(subtotalTTC.value))
  const totalFormatted       = computed(() => fmtEur(totalHT.value))
  const totalTTCFormatted    = computed(() => fmtEur(totalTTC.value))

  
  
  
  
  
  function initServerCart(customerId: number): Promise<void> {
    const cle = `${resolvedClientId}:${customerId}`
    const enCours = reprisesEnCours.get(cle)
    if (enCours) return enCours
    const reprise = reprendrePanier(customerId).finally(() => { reprisesEnCours.delete(cle) })
    reprisesEnCours.set(cle, reprise)
    return reprise
  }

  async function reprendrePanier(customerId: number) {
    cartLoading.value = true
    try {
      
      let serverCart = await $fetch<CartData | null>('/api/cart/last', {
        query: { customerId, clientId },
      })

      if (serverCart && serverCart.items.length > 0) {
        
        cart.value = serverCart
        cartId.value = serverCart.id
      } else {
        
        const data = await $fetch<CartData>('/api/cart/create', {
          method: 'POST',
          body: { customerId, clientId },
        })
        cart.value = data
        cartId.value = data.id
      }

      
      if (localCart.value.length && cartId.value) {
        for (const item of localCart.value) {
          await $fetch<CartData>('/api/cart/add', {
            method: 'POST',
            
            body: corpsAjoutServeur(item, cartId.value, clientId),
          })
        }
        
        const refreshed = await $fetch<CartData>('/api/cart', {
          query: { cartId: cartId.value, clientId },
        })
        cart.value = refreshed
      }

      
      
      const retenu = promoEnAttente.value
      if (retenu && cartId.value) {
        try {
          cart.value = await $fetch<CartData>('/api/cart/coupon', {
            method: 'POST',
            body: { cartId: cartId.value, code: retenu.code, clientId },
          })
          promoAttenteErreur.value = null
        } catch (err: any) {
          promoAttenteErreur.value = err?.data?.message || err?.message || 'Code promo refusé'
        } finally {
          promoEnAttente.value = null
        }
      }

      
      localCart.value = []
    } catch (err) {
      console.error('[useServerCart] initServerCart error:', err)
    } finally {
      cartLoading.value = false
    }
  }

  async function addToCart(
    product: {
      id: number; name: string; price: string; priceRaw: number;
      
      combinationId?: number;
      

      variantLabel?: string;
      
      variantAttributes?: Array<{ group: string; value: string }>;
      image?: string; ref?: string;
      format?: string; packaging?: string; caliber?: string;
      pricePerKgFormatted?: string; taxRate?: number;
      priceFormattedBeforeDiscount?: string;
      pricePerKgFormattedBeforeDiscount?: string;
      reductionLabel?: string;
      unitLabel?: string;
      
      customization?: { text: string; colorHex: string; colorLabel?: string; fee: number; label?: string };
    },
    qty = 1,
  ) {
    if (isServerMode.value && cartId.value) {
      cartLoading.value = true
      try {
        const data = await $fetch<CartData>('/api/cart/add', {
          method: 'POST',
          body: corpsAjoutServeur({ ...product, quantity: qty }, cartId.value, clientId),
        })
        cart.value = data
        cartError.value = null
      } catch (err: any) {
        cartError.value = err?.data?.message || null
        throw err
      } finally {
        cartLoading.value = false
      }
    } else {
      
      
      const key = cartLineKey({ id: product.id, combinationId: product.combinationId, customization: product.customization })
      const existing = localCart.value.find(i => cartLineKey(i) === key)
      if (existing) {
        existing.quantity += qty
      } else {
        localCart.value.push({ ...product, quantity: qty })
      }
    }
  }

  async function updateQuantity(idOrKey: number | string, qty: number) {
    if (isServerMode.value && cartId.value) {
      const { productId, combinationId, customizationId } = lireCleLigne(idOrKey)
      cartLoading.value = true
      try {
        const data = await $fetch<CartData>('/api/cart/update', {
          method: 'PUT',
          body: { cartId: cartId.value, productId, combinationId, customizationId, quantity: qty, clientId },
        })
        cart.value = data
        cartError.value = null
      } catch (err: any) {
        cartError.value = err?.data?.message || null
        throw err
      } finally {
        cartLoading.value = false
      }
    } else {
      
      const key = String(idOrKey)
      if (qty <= 0) {
        localCart.value = localCart.value.filter(i => cartLineKey(i) !== key)
      } else {
        const item = localCart.value.find(i => cartLineKey(i) === key)
        if (item) item.quantity = qty
      }
    }
  }

  async function removeFromCart(idOrKey: number | string) {
    if (isServerMode.value && cartId.value) {
      const { productId, combinationId, customizationId } = lireCleLigne(idOrKey)
      cartLoading.value = true
      try {
        await $fetch('/api/cart/remove', {
          method: 'DELETE',
          query: { cartId: cartId.value, productId, combinationId, customizationId, clientId },
        })
        
        const data = await $fetch<CartData>('/api/cart', {
          query: { cartId: cartId.value, clientId },
        })
        cart.value = data
      } finally {
        cartLoading.value = false
      }
    } else {
      const key = String(idOrKey)
      localCart.value = localCart.value.filter(i => cartLineKey(i) !== key)
    }
  }

  function clearCart() {
    cart.value = null
    cartId.value = null
    promoEnAttente.value = null
    localCart.value = []
    if (import.meta.client) {
      localStorage.removeItem(cartStorageKey)
    }
  }

  const discountCode = computed(() => (isServerMode.value
    ? cart.value?.discountCode ?? null
    : promoEnAttente.value?.code ?? null))
  const discountHT = computed(() => (isServerMode.value
    ? cart.value?.discountHT ?? 0
    : remiseAttenteHT(subtotalHT.value, promoEnAttente.value)))

  

  async function applyPromoCode(code: string, opts: { totalHT?: number } = {}) {
    if (!isServerMode.value || !cartId.value) {
      const apercu = await $fetch<{ code: string; reductionPercent: number; reductionAmountHT: number }>(
        '/api/cart/coupon-preview',
        { query: { code, clientId, ...(opts.totalHT !== undefined ? { totalHT: opts.totalHT } : {}) } },
      )
      promoEnAttente.value = { code: apercu.code, pct: apercu.reductionPercent, montantHT: apercu.reductionAmountHT }
      promoAttenteErreur.value = null
      return null
    }
    const data = await $fetch<any>('/api/cart/coupon', {
      method: 'POST',
      body: { cartId: cartId.value, code, clientId },
    })
    cart.value = data
    return data
  }

  async function removePromoCode() {
    if (!isServerMode.value || !cartId.value) {
      promoEnAttente.value = null
      return
    }
    const data = await $fetch<any>('/api/cart/coupon', {
      method: 'DELETE',
      body: { cartId: cartId.value, clientId },
    })
    cart.value = data
    return data
  }

  

  async function loadCartById(targetCartId: number, customerId: number) {
    cartLoading.value = true
    try {
      const data = await $fetch<CartData>('/api/cart', {
        query: { cartId: targetCartId, clientId },
      })
      if (data && data.customerId === customerId) {
        cart.value = data
        cartId.value = data.id
        
        
        
      } else {
        
        await initServerCart(customerId)
      }
    } catch (err) {
      console.error('[useServerCart] loadCartById error:', err)
      await initServerCart(customerId)
    } finally {
      cartLoading.value = false
    }
  }

  
  
  const appliedCorseTva = computed<boolean>(
    () => Boolean(isServerMode.value && cart.value && (cart.value as any).appliedCorseTva),
  )
  const deliveryPostcode = computed<string>(
    () => String((cart.value as any)?.deliveryPostcode || ''),
  )

  return {
    cart, items, cartId, cartLoading, cartHydrated, cartError,
    isServerMode,
    subtotalHT, subtotalTTC,
    totalHT, totalTTC, totalItems,
    subtotalFormatted, subtotalTTCFormatted,
    totalFormatted, totalTTCFormatted,
    discountCode, discountHT, promoEnAttente, promoAttenteErreur,
    appliedCorseTva, deliveryPostcode,
    addToCart, updateQuantity, removeFromCart, clearCart,
    initServerCart, loadCartById, applyPromoCode, removePromoCode,
  }
}
