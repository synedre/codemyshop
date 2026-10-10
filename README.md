<p align="center">
  <a href="https://codemyshop.com">
    <img src="logo-cms-512.png" alt="CodeMyShop" width="180" height="180">
  </a>
</p>

<h1 align="center">CodeMyShop</h1>

<p align="center">
  <strong>Open-source e-commerce in the age of agentic AI.</strong><br>
  100% TypeScript stack: Nuxt 4 + Drizzle + PostgreSQL (pgvector). AGPL-3.0. 0% platform tax. Built in France in 2026.
</p>

<p align="center">
  <a href="https://demo.codemyshop.com"><strong>Live demo →</strong></a> ·
  <a href="https://codemyshop.com"><strong>Website →</strong></a> ·
  <a href="INSTALL.md"><strong>Install →</strong></a> ·
  <a href="https://codemyshop.com/rdv"><strong>Architecture Session →</strong></a>
</p>

<p align="center">
  <a href="https://www.gnu.org/licenses/agpl-3.0"><img src="https://img.shields.io/badge/License-AGPL_v3-blue.svg" alt="License: AGPL v3"></a>
  <a href="https://nuxt.com"><img src="https://img.shields.io/badge/Nuxt-4-00DC82" alt="Built with Nuxt 4"></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-17-336791" alt="PostgreSQL 17"></a>
  <a href="https://github.com/synedre/codemyshop/pkgs/container/codemyshop"><img src="https://img.shields.io/badge/ghcr.io-synedre-2496ED?logo=docker&logoColor=white" alt="Docker image"></a>
  <a href="https://github.com/synedre/codemyshop/actions/workflows/ci.yml"><img src="https://github.com/synedre/codemyshop/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://archive.softwareheritage.org/browse/origin/?origin_url=https://github.com/synedre/codemyshop"><img src="https://archive.softwareheritage.org/badge/origin/https://github.com/synedre/codemyshop/" alt="Archived | Software Heritage"></a>
  <img src="https://img.shields.io/badge/Status-production_ready-emerald" alt="Status: production ready">
</p>

## Try it in 30 seconds

