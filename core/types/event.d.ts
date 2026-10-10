

export type EventType   = 'online' | 'irl' | 'hybrid'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'

export interface EventRecord {
  id:               string
  slug:             string
  title:            string
  description:      string          
  date:             string          
  endDate?:         string
  type:             EventType
  capacity:         number          
  registrations:    number          
  status:           EventStatus
  registrationOpen: boolean
  venueName?:       string
  venueAddress?:    string
  postcode?:        string
  city?:            string
  meetingUrl?:      string
  coverImage?:      string
  createdAt:        string
}

export interface EventRegistration {
  id:             string
  eventId:        string
  name:           string
  email:          string
  phone?:         string
  attendeesCount: number
  note?:          string
  status:         string
  createdAt:      string
}
