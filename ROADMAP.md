# Roadmap

Public 12-month roadmap for CodeMyShop. We update this quarterly.

> Conventions: ✅ done, 🚧 in progress, 📅 planned, 💭 considering.

---

## H1 2026 (mai – octobre 2026)

### Foundation

- ✅ Nuxt 4 + Drizzle PG + Redis monolith stable in production across multiple live verticals (food B2B, automotive, home & CHR, sports)
- ✅ AGPL-3.0 publication + governance setup
- 🚧 First external community installations (target: 3 documented installs by Q4 2026)
- 🚧 Discord & GitHub community channels
- 📅 Stripe billing & onboarding for official tiers (Community / Pro Cloud / Enterprise Scale)
- 📅 Ansible playbook hardening (UFW, fail2ban, daily backup to S3/OVH)

### Storefront

- ✅ SSR product pages with structured JSON-LD & PageSpeed 100
- ✅ Cart, checkout, payment via SystemPay (CB) and Stripe
- ✅ Customer account self-service (orders, invoices, addresses)
- 📅 Wishlists and product comparison
- 📅 B2B quote-to-cart workflow
- 💭 Live chat & AI concierge module

### Admin hub

- ✅ Product CRUD with i18n, variants, multipack pricing
- ✅ Category CRUD with polymorphic FAQ
- ✅ Order management with status workflow
- ✅ CRM with leads, customers, B2B accounts & buyer management
- ✅ Email templates with i18n DB-first
- 📅 Marketing automation (cart recovery, post-purchase, win-back)
- 📅 Vendor / supplier management
- 📅 Inventory transfers between warehouses & lot tracking

### Agentic AI & Autonomous Fleet

- ✅ Autonomous agent fleet access (agents for design, code, SEO, catalog enrichment)
- ✅ Model Context Protocol (MCP) server for Claude / IDE / Cursor integration
- ✅ SEO article generation & automated internal linking
- ✅ Product description rewriting & structured spec sheet generation
- ✅ Category cover image generation & visual merchandising
- ✅ FAQ enrichment & polymorphic schemas
- 📅 Multi-agent orchestration via MCP tools (catalog sync, stock alerts, price rules)
- 📅 Embedding-based semantic search & vector recommendations (pgvector)
- 📅 Automated social & marketing asset generation

---

## H2 2026 (novembre 2026 – avril 2027)

### Community growth

- 📅 100+ GitHub stars
- 📅 First external pull request accepted
- 📅 Maintainer contributors recruited (1-2 outside the core team)
- 📅 Quarterly newsletter

### Commercial launch & Growth (Pro Cloud & Enterprise Scale)

- 🚧 Onboarding playbook for Pro Cloud (490 €/mo, 1 active request SLA 48-72h)
- 📅 Enterprise Scale multi-tenant dedicated architecture (1 200 – 1 800 €/mo)
- 📅 Payment flow monetization (`cs_payment`)
- 📅 Per-tenant SLA & latency monitoring dashboards

### Storefront

- 📅 Multi-currency
- 📅 Multi-language (DE, ES, IT in addition to FR / EN)
- 📅 Native PWA install banner
- 💭 Mobile app companion via Capacitor

### Admin hub

- 📅 Real-time dashboard (orders / cart abandonments)
- 📅 A/B testing module for landing pages
- 📅 ERP / accounting connector framework (Sage, Cegid, EBP, SAP, Pennylane)
- 📅 Native AIO & BI analytics (GA4, Google Search Console, Google Ads & LLM indexing)

### Agentic AI & Autonomous Fleet Integration

- 📅 Direct autonomous swarm bridge: one-click task dispatch from Admin Hub to AI agents
- 📅 Automated feedback loops and regression testing for tenant updates
- 💭 Natural language voice & chat interface for admin hub operations

---

## H1 2027

### Vertical specialization

- 📅 Verticale `food.codemyshop.com` — agroalimentaire B2B (lots, DLC, poids variable, grilles tarifaires multi-niveaux, Quick Order)
- 💭 Verticale `vape.codemyshop.com` — vape / tobacco compliance
- 💭 Verticale `bike.codemyshop.com` — sport / gear

### Scale

- 📅 Kubernetes deploy option for high-volume stores
- 📅 Read-replica routing for analytics queries
- 📅 Sub-tenant model for marketplaces

### Compliance

- 📅 GDPR consent management certification
- 📅 PCI-DSS scope minimization (tokenization)
- 💭 ISO 27001 path

---

## What we won't do (anti-roadmap)

We deliberately reject some features that complicate the platform without proportional benefit:

- ❌ **Headless architecture** — the monolith is a feature, not a limitation. See [ARCHITECTURE.md](ARCHITECTURE.md).
- ❌ **Plugin marketplace with binary distribution** — modules ship via PRs into the core. No App Store, no quality lottery.
- ❌ **Vendor-specific SaaS lock-in** — every dependency is replaceable. No tight coupling to AWS, Vercel, Cloudflare, etc.
- ❌ **Closed-source paid modules** — the core is 100% open source under AGPL-3.0. Premium features and ongoing evolution are delivered via Managed Cloud and autonomous agent fleet access (service tiers), never paywalled behind closed binaries.
- ❌ **Auto-upgrades that change DB schema without consent** — every breaking change is announced in CHANGELOG and gated behind a manual `npm run db:migrate`.

## How to influence the roadmap

- Open a [GitHub Discussion](https://github.com/synedre/codemyshop/discussions) with your use case
- 👍 reactions on existing discussions / issues weight prioritization
- Access ongoing feature development via the Pro Cloud plan (autonomous agent fleet access included)
- For Enterprise customers: priority feature development via your dedicated architect

