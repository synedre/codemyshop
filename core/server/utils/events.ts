

import type { H3Event } from 'h3'
import { useClientDb } from './db'
import { withTransaction } from './db-pg-adapter'
import type { EventRecord, EventRegistration, EventStatus, EventType } from '~/types/event'

const ID_LANG_REPLI = 1
const TYPES: ReadonlySet<string> = new Set(['online', 'irl', 'hybrid'])
const STATUTS: ReadonlySet<string> = new Set(['draft', 'published', 'cancelled', 'finished'])

function clientIdOf(event: H3Event): string {
  return String((useRuntimeConfig(event) as any).clientId || '')
}

function iso(v: any): string {
  if (!v) return ''
  return v instanceof Date ? v.toISOString() : String(v)
}

function texteOuNull(v: unknown, max: number): string | null {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : null
}

export function descriptionVersHtml(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  if (/<[a-z][\s\S]*>/i.test(s)) return s
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
}

export function slugEvenement(title: string, date: string): string {
  const base = String(title || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80)
  const jour = /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : ''
  return [base || 'evenement', jour].filter(Boolean).join('-').slice(0, 96)
}

function mapEvent(r: any): EventRecord {
  return {
    id:               String(r.id_event),
    slug:             String(r.slug || ''),
    title:            String(r.title || ''),
    description:      String(r.description_html || ''),
    date:             iso(r.start_at),
    endDate:          r.end_at ? iso(r.end_at) : undefined,
    type:             (r.type as EventType) || 'irl',
    capacity:         Number(r.max_participants || 0),
    registrations:    Number(r.registered_count || 0),
    status:           (r.status as EventStatus) || 'draft',
    registrationOpen: Number(r.registration_open) === 1,
    venueName:        r.venue_name || undefined,
    venueAddress:     r.venue_address || undefined,
    postcode:         r.postcode || undefined,
    city:             r.city || undefined,
    meetingUrl:       r.meeting_url || undefined,
    coverImage:       r.cover_image_url || undefined,
    createdAt:        iso(r.date_add),
  }
}

const SELECT_EVENT = `
  SELECT e.*, el.title, el.description_html,
         (SELECT COALESCE(SUM(r.attendees_count), 0) FROM cs_event_registration r
           WHERE r.id_event = e.id_event AND r.status = 'confirmed') AS registered_count
    FROM cs_event e
LEFT JOIN cs_event_lang el ON el.id_event = e.id_event AND el.id_lang = ${ID_LANG_REPLI}`

export async function listEventsAdmin(event: H3Event): Promise<EventRecord[]> {
  const rows = await useClientDb(event).query<any>(
    `${SELECT_EVENT} WHERE e.client_id = ? ORDER BY e.start_at ASC, e.position ASC`,
    [clientIdOf(event)],
  )
  return rows.map(mapEvent)
}

export async function getEventAdmin(event: H3Event, id: string | number): Promise<EventRecord | null> {
  const n = Number(id)
  if (!Number.isInteger(n) || n <= 0) return null
  const rows = await useClientDb(event).query<any>(
    `${SELECT_EVENT} WHERE e.client_id = ? AND e.id_event = ? LIMIT 1`,
    [clientIdOf(event), n],
  )
  return rows[0] ? mapEvent(rows[0]) : null
}

function colonnes(input: Partial<EventRecord>): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  if (input.type !== undefined && TYPES.has(String(input.type))) c.type = input.type
  if (input.status !== undefined && STATUTS.has(String(input.status))) c.status = input.status
  if (input.date !== undefined && input.date) c.start_at = input.date
  if (input.endDate !== undefined) c.end_at = input.endDate || null
  if (input.capacity !== undefined) c.max_participants = Number(input.capacity) > 0 ? Math.floor(Number(input.capacity)) : null
  if (input.registrationOpen !== undefined) c.registration_open = input.registrationOpen ? 1 : 0
  if (input.venueName !== undefined) c.venue_name = texteOuNull(input.venueName, 128)
  if (input.venueAddress !== undefined) c.venue_address = texteOuNull(input.venueAddress, 255)
  if (input.postcode !== undefined) c.postcode = texteOuNull(input.postcode, 16)
  if (input.city !== undefined) c.city = texteOuNull(input.city, 96)
  if (input.meetingUrl !== undefined) c.meeting_url = texteOuNull(input.meetingUrl, 512)
  if (input.coverImage !== undefined) c.cover_image_url = texteOuNull(input.coverImage, 512)
  return c
}

