# Linky Platform -- System Specification Documentation Index

Version: 1.0.0
Last Updated: 2026-03-06
Classification: Internal / Technical Due Diligence

---

## Purpose

This document serves as the master index and navigation map for the complete Linky platform system specification. It provides a structural overview of all documentation files, a glossary of system-wide terminology, and cross-reference mappings between system components.

---

## Documentation Tree

```
docs/
 ├── ref.md                          ← This file (index, glossary, navigation)
 ├── en/                             ← English documentation
 │    ├── 01-overview.md             ← Platform overview, tech stack, project structure
 │    ├── 02-architecture.md         ← System architecture, layer model, data flow
 │    ├── 03-authentication.md       ← Clerk auth, JWT flow, middleware, webhooks
 │    ├── 04-video-chat-system.md    ← WebRTC, rooms, signaling, call lifecycle
 │    ├── 05-matchmaking.md          ← Queue, scoring, embedding similarity, state stores
 │    ├── 06-embedding-system.md     ← Ollama, semantic profiles, vector storage
 │    ├── 07-economy-system.md       ← Coins, EXP, wallet, shop, boosts, prestige, seasons
 │    ├── 08-notification-system.md  ← Push, socket delivery, MQTT presence
 │    ├── 09-admin-system.md         ← Admin roles, CRUD, economy simulation, broadcasts
 │    ├── 10-caching-architecture.md ← Redis cache-aside, keys, TTLs, invalidation
 │    ├── 11-security-model.md       ← Auth, rate limiting, RLS, anti-abuse, CORS
 │    ├── 12-database-schema.md      ← All tables, columns, views, RPC functions
 │    ├── 13-socket-events-map.md    ← All Socket.IO events, payloads, namespaces
 │    ├── 14-api-contracts.md        ← All HTTP endpoints, methods, request/response
 │    ├── 15-server-actions.md       ← Next.js server actions, caching, revalidation
 │    ├── 16-observability.md        ← Sentry, Pino logging, telemetry, monitoring
 │    ├── 17-deployment.md           ← Docker, Vercel, infrastructure topology
 │    ├── 18-performance-strategy.md ← Caching, query optimization, bundle strategy
 │    ├── 19-scalability-strategy.md ← Horizontal scaling, Redis vs in-memory, hybrid
 │    └── 20-known-limitations.md    ← Current constraints, tech debt, partial features
 │
 └── vi/                             ← Vietnamese documentation (mirrors en/)
      ├── 01-overview.md
      ├── 02-architecture.md
      ├── ... (same structure as en/)
      └── 20-known-limitations.md
```

---

## Navigation Map

### Core Platform

| Document | Scope | Key Dependencies |
|----------|-------|-----------------|
| [01-overview](en/01-overview.md) | Platform purpose, tech stack, monorepo structure | None |
| [02-architecture](en/02-architecture.md) | Layer model, domain-driven design, data flow | 01 |
| [03-authentication](en/03-authentication.md) | Clerk integration, JWT, webhooks, middleware | 02 |

### Real-Time Systems

| Document | Scope | Key Dependencies |
|----------|-------|-----------------|
| [04-video-chat-system](en/04-video-chat-system.md) | WebRTC, rooms, signaling, call lifecycle | 02, 03, 05 |
| [05-matchmaking](en/05-matchmaking.md) | Queue, scoring algorithm, embedding similarity | 02, 06 |
| [06-embedding-system](en/06-embedding-system.md) | Ollama, semantic profiles, pgvector | 02, 12 |

### Economy and Engagement

| Document | Scope | Key Dependencies |
|----------|-------|-----------------|
| [07-economy-system](en/07-economy-system.md) | Coins, EXP, wallet, shop, boosts, prestige, seasons, stabilizer | 02, 04, 12 |
| [08-notification-system](en/08-notification-system.md) | Push notifications, socket delivery, MQTT presence | 02, 13 |

### Administration and Security

| Document | Scope | Key Dependencies |
|----------|-------|-----------------|
| [09-admin-system](en/09-admin-system.md) | Admin roles, CRUD, economy simulation, broadcasts | 02, 03, 07 |
| [10-caching-architecture](en/10-caching-architecture.md) | Redis cache-aside, keys, TTLs, invalidation rules | 02 |
| [11-security-model](en/11-security-model.md) | Auth flow, rate limiting, RLS, anti-abuse | 03, 10 |

### Technical Reference

| Document | Scope | Key Dependencies |
|----------|-------|-----------------|
| [12-database-schema](en/12-database-schema.md) | All tables, columns, views, RPC functions | 02 |
| [13-socket-events-map](en/13-socket-events-map.md) | All Socket.IO events, payloads, namespaces | 04, 05 |
| [14-api-contracts](en/14-api-contracts.md) | All HTTP endpoints, methods, request/response | 02, 03 |
| [15-server-actions](en/15-server-actions.md) | Next.js server actions, caching, revalidation | 14 |

### Operations

| Document | Scope | Key Dependencies |
|----------|-------|-----------------|
| [16-observability](en/16-observability.md) | Sentry, Pino logging, telemetry | 02 |
| [17-deployment](en/17-deployment.md) | Docker, Vercel, infrastructure topology | 02 |
| [18-performance-strategy](en/18-performance-strategy.md) | Caching, query optimization, bundle strategy | 10, 17 |
| [19-scalability-strategy](en/19-scalability-strategy.md) | Horizontal scaling, hybrid architecture | 17, 18 |
| [20-known-limitations](en/20-known-limitations.md) | Constraints, tech debt, partial features | All |

---

## Vietnamese Documentation (vi/)

The same 01-20 structure is available in Vietnamese under [docs/vi/](vi/). Each file mirrors the English counterpart with professional technical terminology and consistent structure. Use [vi/01-overview.md](vi/01-overview.md) as the entry point for Vietnamese readers.

