

import { findLearnerByEmailWithPseudo } from '~/internal/academy/server/utils/academy'
import { setHubSessionCookie } from '~/server/utils/session'
import { resolveClientId } from '~/server/utils/db'

const ACADEMY_SESSION_MAX_AGE_S = 60 * 60 * 24 * 30

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password) {
    throw createError({ statusCode: 422, message: 'Email et mot de passe requis' })
  }

  
  
  
  
  
  
  
  
  
  throw createError({
    statusCode: 501,
    message: 'Connexion Academy indisponible — authentification non implémentée.',
  })

  
  try {
    const learner = await findLearnerByEmailWithPseudo(email, { event })
    if (!learner) {
      throw createError({ statusCode: 401, message: 'Email inconnu — inscrivez-vous d\'abord.' })
    }

    const sessionData = {
      learnerId: learner.id_learner,
      email: learner.email,
      pseudo: learner.pseudo,
      role: 'student',
      clientId: resolveClientId(event),
      
      userType: 'customer',
    }
    setHubSessionCookie(event, sessionData, ACADEMY_SESSION_MAX_AGE_S)

    return {
      success: true,
      student: { id: learner.id_learner, email: learner.email, pseudo: learner.pseudo },
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[academy/login] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'Erreur — réessaie.' })
  }
})
