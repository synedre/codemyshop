

import {
  createLearnerHuman,
  createStudentLink,
  findLearnerByEmail,
} from '~/internal/academy/server/utils/academy'
import { setHubSessionCookie } from '~/server/utils/session'
import { resolveClientId } from '~/server/utils/db'

const ACADEMY_SESSION_MAX_AGE_S = 60 * 60 * 24 * 30

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    password: string
    pseudo: string
  }>(event)

  const email    = (body.email ?? '').trim().toLowerCase().slice(0, 255)
  const password = (body.password ?? '').slice(0, 200)
  const pseudo   = (body.pseudo ?? '').trim().slice(0, 30)

  if (!email || !password || !pseudo) {
    throw createError({ statusCode: 422, message: 'Email, pseudo et mot de passe requis' })
  }
  if (pseudo.length < 3) {
    throw createError({ statusCode: 422, message: 'Pseudo : 3 caractères minimum' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 422, message: 'Mot de passe : 8 caractères minimum' })
  }

  try {
    const existing = await findLearnerByEmail(email, { event })
    if (existing) {
      throw createError({ statusCode: 409, message: 'Cet email est déjà inscrit' })
    }

    const learnerId = await createLearnerHuman(email, pseudo, { event })

    
    try {
      await createStudentLink(learnerId, pseudo, { event })
    } catch {  }

    const sessionData = {
      learnerId,
      email,
      pseudo,
      role: 'student',
      clientId: resolveClientId(event),
      
      userType: 'customer',
    }
    setHubSessionCookie(event, sessionData, ACADEMY_SESSION_MAX_AGE_S)

    return {
      success: true,
      student: { id: learnerId, email, pseudo },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[academy/register] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur inscription — réessaie.' })
  }
})