export async function createEvent(event: H3Event, input: Partial<EventRecord>): Promise<EventRecord> {
  const clientId = clientIdOf(event)
  const title = String(input.title || '').trim().slice(0, 255)
  const db = useClientDb(event)

  const base = slugEvenement(title, String(input.date || ''))
  const pris = new Set((await db.query<{ slug: string }>(
    `SELECT slug FROM cs_event WHERE client_id = ? AND (slug = ? OR slug LIKE ?)`,
    [clientId, base, `${base}-%`],
  )).map((r) => r.slug))
  let slug = base
  for (let i = 2; pris.has(slug); i++) slug = `${base.slice(0, 90)}-${i}`

  const cols = { type: 'irl', status: 'draft', ...colonnes(input), client_id: clientId, slug }
  const noms = Object.keys(cols)
  const id = await withTransaction(db, async (tx) => {
    const ins = await tx.query<{ id_event: number }>(
      `INSERT INTO cs_event (${noms.join(', ')}) VALUES (${noms.map(() => '?').join(', ')}) RETURNING id_event`,
      noms.map((k) => (cols as any)[k]),
    )
    const idEvent = Number(ins[0]?.id_event || 0)
    if (!idEvent) throw new Error('INSERT cs_event KO')
    await tx.run(
      `INSERT INTO cs_event_lang (id_event, id_lang, title, description_html) VALUES (?, ?, ?, ?)`,
      [idEvent, ID_LANG_REPLI, title, descriptionVersHtml(input.description)],
    )
    return idEvent
  })
  const row = await getEventAdmin(event, id)
  if (!row) throw new Error('Événement créé mais introuvable')
  return row
}

export async function updateEvent(event: H3Event, id: string | number, patch: Partial<EventRecord>): Promise<EventRecord | null> {
  const existing = await getEventAdmin(event, id)
  if (!existing) return null
  const n = Number(existing.id)
  const cols = colonnes(patch)
  const db = useClientDb(event)
  await withTransaction(db, async (tx) => {
    const noms = Object.keys(cols)
    if (noms.length) {
      await tx.run(
        `UPDATE cs_event SET ${noms.map((k) => `${k} = ?`).join(', ')}, date_upd = now()
          WHERE id_event = ? AND client_id = ?`,
        [...noms.map((k) => cols[k]), n, clientIdOf(event)],
      )
    }
    if (patch.title !== undefined || patch.description !== undefined) {
      await tx.run(
        `INSERT INTO cs_event_lang (id_event, id_lang, title, description_html) VALUES (?, ?, ?, ?)
         ON CONFLICT (id_event, id_lang) DO UPDATE SET title = EXCLUDED.title, description_html = EXCLUDED.description_html`,
        [
          n, ID_LANG_REPLI,
          String(patch.title ?? existing.title).trim().slice(0, 255),
          patch.description !== undefined ? descriptionVersHtml(patch.description) : (existing.description || null),
        ],
      )
    }
  })
  return getEventAdmin(event, n)
}

export async function deleteEvent(event: H3Event, id: string | number): Promise<boolean> {
  const existing = await getEventAdmin(event, id)
  if (!existing) return false
  const n = Number(existing.id)
  await withTransaction(useClientDb(event), async (tx) => {
    await tx.run(`DELETE FROM cs_event_registration WHERE id_event = ?`, [n])
    await tx.run(`DELETE FROM cs_event_lang WHERE id_event = ?`, [n])
    await tx.run(`DELETE FROM cs_event WHERE id_event = ? AND client_id = ?`, [n, clientIdOf(event)])
  })
  return true
}

export async function listRegistrations(event: H3Event, id: string | number): Promise<EventRegistration[] | null> {
  const existing = await getEventAdmin(event, id)
  if (!existing) return null
  const rows = await useClientDb(event).query<any>(
    `SELECT id_registration, id_event, name, email, phone, attendees_count, note, status, date_add
       FROM cs_event_registration WHERE id_event = ? ORDER BY date_add DESC`,
    [Number(existing.id)],
  )
  return rows.map((r) => ({
    id:             String(r.id_registration),
    eventId:        String(r.id_event),
    name:           String(r.name || ''),
    email:          String(r.email || ''),
    phone:          r.phone || undefined,
    attendeesCount: Number(r.attendees_count || 1),
    note:           r.note || undefined,
    status:         String(r.status || ''),
    createdAt:      iso(r.date_add),
  }))
}
