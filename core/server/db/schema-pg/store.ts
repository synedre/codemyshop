

import {
  decimal,
  index,
  integer,
  pgSchema,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const storeVaisseau = vaisseauMereAcSchema.table(
  'cs_store',
  {
    idStore: serial('id_store').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    slug: varchar('slug', { length: 96 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    addressLine1: varchar('address_line1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line2', { length: 255 }),
    postcode: varchar('postcode', { length: 16 }).notNull(),
    city: varchar('city', { length: 96 }).notNull(),
    region: varchar('region', { length: 96 }),
    country: varchar('country', { length: 2 }).notNull().default('FR'),
    lat: decimal('lat', { precision: 9, scale: 6 }).notNull(),
    lng: decimal('lng', { precision: 9, scale: 6 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    email: varchar('email', { length: 128 }),
    websiteUrl: varchar('website_url', { length: 255 }),
    hoursJson: text('hours_json'),
    hasWorkshop: smallint('has_workshop').notNull().default(0),
    hasSchool: smallint('has_school').notNull().default(0),
    position: integer('position').notNull().default(0),
    active: smallint('active').notNull().default(1),
    

    advisorName: varchar('advisor_name', { length: 128 }),
    
    advisorRole: varchar('advisor_role', { length: 128 }),
    advisorPhotoUrl: varchar('advisor_photo_url', { length: 255 }),
    

    advisorActive: smallint('advisor_active').notNull().default(0),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    idxClientCity: index('idx_store_client_city').on(t.clientId, t.city),
    idxSlug: index('idx_store_slug').on(t.clientId, t.slug),
  }),
)

export const storeLangVaisseau = vaisseauMereAcSchema.table(
  'cs_store_lang',
  {
    idStore: integer('id_store').notNull(),
    idLang: integer('id_lang').notNull(),
    description: text('description'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    

    advisorPitch: text('advisor_pitch'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idStore, t.idLang] }),
  }),
)

export const storeStockVaisseau = vaisseauMereAcSchema.table(
  'cs_store_stock',
  {
    idStore: integer('id_store').notNull(),
    idProduct: integer('id_product').notNull(),
    
    idProductAttribute: integer('id_product_attribute').notNull().default(0),
    quantity: integer('quantity').notNull().default(0),
    
    syncedAt: timestamp('synced_at', { mode: 'date' }).notNull().defaultNow(),
    
    source: varchar('source', { length: 32 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idStore, t.idProduct, t.idProductAttribute] }),
    idxProduct: index('idx_store_stock_product').on(t.idProduct, t.idProductAttribute),
  }),
)

export type StorePgRow = typeof storeVaisseau.$inferSelect
export type StorePgInsert = typeof storeVaisseau.$inferInsert
export type StoreLangPgRow = typeof storeLangVaisseau.$inferSelect
export type StoreStockPgRow = typeof storeStockVaisseau.$inferSelect
export type StoreStockPgInsert = typeof storeStockVaisseau.$inferInsert
