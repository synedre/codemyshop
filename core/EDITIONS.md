# CodeMyShop — Editions

CodeMyShop is **open-core**. The free **Community** edition is a complete, production-ready commerce platform — no crippled trial, no feature gating on essentials. The paid hosted tiers (**Pro Cloud**, **Enterprise Scale**) provide sovereign managed infrastructure, continuous agentic AI evolution via our autonomous agent fleet, and enterprise B2B capabilities.

This page is the public, authoritative split. If a feature is listed under a paid tier, it is **intentionally** not in the Community edition.

## At a glance

| | **Community** | **Pro Cloud** (Managed) | **Enterprise Scale** |
|---|:---:|:---:|:---:|
| **Price** | Free (AGPL-3.0) | **490 € / mo excl. VAT** | **1,200 – 1,800 € / mo excl. VAT** |
| **Target** | Self-hosters, devs, agencies | SMBs & e-merchants (500 k€ – 1.5 M€ revenue) | High-volume merchants, multi-shop groups, wholesale B2B |
| **Hosting** | Self-host | Managed Sovereign VPS France (OVH, 8 GB dedicated) | Dedicated Sovereign Server (Multi-region available) |
| **Support** | GitHub community | Asynchronous via Hub (email / brief / audio, 24h SLA) | 4h business + 24/7 on-call + SLA 99.9% |
| **Setup** | Self-serve docs | **0 € (Setup included, no lock-in)** | Scoped on quote (ERP integration / custom data ETL) |
| **Autonomous Fleet Access (AI Team)** | BYOK generic connectors | **Included (1 active request at a time, 48-72h turnaround)** | **Advanced (Priority parallel multi-request queue)** |
| **Strategic Advisory** | Community | Hub asynch exchange | **Monthly strategic video conference** with team |
| **CodeMyShop Payments** | 0 % (bring your own PSP) | Optional 0% platform tax | Volume discounts on subscription fee |

### What's included — organized by tier

- **Community (Free, AGPL-3.0)** :
  - Complete core runtime (Nuxt 4 + Drizzle ORM + PostgreSQL + Redis)
  - Full B2B workflow (quotes, invoices, quick order pad)
  - Standard payment & shipping adapters
  - Multilingual DB-first system
  - Generic AI connectors (BYOK)
  - Community support on GitHub

- **Pro Cloud (490 €/mo)** :
  - Everything in Community
  - Sovereign managed VPS in France (OVHcloud, 8 GB dedicated)
  - Automatic SSL, CVE security patching < 48h, daily encrypted backups (30-day retention)
  - **Autonomous Agent Fleet Access** : continuous execution of merchant requests (1 active request at a time, 48-72h delivery) covering storefront UI, catalog rules, landing pages, and merchandising
  - **AI SEO Suite** : Google Search Console telemetry, automated content generation, and E-E-A-T structured data
  - Native Model Context Protocol (MCP) servers
  - Zero platform tax (vs 1.5–2% on captive SaaS)
  - 0 € setup fee, monthly cancellation without commitment

- **Enterprise Scale (1,200 – 1,800 €/mo)** :
  - Everything in Pro Cloud
  - Multi-shop / multi-brand architecture (sister brands managed from one unified hub)
  - Dedicated high-availability server cluster (multi-region available)
  - **Advanced Agent Fleet Access** : priority parallel multi-request queue for high-cadence development
  - Custom ERP connectors (Sage, Cegid, EBP, SAP) & specialized data pipelines
  - Contractual SLA (99.5% to 99.9%)
  - **Monthly strategic advisory session** in video conference with the team

## Full capability matrix