---

## System Glossary

### Platform Concepts

| Term | Definition |
|------|-----------|
| **Linky** | The production real-time video chat platform documented in this specification |
| **Domain** | A bounded business context in the backend (e.g., `user`, `video-chat`, `economy`) following domain-driven design |
| **Context** | A cross-domain orchestration module located in `apps/api/src/contexts/` that coordinates between multiple domains |
| **Feature** | A user-facing capability in the frontend (e.g., `chat`, `admin`, `notifications`) containing UI, hooks, API calls |
| **Entity** | A core data concept used across multiple features (e.g., `user`, `notification`, `call-history`) |

### Architecture Terms

| Term | Definition |
|------|-----------|
| **Service Role** | Supabase client configured with the service role key, bypassing RLS for server-side operations |
| **Cache-Aside** | Pattern where Redis serves as read-optimization layer; database is always source of truth |
| **getOrSet** | Core caching function: attempts Redis read, falls back to database, writes result to Redis |
| **withRedisTimeout** | Wrapper ensuring all Redis operations fail within configured timeout (default 5s) |
| **Namespace** | Socket.IO namespace isolating different connection types: `/chat`, `/admin` |

### Economy Terms

| Term | Definition |
|------|-----------|
| **EXP (Experience)** | Time-based currency earned through call duration (1 second = 1 EXP base) |
| **Coin** | Virtual currency obtained by converting EXP; used for shop purchases and boosts |
| **Vault** | Protected coin storage immune to seasonal decay |
| **Prestige** | Level reset mechanism granting vault bonuses and rank progression |
| **Seasonal Decay** | Periodic reduction of coin balances above a threshold when a season ends |
| **Stabilizer** | Automated economy health system that adjusts conversion rates, prices, and decay based on metrics |
| **Mint** | Total coins created in the system |
| **Burn** | Total coins removed from circulation (via purchases, decay) |
| **Whale Dominance** | State where top 10% of users hold >65% of total coin supply |

### Matchmaking Terms

| Term | Definition |
|------|-----------|
| **Queue** | Ordered collection of users waiting to be matched for video chat |
| **Candidate Pair** | Two users evaluated for potential matching |
| **Scoring** | Algorithm computing match quality based on interests, favorites, embeddings, wait time |
| **Fairness Bonus** | Score increment proportional to average wait time, capped at 20 points |
| **Skip Cooldown** | Temporary penalty preventing re-matching of recently skipped pairs |
| **Embedding Similarity** | Cosine similarity between user profile vectors used in scoring |

### User System Terms

| Term | Definition |
|------|-----------|
| **Streak** | Consecutive days where a user accumulates sufficient call time (valid day) |
| **Streak Freeze** | Consumable item that preserves streak continuity across a missed day |
| **Level** | User progression metric calculated from total EXP using quadratic formula |
| **Level Reward** | Coins granted automatically upon reaching specific levels |
| **Feature Unlock** | Platform capabilities gated behind level requirements |
| **Interest Tag** | User-selected topic labels used for matchmaking scoring |

### Infrastructure Terms

| Term | Definition |
|------|-----------|
| **Clerk** | Third-party authentication provider handling user identity, JWT tokens, and webhooks |
| **Supabase** | Managed Postgres database platform with client SDK, RPC functions, and RLS |
| **Ollama** | Self-hosted LLM inference server used for generating text embeddings |
| **nomic-embed-text:v1.5** | The specific embedding model deployed on Ollama for profile vectorization |
| **pgvector** | Postgres extension enabling vector storage and similarity search |
| **MQTT** | Lightweight messaging protocol used for user presence (online/offline status) |
| **VAPID** | Voluntary Application Server Identification for Web Push notifications |
| **Cloudflare TURN** | TURN server service for WebRTC NAT traversal |

---

## Cross-Reference: Domain to Database Tables

| Domain | Primary Tables |
|--------|---------------|
| user | `users`, `user_details`, `user_settings`, `user_levels`, `user_streaks`, `user_streak_days`, `user_blocks`, `user_streak_freeze_inventory`, `user_streak_freeze_grants`, `user_level_rewards`, `user_exp_daily` |
| video-chat | `call_history` |
| matchmaking | `user_favorites`, `user_embeddings`, `interest_tags`, `user_blocks` |
| reports | `reports`, `report_contexts` |
| economy | `user_wallets`, `user_coin_transactions` |
| economy-shop | `shop_items` (via RPC), `user_shop_purchases` (via RPC) |
| economy-boost | `user_boosts` (via RPC) |
| economy-daily | `user_exp_daily` |
| economy-weekly | `user_weekly_checkins` (via RPC) |
| economy-monthly | `user_monthly_checkins` (via RPC) |
| economy-season | `seasons`, `economy_metrics_daily`, `economy_health_reports` |
| economy-prestige | via `prestige_user` RPC |
| notification | `notifications`, `push_subscriptions` |
| admin | `admin_config`, `admin_users_unified` (view), `broadcast_history`, `changelogs`, `level_rewards`, `level_feature_unlocks`, `interest_tags`, `favorite_exp_boost_rules`, `streak_exp_bonuses`, `economy_config` |

---

## Cross-Reference: Frontend Features to Backend Domains

| Frontend Feature | Backend Domain(s) | Socket Namespace |
|-----------------|-------------------|-----------------|
| `features/chat` | video-chat, matchmaking | `/chat` |
| `features/admin` | admin, reports, economy-season | `/admin` |
| `features/user` | user | N/A |
| `features/notifications` | notification | `/chat` |
| `features/realtime` | video-chat | `/chat` |
| `features/call` | video-chat | `/chat` |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-06 | System Architect | Initial complete specification |
