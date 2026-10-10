

import {
  index, integer, primaryKey, serial, smallint, text, timestamp, uniqueIndex, varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const megamenu = vaisseauMereAcSchema.table(
  'cs_megamenu',
  {
    idMegamenu: serial('id_megamenu').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull().default('ac-hub'),
    parentId: integer('parent_id'),
    type: varchar('type', { length: 16 }).notNull().default('link'),
    href: varchar('href', { length: 512 }),
    icon: varchar('icon', { length: 255 }),
    
    
    
    
    
    
    
    iconRole: varchar('icon_role', { length: 16 }).notNull().default('picto'),
    styleJson: text('style_json'),
    gridColumns: integer('grid_columns'),
    cssClass: varchar('css_class', { length: 128 }),
    psCategoryId: integer('ps_category_id'),
    
    
    
    
    
    psProductId: integer('ps_product_id'),
    showPsChildren: smallint('show_ps_children').notNull().default(0),
    position: integer('position').notNull().default(0),
    active: smallint('active').notNull().default(1),
    
    
    
    barVisible: smallint('bar_visible').notNull().default(1),
    
    
    
    context: varchar('context', { length: 32 }).notNull().default('default'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    idxClientContext: index('idx_ps_ac_megamenu_client_context').on(t.clientId, t.context),
  }),
)

export const menuContext = vaisseauMereAcSchema.table(
  'cs_menu_context',
  {
    idContext: serial('id_context').primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    contextKey: varchar('context_key', { length: 32 }).notNull(),
    label: varchar('label', { length: 128 }).notNull(),
    position: integer('position').notNull().default(0),
    active: smallint('active').notNull().default(1),
    

    searchRootCategoryId: integer('search_root_category_id'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
  (t) => ({
    idxClientActive: index('idx_ps_ac_menu_context_client_active').on(t.clientId, t.active),
    ukClientKey: uniqueIndex('uk_ps_ac_menu_context_client_key').on(t.clientId, t.contextKey),
  }),
)

export const menuContextLang = vaisseauMereAcSchema.table(
  'cs_menu_context_lang',
  {
    idContext: integer('id_context').notNull(),
    idLang: integer('id_lang').notNull(),
    topbarMessage: varchar('topbar_message', { length: 255 }),
    topbarMessageMobile: varchar('topbar_message_mobile', { length: 160 }),
    searchPlaceholder: varchar('search_placeholder', { length: 160 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idContext, t.idLang] }),
  }),
)

export const megamenuLang = vaisseauMereAcSchema.table(
  'cs_megamenu_lang',
  {
    idMegamenu: integer('id_megamenu').notNull(),
    idLang: integer('id_lang').notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }),
    badge: varchar('badge', { length: 64 }),
    groupTitle: varchar('group_title', { length: 255 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idMegamenu, t.idLang] }),
    ukMegamenuLang: uniqueIndex('uk_megamenu_lang').on(t.idMegamenu, t.idLang),
  }),
)
