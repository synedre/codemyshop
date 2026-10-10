

import {
  index,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const moduleslistVaisseau = vaisseauMereAcSchema.table(
  'cs_moduleslist',
  {
    idModuleEntry: serial('id_module_entry').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    codename: varchar('codename', { length: 128 }).notNull(),
    icon: varchar('icon', { length: 16 }),
    category: varchar('category', { length: 64 }).notNull().default('general'),
    flywheel: varchar('flywheel', { length: 255 }).default(''),
    description: text('description').notNull(),
    features: text('features'),
    tags: text('tags'),
    status: varchar('status', { length: 64 }).notNull().default('Production'),
    link: varchar('link', { length: 255 }).default(''),
    
    
    
    slug: varchar('slug', { length: 160 }),
    summary: text('summary'),
    contentMd: text('content_md'),
    position: integer('position').notNull().default(0),
    active: integer('active').notNull().default(1),
    exclusiveToAc: integer('exclusive_to_ac').notNull().default(1),
    dateAdd: timestamp('date_add', { mode: 'date' }).notNull(),
    dateUpd: timestamp('date_upd', { mode: 'date' }).notNull(),
  },
  (t) => ({
    uCodename: uniqueIndex('idx_moduleslist_codename').on(t.codename),
    
    
    uSlug: uniqueIndex('idx_moduleslist_slug').on(t.slug),
    kActive: index('idx_moduleslist_active').on(t.active),
    kExclusive: index('idx_moduleslist_exclusive').on(t.exclusiveToAc),
  }),
)
