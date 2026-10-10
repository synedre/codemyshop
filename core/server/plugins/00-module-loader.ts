

import { listAllManifests, manifestsByEdition } from '~/server/utils/module-loader'

import '~/modules/faq/server/index'
import '~/enterprise/banking/corsetva/server/index'
import '~/enterprise/vertical-food/catchweight/server/index'

const _serverSideEffectsCount = 3

export default defineNitroPlugin(() => {
  const all = listAllManifests()
  const byEd = manifestsByEdition()
  console.log(
    `[module-loader] ${all.length} manifests discovered ` +
    `(community: ${byEd.community.length}, ` +
    `enterprise: ${byEd.enterprise.length}, ` +
    `custom: ${byEd.custom.length}, ` +
    `internal: ${byEd.internal.length}) ` +
    `+ ${_serverSideEffectsCount} server side-effects loaded`
  )
})
