

import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { useClientDb } from '../../../utils/db'
import { sendEventRegistrationAck } from '../../../utils/event-registration-ack'

const idLangOf = (lang: string) => (lang === 'en' ? 2 : 1)
const SELECT_EV = `
  SELECT e.id_event, e.slug, e.type, e.start_at, e.timezone, e.venue_name, e.venue_address,
         e.postcode, e.city, e.meeting_url,
         e.registration_open, e.registration_deadline, e.max_participants, e.status,
         COALESCE(el.title, elf.title) AS title
    FROM cs_event e
LEFT JOIN cs_event_lang el  ON el.id_event  = e.id_event AND el.id_lang = ?
LEFT JOIN cs_event_lang elf ON elf.id_event = e.id_event AND elf.id_lang = 1`

const lienReunion = (ev: any): string | null =>
  (ev.type === 'online' || ev.type === 'hybrid') && ev.meeting_url ? String(ev.meeting_url) : null

async function confirmer(event: H3Event, ev: any, email: string, lang: string, attendeesCount: number): Promise<boolean> {
  try {
    const res = await sendEventRegistrationAck(event, {
      email, lang, attendeesCount,
      ev: {
        idEvent: Number(ev.id_event), slug: String(ev.slug), title: String(ev.title || ''),
        type: String(ev.type), startAt: ev.start_at, timezone: ev.timezone,
        venueName: ev.venue_name, venueAddress: ev.venue_address,
        postcode: ev.postcode, city: ev.city, meetingUrl: ev.meeting_url,
      },
    })
    return res.sent
  } catch (err: any) {
    console.warn('[events/register] confirmation non envoyée :', err?.message)
    return false
  }
}

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const cfg = useRuntimeConfig(event)
  const clientId = String((cfg as any).clientId || '')

  const raw = String(getRouterParam(event, 'id') || '').trim()
  if (!raw) throw createError({ statusCode: 400, statusMessage: 'id ou slug requis' })
  const isNumeric = /^\d+$/.test(raw)

  const body = await readBody<{
    email?: string; name?: string; phone?: string;
    attendeesCount?: number; note?: string;
    consentParticipantsList?: boolean; lang?: string
  }>(event)

  const email = String(body?.email || '').trim().toLowerCase()
  const name = String(body?.name || '').trim()
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email invalide' })
  }
  if (!name || name.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Nom requis' })
  }
  const attendeesCount = Math.max(1, Math.min(10, Number(body?.attendeesCount) || 1))
  const phone = body?.phone ? String(body.phone).slice(0, 32) : null
  const note = body?.note ? String(body.note).slice(0, 1000) : null
  const consent = body?.consentParticipantsList ? 1 : 0
  const lang = String(body?.lang || 'fr').trim().toLowerCase()

  
  const events = await db.query<any>(
    isNumeric
      ? `${SELECT_EV} WHERE e.client_id = ? AND e.id_event = ? LIMIT 1`
      : `${SELECT_EV} WHERE e.client_id = ? AND e.slug = ? LIMIT 1`,
    isNumeric ? [idLangOf(lang), clientId, Number(raw)] : [idLangOf(lang), clientId, raw],
  )

  const ev = events[0]
  if (!ev) throw createError({ statusCode: 404, statusMessage: 'Event introuvable' })
  if (ev.status !== 'published') throw createError({ statusCode: 409, statusMessage: 'Event non disponible' })
  if (Number(ev.registration_open) !== 1) throw createError({ statusCode: 409, statusMessage: 'Inscriptions fermées' })
  if (ev.registration_deadline && new Date(ev.registration_deadline) < new Date()) {
    throw createError({ statusCode: 409, statusMessage: "Deadline d'inscription dépassée" })
  }

  if (ev.max_participants) {
    const counts = await db.query<{ total: string }>(
      `SELECT COALESCE(SUM(attendees_count), 0) AS total FROM cs_event_registration
        WHERE id_event = ? AND status = 'confirmed'`,
      [ev.id_event],
    )
    const total = Number(counts[0]?.total || 0)
    if (total + attendeesCount > Number(ev.max_participants)) {
      throw createError({ statusCode: 409, statusMessage: 'Plus de places disponibles' })
    }
  }

  const dup = await db.query<any>(
    `SELECT id_registration, status FROM cs_event_registration
      WHERE id_event = ? AND email = ? LIMIT 1`,
    [ev.id_event, email],
  )
  if (dup[0]) {
    if (dup[0].status === 'confirmed') {
      return { ok: true, alreadyRegistered: true, idRegistration: Number(dup[0].id_registration) }
    }
    await db.run(
      `UPDATE cs_event_registration
          SET status = 'confirmed', name = ?, phone = ?, attendees_count = ?, note = ?,
              consent_participants_list = ?, date_upd = now()
        WHERE id_registration = ?`,
      [name, phone, attendeesCount, note, consent, dup[0].id_registration],
    )
    const confirmationEmail = await confirmer(event, ev, email, lang, attendeesCount)
    return { ok: true, reactivated: true, idRegistration: Number(dup[0].id_registration), confirmationEmail, meetingUrl: lienReunion(ev) }
  }

  const token = randomBytes(24).toString('hex')
  const ip = String(getHeader(event, 'x-forwarded-for') || '').split(',')[0].trim() || null
  const ua = String(getHeader(event, 'user-agent') || '').slice(0, 512) || null

  const result = await db.query<{ id_registration: number }>(
    `INSERT INTO cs_event_registration
       (id_event, email, name, phone, attendees_count, note, status, token,
        consent_participants_list, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)
     RETURNING id_registration`,
    [ev.id_event, email, name, phone, attendeesCount, note, token, consent, ip, ua],
  )

  const confirmationEmail = await confirmer(event, ev, email, lang, attendeesCount)
  return {
    ok: true,
    idRegistration: Number(result[0]?.id_registration || 0),
    cancelToken: token,
    confirmationEmail,
    meetingUrl: lienReunion(ev),
  }
})
