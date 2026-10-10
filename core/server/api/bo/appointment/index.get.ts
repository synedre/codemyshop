import { requireEmployeeSession } from '~/server/utils/session'

import {
  listAdminAppointments,
  listAdminAvailability,
} from '~/enterprise/base/appointment/server/utils/appointment'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const [slots, appointments] = await Promise.all([
    listAdminAvailability({ event }),
    listAdminAppointments({ event }),
  ])
  return { success: true, slots, appointments }
})
