

import { listActiveModuleslistPg } from '~/server/utils/step7-readonly-pg'
import { isMissingTable } from '~/server/utils/missing-table'
import { toPublicModule } from '~/server/utils/moduleslist-public'

export default defineEventHandler(async () => {
  
  
  let rows: any[] = []
  try {
    rows = await listActiveModuleslistPg()
  } catch (err: any) {
    if (!isMissingTable(err)) throw err
    console.warn('[moduleslist] cs_moduleslist absente sur ce tenant → modules=[]')
  }

  
  
  
  const modules = rows.map(toPublicModule)
  return { modules }
})
