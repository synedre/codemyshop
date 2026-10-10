

import { defineLeaderTask } from '~/server/utils/schedule-leader'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { processCoverQueue } from '~/server/utils/covergen-queue'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_covergen_queue'
const BATCH_LIMIT = 5

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return rows[0]?.exists ?? false
}

async function tenantHasActiveCoverConfig(): Promise<boolean> {
  try {
    const sql = getPgClient()
    const rows = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM cs_main.cs_cover_tenant_config WHERE active = 1
      ) AS exists
    `
    return rows[0]?.exists ?? false
  } catch {
    return false
  }
}

export default defineLeaderTask({
  meta: {
    name: 'cover:queue-process',
    description: 'Consumer cs_covergen_queue (port ac_covergen --process-queue, Wave 3 #3 Phase D)',
  },
  async run() {
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }
    
    if (!(await tenantHasActiveCoverConfig())) {
      return { result: { status: 'skipped', reason: 'no-active-cover-config' } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await processCoverQueue({ limit: BATCH_LIMIT })
        log.count('scanned', outcome.scanned)
        log.count('processed', outcome.processed)
        log.count('errors', outcome.errors)

        const summary =
          outcome.scanned === 0
            ? 'queue empty'
            : `${outcome.processed}/${outcome.scanned} ok, ${outcome.errors} err`
        const status = outcome.errors > 0 ? 'partial' : 'ok'
        log.setResult(status, summary)

        return {
          status,
          scanned: outcome.scanned,
          processed: outcome.processed,
          errors: outcome.errors,
          items: outcome.items,
          summary,
        }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