| Capability | Community | Pro Cloud | Enterprise Scale |
|---|:---:|:---:|:---:|
| **Commerce core** | | | |
| Catalog, cart, checkout, customer accounts | ✅ | ✅ | ✅ |
| B2B workflows (quote requests, quotes, invoices, fast order pad) | ✅ | ✅ | ✅ |
| Subscriptions | ✅ | ✅ | ✅ |
| Multi-tenant runtime (siloed DB-per-tenant + shared codebase) | ✅ | ✅ | ✅ |
| Standard payment integrations (Stripe, SystemPay) | ✅ | ✅ | ✅ |
| Multi-language DB-first | ✅ | ✅ | ✅ |
| Standard shipping & freight rules | ✅ | ✅ | ✅ |
| Wishlist, FAQ (polymorphic), redirects, attachments | ✅ | ✅ | ✅ |
| Community forum (categories, topics, replies, moderation) | ✅ | ✅ | ✅ |
| Theme system & homepage builder | ✅ | ✅ | ✅ |
| Headless contact forms | ✅ | ✅ | ✅ |
| **cs_payment** | | | |
| cs_payment Stripe Connect / SystemPay adapters | ✅ | ✅ | ✅ |
| Optional platform fee (0% default, zero platform tax) | 0% | 0% | Volume discounts |
| **Hosting & Infra** | | | |
| Self-hosted | ✅ | — | — |
| Hosted in France (OVHcloud sovereign VPS) | — | ✅ (8 GB dedicated) | ✅ (dedicated cluster) |
| Custom domain + automatic TLS | Self-managed | ✅ | ✅ |
| Daily encrypted backups | Best-effort | 30 days | 90 days + offsite |
| **Agentic AI & Autonomous Fleet** | | | |
| Autonomous Agent Fleet (custom evolutions & UI) | — | ✅ (1 active at a time) | ✅ (priority parallel) |
| AI SEO suite (Google Search Console + automated content) | — | ✅ | ✅ |
| AI category & product cover generation | — | ✅ | ✅ |
| Structured data (JSON-LD, Schema.org, AIO) | Basic | ✅ Complete | ✅ Complete |
| Native Model Context Protocol (MCP) servers | Basic | ✅ | ✅ |
| **B2B & Advanced Modules** | | | |
| Cockpit CRM (leads, accounts, credit limits) | Basic | ✅ | ✅ |
| Order Pad Express B2B (< 30s reorder) | Basic | ✅ | ✅ |
| Dynamic tiered pricing & volume rules | Basic | ✅ | ✅ |
| Lot & stock traceability (DLC, warehouse tracking) | Basic | ✅ | ✅ |
| ERP connectors (Sage, Cegid, EBP, SAP) | — | — | ✅ On quote |
| Multi-shop & multi-brand federation | — | — | ✅ |
| **Support & SLA** | | | |
| Support response | Community (GitHub) | Email / Hub (24h SLA) | 4h business + 24/7 on-call |
| SLA contractuel | Best-effort | Best-effort | 99.5% to 99.9% |
| Monthly strategic advisory | — | — | ✅ (Video conference) |

## Enterprise features within Community modules

Some Community modules expose **base capabilities** for free, while their **advanced analytics or automation** are gated behind a paid feature flag. The module itself ships in Community (you can use it, extend it, fork it under AGPL-3.0); the gated features are unlocked only when the corresponding tier is active in your tenant.

This pattern lets us keep the Community edition genuinely useful (you have the data, you can list and act on it) while reserving the high-leverage analytics and automation for paying customers.

