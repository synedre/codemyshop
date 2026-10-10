

export function useCartDrawer() {
  const isOpen = useState<boolean>('cart-drawer-open', () => false)
  

  const origin = useState<'ajout' | 'consultation'>('cart-drawer-origin', () => 'ajout')

  function open(from?: unknown) {
    origin.value = from === 'consultation' ? 'consultation' : 'ajout'
    isOpen.value = true
  }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  return { isOpen, origin, open, close, toggle }
}
