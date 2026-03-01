# Frontend Architecture Guidelines

**Version:** 1.0  
**Scope:** apps/web (Next.js 16 App Router frontend)  
**Status:** Architectural contract for the team; audit-based.

---

## 1. Title

Frontend Architecture Guidelines — Linky Web App

---

## 2. Executive Summary

This document defines the frontend architecture for the Linky web application (Next.js 16, App Router) and serves as the official contract for structure, layers, dependencies, and processes. It is based on an audit of the current codebase and separates **Current State Issues** from **Recommended Architecture**. All new and modified code must follow the recommended rules; existing violations are documented so they can be addressed over time without blocking development.

---

## 3. Current Architecture Overview

The frontend lives under `apps/web/src/` and is organized as follows:

- **app/** — Next.js App Router: route groups `(app)`, `(auth)`, `(marketing)` and `app/api/` for route handlers and API proxies.
- **actions/** — Server actions (e.g. matchmaking, resources: call-history, changelogs, favorites, interest-tags, reports).
- **entities/** — Domain models: call-history, notification, user. Each may contain api, model, types, utils.
- **features/** — Feature modules: admin, auth, call, chat, marketing, notifications, realtime, user. Each may contain api, hooks, lib, model, types, ui.
- **shared/** — Cross-cutting code: env, hooks, model, styles, types, ui, utils. `shared/ui` includes layouts, common components, and data-table definitions (many domain-named).
- **lib/** — Infrastructure: auth, cache, http (adapters, URLs), messaging (MQTT), monitoring, push, realtime (socket), telemetry.
- **providers/** — React context providers: call, clerk, realtime, ui, user.
- **types/** — Barrel file re-exporting types from shared, entities, and selected features (admin, chat).
- **assets/** — Static assets (fonts, images).

Data flow in practice: app pages (server components) fetch via server actions or feature API functions and pass data to client components; client components use providers, feature hooks/stores, and shared UI; features and app routes call lib for HTTP, telemetry, and realtime; shared UI and layouts are used by app and features.

---

## 4. Identified Structural Issues

- **Shared layer contains domain-specific UI:** `shared/ui/data-table/` has subfolders named by domain (admin-reports, blocked-users, broadcasts, call-history, changelogs, favorites, interest-tags, level-rewards, level-feature-unlocks, reports, streak-exp-bonuses, users). These modules import from `@/features/admin` (types and API) and from entities, so shared is not domain-agnostic.
- **Actions placement:** Server actions live at top-level `actions/` (matchmaking + resources). It is unclear whether they belong to a feature or to a dedicated "server actions" layer; some are used by app pages and others by features.
- **Types barrel:** `types/index.ts` re-exports from shared, entities, and features (admin, chat). That creates a central dependency on features and can contribute to circular dependency risk.
- **Inconsistent feature structure:** Features do not all have the same subfolders (e.g. realtime has hooks + model but no api/types/ui; auth and marketing have only ui). No standard "public surface" per feature.
- **Provider vs feature boundary:** Providers import from features and entities. That is acceptable for orchestration but the dependency graph is dense (user provider, socket provider, call manager all pulling from multiple features).

---

## 5. Layer Violation Analysis

- **lib importing domain:** `lib/realtime/socket.ts` imports chat message types and user types; `lib/http/adapters/*` import entity notification and user types. **Rule:** lib must not import from `entities/` or `features/`.
- **shared importing features:** `shared/ui/data-table/*` and `shared/ui/layouts/legal-layout.tsx`, `shared/ui/layouts/header/notifications-bell.tsx` import from features (admin, marketing, notifications). **Rule:** shared must not import from `features/`.
- **Feature-to-feature:** chat and call import each other's types and UI; admin and notifications import realtime. **Rule:** Features must not import other features except through a defined "public API" or shared abstraction (e.g. realtime as a dependency used by call/chat/admin).
- **app and providers:** app pages and providers may import from features, entities, shared, lib, actions. No app-to-app or provider-to-provider coupling observed.

---

## 6. Domain Boundary Analysis

**Domains identified:** call (WebRTC/video), chat (messaging, sidebar, panel), admin (users, reports, broadcasts, changelogs, interest-tags, level-rewards, level-feature-unlocks, streak-exp-bonuses), notifications, user (profile, settings, blocks, favorites, reports, progress, security), auth (sign-in, user button), marketing (landing, legal), realtime (socket, presence, signaling).

**Boundaries:**  
- **call and chat** are tightly coupled (shared call UI and chat types); they should be treated as one "video chat" domain or one must depend on the other unidirectionally.  
- **realtime** is a cross-cutting capability (socket, presence) used by call, chat, admin, notifications — it acts as an internal "service" layer.  
- **user** (entity) is the core user model; **user** (feature) is the profile/settings/blocks surface and correctly uses the entity.  
- **admin** is a clear bounded context (admin-only pages and API).  
- **entities** (call-history, notification, user) are used across features and shared; they should not depend on features.

---

## 7. Naming Convention Analysis

- **Entities:** Use singular and kebab-case for multi-word (e.g. `call-history`, `notification`, `user`). Current inconsistency: entity `notification` vs feature `notifications`. Recommended: entity singular, feature can be plural if it represents the "notifications feature" as a whole.
- **Features:** Use lowercase, one word or kebab-case. Current: admin, auth, call, chat, marketing, notifications, realtime, user. Recommend standardizing on singular for the "slice" name (e.g. `notification` feature vs `notifications`).
- **Files:** kebab-case (e.g. `chat-message.types.ts`, `user-store.ts`, `use-video-chat.ts`). Client entry components often use `-client.tsx`.
- **Folders under shared/ui:** Prefer generic names (e.g. `data-table`, `layouts`). Domain-named folders in shared (e.g. `data-table/admin-reports`) blur boundaries; recommended to move domain-specific table definitions into the owning feature or pass column/config from feature to a generic DataTable.

---

## 8. Scalability Risk Report

| Risk | Level | Description |
|------|--------|-------------|
| Chat–call coupling | High | Bidirectional imports; changes to one often touch the other. |
| Shared–feature dependency | High | shared imports features; feature API changes can break shared. |
| Lib–domain dependency | Medium | lib imports entity/feature types; complicates reuse and testing. |
| No import rules | Medium | No ESLint (or similar) enforcement of layer rules. |
| Inconsistent feature layout | Low | Different features have different subfolders; onboarding cost. |
| Types barrel | Low | Re-exporting features from types can create cycles. |

---

## 9. Recommended Target Architecture

- **Layers (top-down):** app (routing only) → features / pages composition → entities → shared (domain-agnostic) → lib (infrastructure). Providers sit beside app and may depend on features and entities only.
- **Strict rules:** lib must not import entities or features. shared must not import features. features may import entities and shared and lib; features must not import other features except via an explicit dependency (e.g. realtime as a shared capability).
- **Domain-specific UI:** Data table definitions and domain-specific layout pieces that today live under `shared/ui` should move into the owning feature or be supplied by the feature (e.g. columns and API from feature, generic DataTable in shared).
- **Actions:** Either colocate server actions inside the feature they serve (e.g. `features/user/actions/`) or keep a single `actions/` layer that only imports from lib and entities (no feature imports). Prefer colocating in features for clarity.
- **Types:** Prefer importing types from the owning layer (entity/feature) rather than from a central `types/` barrel that re-exports features. Keep `types/` for shared and entity re-exports only, or remove feature re-exports to avoid cycles.

---

## 10. Folder Responsibility Definitions

| Folder | Responsibility | Allowed to import from |
|--------|----------------|-------------------------|
| **app/** | Routing, layouts, page composition, API route handlers. | shared, lib, entities, features, providers, actions |
| **actions/** | Server actions only. | lib, entities, shared (types/env only) — not features |
| **entities/** | Domain models, types, and minimal API/types/utils. | shared (types, utils), lib — not features |
| **features/** | Use-case and UI per feature. | entities, shared, lib, providers; not other features (except allowed deps) |
| **shared/** | Reusable, domain-agnostic code. | lib, own types — not features, not entities (or only minimal types) |
| **lib/** | HTTP, auth, cache, realtime, telemetry, push, etc. | shared (env, types only if minimal) — not entities, not features |
| **providers/** | React context and composition. | features, entities, shared, lib |
| **types/** | Optional barrel for shared/entity types. | shared/types, entities — avoid re-exporting features |

---

## 11. File Placement Rules

- **Route components:** Under `app/` only (page.tsx, layout.tsx, route handlers under app/api/).
- **Feature UI and logic:** Under `features/<feature>/` in subfolders ui, hooks, api, model, lib, types.
- **Entity types and model:** Under `entities/<entity>/` (types, model, api, utils).
- **Server actions:** Under `actions/` (current) or under `features/<feature>/actions/` (recommended when scoped to one feature).
- **Reusable UI with no domain logic:** Under `shared/ui/` (e.g. layouts, buttons, data-table component without domain columns).
- **HTTP, auth, socket, telemetry:** Under `lib/`.
- **Global state providers:** Under `providers/`.

---

## 12. Import Direction Rules

- **app** may import from: features, entities, shared, lib, providers, actions.
- **features** may import from: entities, shared, lib, providers; **may not** import from other features (except realtime or other explicitly allowed "service" features).
- **entities** may import from: shared (types/utils), lib; **may not** import from features.
- **shared** may import from: lib; **may not** import from features or entities (or only minimal, stable types agreed as "shared contract").
- **lib** may import from: shared (env, minimal types); **may not** import from features or entities.
- **providers** may import from: features, entities, shared, lib.

---

## 13. Layer Dependency Rules

- Dependency direction must always be **inward**: app → features → entities → shared → lib. No reverse dependency (e.g. lib → features).
- **Cross-cutting:** realtime (and similar) may be used by multiple features; it should expose a narrow public API (e.g. hooks and types) and not import from call/chat/admin.

---

## 14. Feature Isolation Rules

- A feature must be loadable and testable without importing another feature's internals.
- Public surface: each feature should expose a single entry or a small set of public modules (e.g. `features/call/ui/floating-call`, `features/call/hooks/webrtc/use-video-chat`) and types. Other features or app must not rely on internal paths (e.g. feature's lib or model) unless that is the designated public API.
- Chat and call: treat as one combined "video chat" feature or define a clear owner (e.g. call owns WebRTC state, chat owns message list) and have the other depend only on the owner's public API.

---

## 15. Shared Layer Rules

- **shared/** must not contain business or domain logic. It may contain: layout components, generic data-table, form primitives, hooks (e.g. viewport, sound), env access, shared types (api.types, media.types), and pure utils (roles, timezone).
- Domain-specific table column definitions and API calls (e.g. admin-reports, level-rewards) must not live in shared; they belong in the owning feature, which composes the generic DataTable from shared with feature-supplied columns and data.

---

## 16. Lib (Infrastructure) Rules

- **lib/** provides: HTTP client and URL builders, auth token, cache tags, monitoring/Sentry wrappers, realtime socket factory, MQTT, push, telemetry. It must not depend on entities or features.
- Types used by lib (e.g. request/response shapes) should be either defined in lib as minimal interfaces or passed in by the caller (feature/entity). Adapters that map backend DTOs to entity types should live in the entity or feature that owns that type, not in lib.

---

## 17. App Router Usage Rules

- **app/** holds only: route segments, layout.tsx, page.tsx, loading.tsx, error.tsx, not-found.tsx, and API route handlers. No business logic; pages delegate to features via imports of feature UI and (server) data-fetching from feature api or actions.
- Prefer server components for pages; use client components from features (e.g. `*-client.tsx`) where interactivity or hooks are required.
- API routes under `app/api/` may proxy to backend; they may use shared env and shared/entity types and lib (e.g. backendUrl) but must not import from features.

---

## 18. Entity vs Feature Guidelines

- **Entity:** Represents a core business concept and its data shape (e.g. User, Notification, CallHistoryRecord). Contains types, optional model (store), optional api/utils. No UI. Used by multiple features.
- **Feature:** Represents a user-facing capability (e.g. "admin users," "chat," "call"). Contains ui, hooks, api, model (feature state), and optionally lib and types. May use multiple entities.
- If a type or store is used by only one feature, it can live in that feature. If it is used by two or more features or by shared, it belongs in an entity (or in shared/types if truly generic).

---

## 19. Naming Conventions (Folders + Files)

- **Folders:** lowercase, kebab-case for multi-word (e.g. `call-history`, `level-rewards`). Entities: singular. Features: singular recommended (e.g. `notification` not `notifications`).
- **Files:** kebab-case; suffix by role: `.types.ts`, `-store.ts`, `use-*.ts` (hooks), `*-client.tsx` for client page components.
- **Barrel (index.ts):** Use only to expose public API of a feature or entity; do not barrel everything (avoid deep re-exports that pull in features from types).

---

## 20. Anti-Patterns to Avoid

- **Shared importing features** — breaks layer order and makes shared unstable.
- **Lib importing entities/features** — keeps infrastructure reusable and testable.
- **Feature-to-feature imports** — except via explicit public API (e.g. realtime).
- **Domain-named folders under shared** — move to features or pass config from feature.
- **Central types barrel re-exporting features** — encourages cycles; import from feature/entity directly.
- **Putting business logic in app/** — keep in features or entities.
- **Putting UI in entities** — entities are types/model only.

---

## 21. Checklist for Adding New Code

- [ ] New code lives in the correct layer (app vs feature vs entity vs shared vs lib).
- [ ] No new imports from shared/lib into features that violate "shared must not import features" / "lib must not import entities/features."
- [ ] No new feature-to-feature imports unless through an allowed dependency (e.g. realtime).
- [ ] Naming follows kebab-case and folder conventions.
- [ ] Types live in entity or feature types folder (or shared/types if generic).
- [ ] Server actions either in `actions/` (and only use lib/entities) or under feature.

---

## 22. Checklist for Code Review

- [ ] Import directions respect layer rules (no lib→feature, no shared→feature, no feature→feature except allowed).
- [ ] No new domain-named modules under shared (e.g. no new `shared/ui/data-table/<domain>` that imports from features).
- [ ] New hooks/stores are in feature or entity or shared/model as appropriate (feature state in feature, global UI state in shared/model).
- [ ] API calls and URL building use `lib/http` (backendUrl, serverFetch, etc.); no hardcoded API URLs.
- [ ] Naming (files, folders) matches conventions.

---

## 23. Migration Strategy (High Level)

- **Phase 1 (non-breaking):** Add ESLint (or similar) rules to forbid lib→features/entities and shared→features. Fix only new code; document existing violations.
- **Phase 2:** Move domain-specific data-table definitions from `shared/ui/data-table/<domain>` into the owning feature; feature pages pass columns and data to generic `shared/ui/data-table` component.
- **Phase 3:** Remove feature type re-exports from `types/index.ts`; consumers import from `@/features/<feature>/types` or `@/entities/<entity>/types` directly.
- **Phase 4:** Refactor lib adapters so they do not import entity types; types passed in or defined as minimal interfaces in lib.
- **Phase 5:** Decouple chat and call: either merge into one feature or define a clear public API (e.g. call exposes store and types; chat consumes them) and remove reverse dependencies.

---

## 24. How to Add a New Feature (Step-by-Step)

1. **Decide:** Is it a new feature, an extension of an existing feature, a new entity, or shared logic?  
   - New user-facing capability with its own routes/UI → new feature.  
   - New screens or flows in an existing area (e.g. admin) → extend existing feature.  
   - New core data concept used by several features → new entity.  
   - Reusable UI or util with no domain → shared.

2. **Where to create the folder:** Under `features/<feature-name>/` (kebab-case, singular preferred).

3. **Allowed subfolders inside a feature:** `api/`, `hooks/`, `lib/`, `model/`, `types/`, `ui/`. Do not add arbitrary names (e.g. no `services/`; use `api/` or `lib/`).

4. **Hooks:** Place in `features/<feature>/hooks/`. Use kebab-case: `use-<name>.ts`. For nested concerns (e.g. webrtc), use `hooks/webrtc/use-video-chat.ts`.

5. **API logic:** Place in `features/<feature>/api/`. Use `serverFetch` and `backendUrl` from lib; use `withSentryAction`/`withSentryQuery` where applicable. No direct fetch to hardcoded URLs.

6. **Types:** Place in `features/<feature>/types/` (e.g. `<feature>.types.ts`). Export from the feature's public surface if other layers need them; do not add to `types/index.ts` barrel for features.

7. **UI components:** Place in `features/<feature>/ui/`. Use `-client.tsx` for client components that are entry points for a page. Compose shared UI from `@/shared/ui` and primitives from `@ws/ui`.

8. **State management (stores):** Place in `features/<feature>/model/` (e.g. `video-chat-store.ts`). Use Zustand; expose hooks (e.g. `useVideoChatStore`). Do not put feature stores in shared or entities unless they are global and non-domain (e.g. sidebar open state → shared/model).

9. **Public API:** Expose only what is needed by app or other layers: one or a few UI entry components and/or hooks, and types. Use barrel `index.ts` only for that public surface (e.g. `features/call/ui/floating-call/index.ts`). Do not barrel entire feature.

10. **Avoid cross-feature coupling:** Do not import from another feature's internals. If you need realtime, use `@/features/realtime/hooks/use-socket` (or the agreed public API). If you need user data, use entity `user` or providers, not feature `user`'s internal api.

11. **Avoid circular dependencies:** Do not import from a module that (transitively) imports you. Prefer types-only imports where possible. Do not re-export feature types from a central `types/` barrel.

12. **Import direction when creating new modules:** Feature may import: `@/entities/*`, `@/shared/*`, `@/lib/*`, `@/providers/*`, `@/actions/*` (if applicable). Feature must not import: `@/features/<other>` (except allowed, e.g. realtime).

13. **Naming when creating folders/files:** Folders: kebab-case, singular for feature name. Files: kebab-case; `*.types.ts`, `*-store.ts`, `use-*.ts`, `*-client.tsx`.

14. **Review checklist before merge:** Run layer checklist (section 22); ensure no new shared→feature or lib→entity/feature imports; ensure feature does not import another feature.

---

## 25. How to Extend an Existing Feature

- Add new ui under `features/<feature>/ui/`, new hooks under `features/<feature>/hooks/`, new api under `features/<feature>/api/`, new types in `features/<feature>/types/`, new model in `features/<feature>/model/`.
- Do not add new dependencies from this feature to another feature. If you need another domain, use entities or the allowed feature (realtime).
- Update the feature's public surface (e.g. barrel or page imports) only if you expose a new entry point.

---

## 26. How to Add a New Entity

- Create `entities/<entity-name>/` (singular, kebab-case). Subfolders: `types/`, optionally `model/`, `api/`, `utils/`.
- Add types in `entities/<entity>/types/<entity>.types.ts`. Do not add UI. Entity may import from shared (types, utils) and lib only.
- If the entity is used by multiple features, keep it here. If only one feature needs it, consider keeping types/model inside that feature first.

---

## 27. How to Add a New API Integration

- **Backend URL and fetch:** Use `lib/http/backend-url` and `lib/http/server-api` (server) or `lib/http/api-url` and `lib/http/client-api` (client). Add new URL builders in `lib/http/urls/` if needed.
- **Adapters (mapping backend → app types):** Prefer placing in the feature or entity that owns the type. If the adapter is generic (e.g. base fetch wrapper), keep in lib and pass types as generics or minimal interfaces defined in lib.
- Do not add entity or feature types into lib; lib must remain free of domain imports.

---

## 28. How to Add New UI Components

- **Domain-specific (e.g. report row, call controls):** In the owning feature under `features/<feature>/ui/`.
- **Reusable and domain-agnostic (e.g. button, layout, generic table):** In `shared/ui/` under an appropriate subfolder (e.g. common, layouts, data-table). Ensure shared component does not import from features or entities (only from lib and shared).
- Use `@ws/ui` for design system primitives. Use Tailwind and project conventions (see CLAUDE.md and frontend-design skill if applicable).

---

## 29. Boundary Enforcement Examples

- **Example: "Shared data-table must not import admin"**  
  Today: `shared/ui/data-table/level-rewards/define-data.tsx` imports `AdminAPI` and admin API. Recommended: move `level-rewards` table definition (columns + data fetching) into `features/admin/ui/level-rewards/` and pass columns to generic `shared/ui/data-table/data-table.tsx`.

- **Example: "Lib must not import entities"**  
  Today: `lib/realtime/socket.ts` imports chat and user types. Recommended: define minimal event payload types in `lib/realtime/socket.ts` (or in shared/types) and let features/entities map to their own types when handling events.

- **Example: "Feature must not import another feature"**  
  Today: chat imports call's store and hooks. Recommended: treat call as the "owner" of video state and expose a single hook (e.g. `useVideoChat()`) and types; chat imports only that. Or merge chat and call into one feature.

---

## 30. Conclusion

This document is the frontend architecture contract for the Linky web app. It reflects the current state (including known violations) and defines the target rules for layers, imports, naming, and growth. All new code must follow the recommended architecture; existing violations are to be reduced over time via the migration strategy. Use the "How to Add a New Feature" and checklists for every change to keep the codebase scalable and consistent.

---

**End of document.**