| Community module | Free capability | Gated feature | Tier required |
|---|---|---|---|
| `cs_quoterequest` (lead) | List, filter, qualify manually | Lead CAPA (cost per acquisition), Lead CA (revenue attribution), AI scoring, auto-routing | Pro Cloud / Enterprise |
| `cs_quote` (B2B quote) | Create, send PDF, basic templates | Multi-step approval, e-signature, escalation rules | Pro Cloud / Enterprise |
| `cs_savapi` (after-sales) | Create ticket, basic status | SLA tracking, auto-escalation, AI sentiment analysis | Pro Cloud / Enterprise |
| `cs_invoice` | Issue invoice, basic templates | Multi-currency reconciliation, dunning automation, exposure to `cs_bank` | Pro Cloud / Enterprise |
| `cs_subscription` | Create/cancel/update | Churn prediction (AI), upgrade/downgrade flows | Pro Cloud / Enterprise |
| `cs_loyalty` | Points balance, basic tiers | Predictive lifetime value, tier-jump nudges, AI offer personalization | Pro Cloud / Enterprise |
| `cs_categoryextra` / `cs_productextra` | Extend native PS data | AI auto-fill (descriptions, alt-text, schema.org), bulk image regeneration | Pro Cloud / Enterprise |
| `cs_seoconsole` | Read GSC summary | Recommendation engine, click-through optimization, content brief | Pro Cloud / Enterprise |

All gated features above are **included in their respective tier** — no per-feature à-la-carte.

**Why this matters** : a competitor forking Community alone gets a working B2B commerce platform. They do **not** get the analytics that turn lead lists into revenue forecasting, the AI that turns ticket queues into sentiment dashboards, or the direct pipeline to our dedicated autonomous engineering agent fleet. That's the moat.

**Implementation** : feature gating uses the `ps_cs_marketplace` table + `useFeatureFlag('lead.capa')` composable. In Community, the flag is always `false` and the UI renders an upgrade card with a CTA. In paid tiers, the flag is read from the tenant's active subscription.

## License

- **Community** is licensed under [AGPL-3.0-or-later](LICENSE). You can use it commercially, run it for clients, modify it. If you distribute a modified version (including as a SaaS), you must publish your modifications under the same license.
- **Pro Cloud & Enterprise Scale** are managed offerings operated by CodeMyShop SAS on sovereign French infrastructure (OVHcloud) with leased access to the CodeMyShop dedicated autonomous agent fleet.

## Why open-core?

We believe the **only honest model** for a commerce platform like ours is :

1. **The base must be free, libre, and complete enough to ship a real shop.** No "demo trial" with crippled features. If you can run your shop on Community alone, do it.
2. **The hosted, productivity, and agentic layers are paid.** Running continuous AI enrichment costs money in compute and inference. Maintaining banking and payment integrations requires regulatory contracts. Operating sovereign VPS infrastructure with 24/7 autonomous agents is operationally demanding.
3. **What you pay for is operational leverage and autonomous delivery, not locked features.** You can self-host Community forever. Most customers convert to Pro Cloud or Enterprise Scale because running production e-commerce at scale is exhausting — and having an AI fleet handling custom design, SEO, and updates on demand provides unbeatable leverage.

## Contributing back

If you build something on Community that you think belongs upstream — a new payment provider, a UX improvement, a translation, a vertical adapter — we welcome contributions. See `CONTRIBUTING.md`.

If you build a vertical pack for an industry we don't yet cover (automotive, B2B services, professional tools), we'd love to hear from you. We can either :
- Merge your module into Community if it's broadly useful
- Co-publish it as an Enterprise vertical pack with revenue share
- Reference your work in the ecosystem registry

## How to evaluate

1. **Try Community (0 €).** `docker compose up`, follow the [getting started](README.md#quick-start). Free forever under AGPL-3.0, full code, BYOK.
2. **Upgrade to Pro Cloud (490 €/mo HT).** Managed VPS 8GB in France (OVHcloud), 0 € setup, monthly cancellable. Full AI SEO suite + continuous access to the autonomous agent fleet (1 active request at a time, 48-72h turnaround).
3. **Scale to Enterprise (1 200 – 1 800 €/mo HT).** Multi-tenant dedicated cluster, parallel task queue, dedicated SLA (99.5% – 99.9%), ERP connectors (Sage, Cegid, EBP, SAP) on demand, and monthly strategic review with the founder architect.

---

> Last updated: 2026-10-10. This document is the public counterpart of the internal `MODULES_EDITION.md`. If you spot a discrepancy or believe a feature should be repositioned, open a discussion.
