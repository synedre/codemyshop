

import {
  integer,
  jsonb,
  numeric,
  serial,
  text,
  timestamp,
  varchar,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const vaisseauMereAcSchema = pgSchema('cs_main')

export const categoryQueue = vaisseauMereAcSchema.table(
  'cs_category_queue',
  {
    idRedaction: serial('id_redaction').primaryKey(),
    tenant: varchar('tenant', { length: 50 }).notNull().default('ac-hub'),
    idCategory: integer('id_category').notNull(),
    jobType: varchar('job_type', { length: 32 }).notNull().default('redaction'),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    instructions: text('instructions'),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    shortDescription: text('short_description'),
    longDescription: text('long_description'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: varchar('meta_description', { length: 512 }),
    faqJson: text('faq_json'),
    faqCount: integer('faq_count').notNull().default(0),
    errorMsg: varchar('error_msg', { length: 512 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const cmsQueue = vaisseauMereAcSchema.table(
  'cs_cms_queue',
  {
    idRedaction: serial('id_redaction').primaryKey(),
    tenant: varchar('tenant', { length: 50 }).notNull().default('ac-hub'),
    idCms: integer('id_cms').notNull(),
    jobType: varchar('job_type', { length: 32 }).notNull().default('redaction'),
    title: varchar('title', { length: 512 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    metaDescription: varchar('meta_description', { length: 512 }),
    metaTitle: varchar('meta_title', { length: 255 }),
    optimizedSlug: varchar('optimized_slug', { length: 255 }),
    instructions: text('instructions'),
    model: varchar('model', { length: 64 }).notNull().default('claude-sonnet-5'),
    

    provider: varchar('provider', { length: 32 }),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    contentHtml: text('content_html'),
    faqJson: text('faq_json'),
    wordCount: integer('word_count'),
    faqCount: integer('faq_count'),
    errorMsg: varchar('error_msg', { length: 512 }),
    

    source: varchar('source', { length: 16 }).notNull().default('worker'),
    

    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    

    costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
    

    coverScene: text('cover_scene'),
    

    publishedAt: timestamp('published_at', { mode: 'date', precision: 0 }),
    

    idLang: integer('id_lang').notNull().default(1),
    

    qualityScore: numeric('quality_score', { precision: 4, scale: 2 }),
    qualityReport: jsonb('quality_report'),
    
    qualityApprovedAt: timestamp('quality_approved_at', { mode: 'date', precision: 0 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const contentQueue = vaisseauMereAcSchema.table(
  'cs_content_queue',
  {
    idAcContentQueue: serial('id_ac_content_queue').primaryKey(),
    type: varchar('type', { length: 20 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    source: varchar('source', { length: 100 }),
    sourceRefs: text('source_refs'),
    priority: varchar('priority', { length: 5 }).notNull().default('P2'),
    status: varchar('status', { length: 20 }).notNull().default('queued'),
    mentor: varchar('mentor', { length: 50 }),
    assignedAgent: varchar('assigned_agent', { length: 50 }),
    notes: text('notes'),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const productAiQueue = vaisseauMereAcSchema.table(
  'cs_product_ai_queue',
  {
    idQueue: serial('id_queue').primaryKey(),
    idProduct: integer('id_product').notNull().default(0),
    productName: varchar('product_name', { length: 255 }).notNull().default(''),
    context: text('context'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    resultHtml: text('result_html'),
    errorMsg: varchar('error_msg', { length: 512 }).notNull().default(''),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)

export const productQueue = vaisseauMereAcSchema.table(
  'cs_product_queue',
  {
    idRedaction: serial('id_redaction').primaryKey(),
    tenant: varchar('tenant', { length: 50 }).notNull().default('ac-hub'),
    idProduct: integer('id_product').notNull(),
    jobType: varchar('job_type', { length: 32 }).notNull().default('redaction'),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    instructions: text('instructions'),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    shortDescription: text('short_description'),
    longDescription: text('long_description'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: varchar('meta_description', { length: 512 }),
    optimizedSlug: varchar('optimized_slug', { length: 255 }),
    errorMsg: varchar('error_msg', { length: 512 }),
    dateAdd: timestamp('date_add', { mode: 'date', precision: 0 }).notNull().defaultNow(),
    dateUpd: timestamp('date_upd', { mode: 'date', precision: 0 }).notNull().defaultNow(),
  },
)
