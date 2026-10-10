

import type { AddressData, CarrierData, OrderData } from '~/server/connectors/base'
import { transporteurParDefaut } from '~/utils/checkout-page'

export type CheckoutStep = 'auth' | 'address' | 'shipping' | 'payment' | 'confirmation'

export function useCheckout(clientId?: string) {
  const step = useState<CheckoutStep>('checkout-step', () => 'auth')
  const loading = useState<boolean>('checkout-loading', () => false)
  const error = useState<string>('checkout-error', () => '')

  
  const addresses = useState<AddressData[]>('checkout-addresses', () => [])
  const selectedAddressId = useState<number | null>('checkout-address-id', () => null)
  
  
  
  
  const selectedInvoiceAddressId = useState<number | null>('checkout-invoice-address-id', () => null)
  
  
  
  const useDifferentInvoiceAddress = useState<boolean>('checkout-use-different-invoice', () => false)
  const carriers = useState<CarrierData[]>('checkout-carriers', () => [])
  
  
  const { activeLang } = useRouteLang()
  const selectedCarrierId = useState<number | null>('checkout-carrier-id', () => null)

  
  
  
  const vatIntracom = useState<string>('checkout-vat-intracom', () => '')
  const vatValid    = useState<boolean>('checkout-vat-valid', () => false)
  const vatChecking = useState<boolean>('checkout-vat-checking', () => false)
  const vatError    = useState<string>('checkout-vat-error', () => '')
  const vatCompany  = useState<{ name?: string; address?: string }>('checkout-vat-company', () => ({}))

  async function loadVatStatus() {
    try {
      const data = await $fetch<{ vatIntracom: string; valid: boolean; companyName?: string; companyAddress?: string }>('/api/catalogue/customer/vat')
      vatIntracom.value = data.vatIntracom || ''
      vatValid.value    = !!data.valid
      vatCompany.value  = { name: data.companyName, address: data.companyAddress }
      vatError.value    = ''
    } catch {
      vatIntracom.value = ''
      vatValid.value    = false
    }
  }

  

  async function validateVat(rawVat: string) {
    const { t } = useT()
    vatChecking.value = true
    vatError.value    = ''
    try {
      const res = await $fetch<{ valid: boolean; unavailable?: boolean; vatNumber?: string; companyName?: string; companyAddress?: string; reason?: string }>(
        '/api/catalogue/vat/validate',
        { method: 'POST', body: { vatNumber: rawVat } },
      )
      vatValid.value    = !!res.valid
      vatIntracom.value = res.vatNumber || rawVat
      vatCompany.value  = { name: res.companyName, address: res.companyAddress }
      if (!res.valid) {
        vatError.value = res.unavailable
          ? t('checkout.vat_registry_unavailable', "Le registre VIES de la Commission européenne est momentanément injoignable. Votre numéro n'est pas en cause — merci de réessayer dans quelques instants.")
          : t('checkout.vat_invalid', 'Numéro de TVA intracommunautaire invalide ou introuvable au registre VIES. Vérifiez le préfixe pays et la saisie.')
      }
      return res
    } catch (err: any) {
      vatValid.value = false
      vatError.value = err?.data?.statusMessage || err?.message || t('checkout.vat_check_error', 'Erreur de vérification VIES.')
      return { valid: false, reason: vatError.value }
    } finally {
      vatChecking.value = false
    }
  }

  
  const deliveryComment = useState<string>('checkout-delivery-comment', () => '')
  const paymentMethod = useState<string>('checkout-payment', () => 'bankwire')
  const createdOrder = useState<OrderData | null>('checkout-order', () => null)

  
  async function loadAddresses(customerId: number) {
    loading.value = true
    try {
      const data = await $fetch<(AddressData & { isDefaultBilling?: boolean })[]>('/api/catalogue/customer/addresses', {
        query: { customerId, clientId },
      })
      addresses.value = data
      if (data.length) selectedAddressId.value = data[0].id!
      
      
      
      const defaultBilling = data.find(a => a.isDefaultBilling)
      if (defaultBilling && defaultBilling.id !== selectedAddressId.value) {
        selectedInvoiceAddressId.value = defaultBilling.id!
        useDifferentInvoiceAddress.value = true
      } else {
        selectedInvoiceAddressId.value = null
        useDifferentInvoiceAddress.value = false
      }
    } catch (err: any) {
      error.value = useT().t('checkout.error_addresses_load', 'Impossible de charger les adresses')
    } finally {
      loading.value = false
    }
  }

  
  async function createAddress(data: Omit<AddressData, 'id'>) {
    loading.value = true
    error.value = ''
    try {
      const addr = await $fetch<AddressData>('/api/catalogue/customer/addresses', {
        method: 'POST',
        body: { ...data, clientId },
      })
      addresses.value.push(addr)
      selectedAddressId.value = addr.id!
      return addr
    } catch (err: any) {
      error.value = useT().t('checkout.error_address_create', 'Impossible de créer l\'adresse')
      return null
    } finally {
      loading.value = false
    }
  }

  
  async function updateAddress(addressId: number, data: Partial<Omit<AddressData, 'id'>>) {
    loading.value = true
    error.value = ''
    try {
      const addr = await $fetch<AddressData>(`/api/catalogue/customer/addresses/${addressId}`, {
        method: 'PUT',
        body: { ...data, clientId },
      })
      const idx = addresses.value.findIndex(a => a.id === addressId)
      if (idx >= 0) addresses.value[idx] = addr
      return addr
    } catch {
      error.value = useT().t('checkout.error_address_update', 'Impossible de modifier l\'adresse')
      return null
    } finally {
      loading.value = false
    }
  }

  
  async function deleteAddress(addressId: number) {
    loading.value = true
    error.value = ''
    try {
      await $fetch(`/api/catalogue/customer/addresses/${addressId}`, { method: 'DELETE' })
      addresses.value = addresses.value.filter(a => a.id !== addressId)
      if (selectedAddressId.value === addressId) {
        selectedAddressId.value = addresses.value[0]?.id ?? null
      }
    } catch {
      error.value = useT().t('checkout.error_address_delete', 'Impossible de supprimer l\'adresse')
    } finally {
      loading.value = false
    }
  }

  
  
  async function loadCarriers(ctx: { addressId?: number; totalHT?: number; weight?: number } = {}) {
    loading.value = true
    try {
      const data = await $fetch<CarrierData[]>('/api/shipping/methods', {
        query: {
          clientId,
          lang: activeLang.value,
          ...(ctx.addressId ? { addressId: ctx.addressId } : {}),
          ...(ctx.totalHT != null ? { totalHT: ctx.totalHT } : {}),
          ...(ctx.weight != null ? { weight: ctx.weight } : {}),
        },
      })
      carriers.value = data.filter(c => c.active)
      if (carriers.value.length) selectedCarrierId.value = transporteurParDefaut(carriers.value)
    } catch {
      error.value = useT().t('checkout.error_carriers_load', 'Impossible de charger les transporteurs')
    } finally {
      loading.value = false
    }
  }

  
  async function placeOrder(cartId: number, customerId: number, customerEmail?: string) {
    if (!selectedAddressId.value || !selectedCarrierId.value) {
      error.value = useT().t('checkout.error_address_carrier_required', 'Adresse et transporteur requis')
      return null
    }

    loading.value = true
    error.value = ''
    try {
      const paymentModuleMap: Record<string, string> = {
        bankwire: 'ps_wirepayment',
        stripe: 'stripe',
        paypal: 'paypal',
        klarna: 'stripe', 
        systempay: 'ps_wirepayment', 
      }

      const paymentLabelMap: Record<string, string> = {
        bankwire: 'Virement bancaire',
        stripe: 'Carte bancaire (Stripe)',
        paypal: 'PayPal',
        klarna: 'Paiement fractionné (Klarna)',
        systempay: 'Carte bancaire (SystemPay)',
      }

      
      
      const invoiceAddressId = (useDifferentInvoiceAddress.value && selectedInvoiceAddressId.value && selectedInvoiceAddressId.value !== selectedAddressId.value)
        ? selectedInvoiceAddressId.value
        : selectedAddressId.value

      
      
      
      const attribution = useCookie<Record<string, any> | null>('cms_attribution').value || undefined

      const order = await $fetch<OrderData>('/api/orders/create', {
        method: 'POST',
        body: {
          cartId,
          customerId,
          addressDeliveryId: selectedAddressId.value,
          addressInvoiceId: invoiceAddressId,
          carrierId: selectedCarrierId.value,
          paymentMethod: paymentLabelMap[paymentMethod.value] || 'Virement bancaire',
          paymentModule: paymentModuleMap[paymentMethod.value] || 'ps_wirepayment',
          clientId,
          customerEmail,
          deliveryComment: deliveryComment.value.trim(),
          attribution,
        },
      })

      createdOrder.value = order
      
      
      try { sessionStorage.setItem('cs_derniere_commande', JSON.stringify({ id: order.id, reference: order.reference })) } catch {  }
      step.value = 'confirmation'
      return order
    } catch (err: any) {
      error.value = err?.data?.message || useT().t('checkout.error_order_create', 'Erreur lors de la création de la commande')
      return null
    } finally {
      loading.value = false
    }
  }

  function goToStep(s: CheckoutStep) {
    error.value = ''
    step.value = s
  }

  function reset() {
    step.value = 'auth'
    addresses.value = []
    selectedAddressId.value = null
    selectedInvoiceAddressId.value = null
    useDifferentInvoiceAddress.value = false
    carriers.value = []
    selectedCarrierId.value = null
    deliveryComment.value = ''
    paymentMethod.value = 'bankwire'
    createdOrder.value = null
    error.value = ''
  }

  const selectedCarrier = computed<CarrierData | null>(() =>
    carriers.value.find(c => c.id === selectedCarrierId.value) ?? null,
  )
  const shippingPrice = computed<number>(() => Number(selectedCarrier.value?.price ?? 0))
  
  
  
  const shippingPriceTTC = computed<number>(() =>
    Number(selectedCarrier.value?.priceTTC ?? selectedCarrier.value?.price ?? 0),
  )

  return {
    step, loading, error,
    addresses, selectedAddressId,
    selectedInvoiceAddressId, useDifferentInvoiceAddress,
    carriers, selectedCarrierId, selectedCarrier, shippingPrice, shippingPriceTTC,
    deliveryComment,
    vatIntracom, vatValid, vatChecking, vatError, vatCompany,
    paymentMethod, createdOrder,
    loadAddresses, createAddress, updateAddress, deleteAddress,
    loadCarriers, placeOrder,
    loadVatStatus, validateVat,
    goToStep, reset,
  }
}
