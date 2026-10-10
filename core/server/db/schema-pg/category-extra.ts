

import {
  integer, primaryKey, timestamp, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const categoryExtra = vaisseauMereAcSchema.table(
  'cs_category_extra',
  {
    idCategory: integer('id_category').notNull().primaryKey(),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    

    heroImageUrl: varchar('hero_image_url', { length: 500 }),
  },
)

export const categoryExtraLang = vaisseauMereAcSchema.table(
  'cs_category_extra_lang',
  {
    idCategory: integer('id_category').notNull(),
    idLang: integer('id_lang').notNull(),
    h1: varchar('h1', { length: 255 }),
    
    imageAlt: varchar('image_alt', { length: 255 }),
    

    guideLinkLabel: varchar('guide_link_label', { length: 120 }),
    

    guideLinkUrl: varchar('guide_link_url', { length: 500 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idCategory, t.idLang] }),
  }),
)