A live single-tenant demo (white-labelled as **Monsta Skate Co**) runs at **[demo.codemyshop.com](https://demo.codemyshop.com)**. Browse the storefront, check the admin hub, see what €0 commission looks like.

Or run it locally:

```bash
docker run --rm -p 3000:3000 ghcr.io/synedre/codemyshop:latest
# → http://localhost:3000
```

## Pick your install path

CodeMyShop has **two distinct personas**. Pick yours and follow the matching path — they have very different setups.

<table>
<tr>
<td width="50%" valign="top">

### 🏪 You're a shop owner

You want **one** sovereign e-commerce site for your business. No agency lock-in, no plans to host other people's shops.

**What you get** in 5 minutes: a Nuxt 4 storefront + unified merchant cockpit + AI suite + Postgres on your own sovereign server.

→ Jump to [Quick start (Community, self-host)](#quick-start-community-self-host)  
→ Managed option with autonomous agent fleet: [Pro Cloud](#plans) (490 €/mo)  
→ Production hardening: [INSTALL.md](INSTALL.md)

</td>
<td width="50%" valign="top">

### 🏢 You're an agency, hoster, or franchise

You want to host **5-50 e-commerce sites** for your clients on shared infrastructure: one codebase to maintain, isolated databases per client, 30-min onboarding.

**What you get**: container-per-tenant isolation, `bin/init-tenant.sh` scripted onboarding, working multi-tenant `docker-compose` example.

→ Jump to [Multi-tenant (agency / hoster)](#multi-tenant-agency--hoster)  
→ Full procedure: [INSTALL-MULTI-TENANT.md](INSTALL-MULTI-TENANT.md)

</td>
</tr>
</table>

## Why CodeMyShop

- **Sovereign by design** — Your code, your data, your server. Hosted in France (OVHcloud) or self-hosted. Zero exposure to the US CLOUD Act.
- **Modern unified TypeScript stack** — Nuxt 4 SSR + Nitro + Drizzle ORM + PostgreSQL 17 (pgvector) + Redis + nginx. One process, atomic deploys in a single `git push`.
- **Agentic AI & Autonomous Fleet Access** — CodeMyShop connects your shop directly to a dedicated autonomous AI agent fleet (33 specialized agents). Your custom requests (landing pages, merchandising rules, UI components, SEO campaigns) are designed, tested, and deployed continuously without agency retainer fees.
- **Unified Merchant Cockpit & B2B Hub** — Beyond a fast storefront (< 300 ms, PageSpeed 95+): an integrated back-office with B2B buyer accounts (Salesforce replacement), 28-second keyboard Order Pad, dynamic multi-tier pricing matrices, real-time lot/stock traceability, and instant technical catalog search (< 12 ms).
- **Native Model Context Protocol (MCP)** — Expose catalog, inventory, and analytics via secure MCP servers to pilot your store, Search Console, and Google Ads directly from your own Claude or ChatGPT.
- **Zero commission** — 0 % platform tax on your sales (vs 1.5–2 % on proprietary platforms). On €750k of yearly GMV, that is €15,000 preserved margins every year.
- **Open-source AGPL-3.0** — Fully auditable, modifiable, forkable. No vendor lock-in. The AGPL clause defends the community against predatory proprietary SaaS forks.

## Status

**Production-ready.** Core runtime active in production across live enterprise tenants (including wholesale B2B at Rungis and high-technicality automotive catalogs). Available as free open-source (Community) and managed sovereign cloud (Pro Cloud / Enterprise Scale).

## Plans

CodeMyShop follows a clear **open-core & managed sovereign PaaS** model. Three straightforward tiers — one free self-host (Community) and two hosted Managed plans. **No setup fees on Pro Cloud, monthly cancellation, zero vendor lock-in.**

| | **Community** | **Pro Cloud** (Most popular) | **Enterprise Scale** |
|---|:---:|:---:|:---:|
| **Price** | **Free** (AGPL-3.0) | **490 € / mo excl. VAT** | **1,200 – 1,800 € / mo excl. VAT** |
| **Hosting** | Self-host | Managed Sovereign VPS France (OVH, 8 GB dedicated) | Dedicated Sovereign Server (Multi-region available) |
| **Setup fee** | 0 € | **0 € (Setup included)** | Custom scoping on quote (ERP/data ETL) |
| **Commitment** | None | **Monthly, cancel anytime** | Annual or monthly flexible |
| **Target** | Devs, tech teams, agencies, self-hosters | SMBs & e-merchants (500k€ – 1.5M€ revenue) | High-volume merchants, multi-shop, wholesale B2B |
| **Autonomous Fleet Access (AI Team)** | BYOK generic connectors | **Included (1 active request at a time, 48-72h turnaround)** | **Advanced (Priority parallel multi-request queue)** |
| **Autonomous Fleet Scope** | — | Storefront, catalog, landing pages, merchandising, SEO | ERP connectors, custom workflows, multi-store architecture |
| **AI SEO Suite** | Self-configured | Search Console intelligence + automated content | Complete AIO suite + custom LLM knowledge bases |
| **Maintenance & Security** | Self-managed | Patches CVE < 48h + 24/7 monitoring + daily backups | SLA 99.5% – 99.9% + 24/7 on-call engineering |
| **Strategic Advisory** | Community GitHub | Asynchronous via Hub (brief, email, audio) | **Monthly strategic video conference** with team |
| **CodeMyShop Payments** | 0% (BYO PSP) | Optional 0% platform tax | Volume discounts on subscription fee |

> **The "1 active request" Kanban rule on Pro Cloud (490 €/mo):**  
> Clients maintain an unlimited backlog of requests. Our autonomous agents execute **one active request at a time** (typical delivery: 48 to 72 hours). As soon as an evolution is deployed and validated, the next one starts. This delivers ~8 to 12 production evolutions every month without agency retainers. Deep ERP integrations (Sage, Cegid, SAP) and Fractional CTO advisory belong to Enterprise Scale or dedicated advisory contracts.

→ **Full details & booking:** [codemyshop.com/#investissement](https://codemyshop.com/#investissement)  
→ **Schedule an Architecture Session (45 min):** [codemyshop.com/rdv](https://codemyshop.com/rdv)

## Quick start (Community, self-host)

### Full stack with Docker Compose

The bundled `docker-compose.yml` boots PostgreSQL + Redis + nginx + the
Nuxt server (pulled from `ghcr.io/synedre/codemyshop:latest` by default):

```bash
git clone https://github.com/synedre/codemyshop.git
cd codemyshop
cp .env.example .env  # set PG_PASSWORD, REDIS_PASSWORD, NUXT_SECRET

docker compose up -d
PG_SCHEMA=codemyshop npm run db:migrate    # one-time: create the ~50 tables
npm run seed:admin                         # one-time: bootstrap an admin
npm run seed:demo                          # optional: populate demo data
```

Image tags: `latest`, `0.1.3`, `0.1` (linux/amd64, ~446 MB).

### From source

Prerequisites: Node 22+, PostgreSQL 17+ with `pgvector`, Redis 7+.

```bash
git clone https://github.com/synedre/codemyshop.git
cd codemyshop
cp .env.example .env
npm install
npm run db:migrate
npm run seed:admin
npm run dev    # → http://localhost:3000
```

→ See [INSTALL.md](INSTALL.md) for production hardening (TLS, backups, env vars).

## Multi-tenant (agency / hoster)

If you operate an agency or sovereign hosting service, you can host **N independent clients** on a single VPS with one shared codebase. Each tenant gets its own Postgres database and Nuxt process — physically isolated, no risk of cross-tenant data leak — but they all benefit from the same `core/` code (one bug fix → all clients patched).

### What this looks like

```
Your VPS
│
├── codebase: /opt/codemyshop/    (one git clone, shared by all tenants)
│
├── acme_postgres + acme_nuxt        → port 3001 → acme.com
├── monaco_postgres + monaco_nuxt    → port 3002 → monaco-skate.com
└── paris_postgres + paris_nuxt      → port 3003 → paris-vape.com

       ▲ each tenant = a tiny Nuxt sub-project (clients/<tenant>/)
       ▲ that does `extends: ['../../core']`
```

### Add a tenant in 30 minutes

```bash
# 1. Bootstrap the tenant pack from the demo template
./bin/init-tenant.sh acme \
    --brand "Acme Shop" \
    --domain acme.com \
    --vertical general

# 2. Provision the tenant DB (one container per tenant)
docker run -d --name acme_postgres -p 127.0.0.1:5433:5432 \
    -e POSTGRES_DB=acme -e POSTGRES_USER=acme \
    -e POSTGRES_PASSWORD="$(openssl rand -hex 32)" \
    pgvector/pgvector:pg16

# 3. Update clients/acme/.env with the PG_PASSWORD you just generated.

# 4. Seed the DB from clients/acme/seed.yaml (theme, header, footer, categories…)
npm run seed:tenant -- acme --reset --with-admin admin@acme.com

# 5. Build + run the tenant's Nuxt process
cd clients/acme && npm install && npm run build && PORT=3001 npm run preview

# 6. nginx route: server { server_name acme.com; proxy_pass http://127.0.0.1:3001; }
```

→ Full procedure with PM2, TLS per tenant, backups, scaling: [INSTALL-MULTI-TENANT.md](INSTALL-MULTI-TENANT.md)
→ Working two-tenant Docker Compose example: [examples/multi-tenant/](examples/multi-tenant/)
→ Why container-per-tenant (not schema-per-tenant): [ARCHITECTURE.md § Multi-tenancy](ARCHITECTURE.md#multi-tenancy)

### Agency margin math (vs single-tenant PrestaShop / WooCommerce)

| Metric | PrestaShop / Woo (1 install per client) | CodeMyShop multi-tenant |
|---|---|---|
| Maintenance for 30 clients | 30 × ~2 h/month = 60 h | 1 × ~2 h/month + per-tenant SLA = ~10 h |
| Onboarding time per client | 1-3 days of setup | 30 min via `init-tenant.sh` |
| Codebase to know | 30 forks, slowly diverging | 1 official codebase |
| Critical bug fix | Cherry-pick into 30 forks | One commit, redeploy all |
| Net margin per client/month (you decide pricing) | ~€30 (eaten by maintenance) | ~€200-400 (90% automated) |

The multi-tenant capability is **the** differentiator vs every other OSS e-commerce (PrestaShop, EverShop, Medusa, Saleor are all single-instance by design). If you operate an agency, this is what makes CodeMyShop economically interesting at 10+ clients.

## Beyond agency hosting: the sovereign triptych

Multi-tenant doesn't have to mean "agency selling shops to clients." The same architecture also enables a pattern we call the **sovereign triptych** — one founder running their own brand stack from a single codebase. The git clone gives you the mothership; the mothership ships the modules that deploy the boutique; the boutique ships the modules that deploy the media brand.

```
mothership ──[deploys]──▶ boutique ──[deploys]──▶ media
(founder brand)          (commerce)              (content / channel)
```

Three layers, three roles, one repo:

| Layer | Brand example | Purpose | Modules at this layer |
|---|---|---|---|
| **mothership** | personal site of the founder | identity, manifesto, lead capture, dashboard for all downstream tenants | hub, agents, dispatch, init-tenant, theme registry, … |
| **boutique** | the e-commerce destination | products, payment, fulfilment | quote, payment, smart-orders, marketplace, … |
| **media** | YouTube channel, blog, newsletter | audience-building content that feeds the boutique | autosocial-post, content-queue, covergen, branddna, … |

Each layer feeds the next: the founder's audience trusts the boutique, the boutique's customers fuel the media, the media compounds the founder's reach. All three brands share the same Postgres clusters, the same auth, the same theme system — no third tool to integrate. The whole stack is **yours**: no platform tax (Shopify), no algorithmic gatekeeper (Substack / YouTube monetization rules), no vendor lock-in.

> We eat our own dog food: the codebase you're reading lives at the second layer of our own triptych — founder brand → CodeMyShop boutique → media channel.

## Architecture

A single Node.js process (Nuxt 4 Nitro) handles:

- product catalog (PostgreSQL via Drizzle ORM)
- storefront experience (Vue 3 SSR)
- admin hub / back-office
- Centaure AI (autonomous SEO content via OpenAI / Anthropic / Mistral)

No microservices, no API bridge between two systems: atomic deploy with a single `git push`.

→ See [ARCHITECTURE.md](ARCHITECTURE.md) for the technical rationale (why monolith over headless, why Nuxt over Next, why Drizzle over Prisma) and [documentation/SCHEMA_HISTORY.md](documentation/SCHEMA_HISTORY.md) for the story behind the `cs_*` table prefix (and why v0.2.0 was a breaking rename).

## Stack

| Layer | Tech | Why |
|-------|------|-----|
| Runtime | Nuxt 4 (Nitro server, Vue 3 SSR) | Single TS codebase for storefront + admin + API |
| ORM | Drizzle ORM | TypeScript-native, no codegen, easy raw SQL escape hatch |
| Database | PostgreSQL 17 + pgvector | Mature, sovereign, vector embeddings for AI |
| Cache | Redis 7 | Sessions, rate limit, ephemeral state |
| Web server | nginx | Reverse proxy, SSL, static assets, rate limit |
| Agentic AI | Autonomous Agent Fleet | 33 specialized agents for autonomous run & build |
| Model Context Protocol | Native MCP Servers | Secure live bridge for Claude & ChatGPT merchant assistants |
| Analytics & Ads | GA4 + Google Search Console + Google Ads | Unified acquisition telemetry, AIO indexing, and MCP automation |
| Process manager | PM2 | Graceful reload, monitoring, log aggregation |

## Provenance

Every published image is **signed with [cosign](https://docs.sigstore.dev/cosign/overview/) (keyless OIDC)** and ships a **CycloneDX SBOM** as a cosign attestation. Verify any release before running it:

```bash
cosign verify \
  --certificate-identity-regexp '^https://github\.com/synedre/codemyshop/\.github/workflows/docker\.yml@refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/synedre/codemyshop:latest
```

→ See [SECURITY.md § Verifying releases](SECURITY.md#verifying-releases) for the SBOM-download recipe and full details.

## Community

- **[GitHub Discussions](https://github.com/synedre/codemyshop/discussions)** — questions, ideas, "show what you've built"
- **[GitHub Issues](https://github.com/synedre/codemyshop/issues/new/choose)** — bugs and feature requests (templates provided)
- **Discord** — coming soon (we'll open it once there are 5+ active installations to keep the channel alive)
- **Twitter/X** — [@codemyshop](https://twitter.com/codemyshop) (coming soon)

## Contributing

We welcome PRs. See [CONTRIBUTING.md](CONTRIBUTING.md). Code reviews are mandatory, CI must pass, and we use [Conventional Commits](https://www.conventionalcommits.org/).

For security issues, please follow [SECURITY.md](SECURITY.md) — do **not** open a public issue.

## License

**AGPL-3.0** — see [LICENSE](LICENSE).

> The AGPL clause requires SaaS forks to publish their modifications under AGPL too. It protects the commons against predatory forks (the MongoDB / Elastic / Plausible model). Private and self-hosted use stays unrestricted.

## Trademark

**CodeMyShop®** is a registered trademark at the EUIPO. You can fork and self-host freely, but a fork cannot present itself under the "CodeMyShop" name without prior written authorization.

## Acknowledgments

Built in France in 2026 with [Claude Code](https://claude.com/claude-code). Inspired by the open-source ethos of MongoDB, Plausible, n8n, and Supabase.

> CodeMyShop is the commerce layer of a broader sovereignty vision. The manifesto and the *why* behind the project live at **[synedre.com](https://synedre.com)**.

---

🇫🇷 *Lire ce README en français : [README.fr.md](README.fr.md)* (à venir)
