

import '../../community/modules/faq/client/index'

import '../../community/modules/store-advisor/client/index'

import '../../community/modules/split-payment/client/index'

const _clientSideEffectsCount = 3

export default defineNuxtPlugin(() => {
  if (_clientSideEffectsCount > 0) {
    console.log(`[module-loader] ${_clientSideEffectsCount} client side-effects loaded`)
  }
})
