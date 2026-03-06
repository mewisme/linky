# 20 -- Known Limitations

## Purpose

This document catalogs all known limitations, technical debt, partially implemented features, and planned capabilities of the Linky platform.

## Scope

Comprehensive list of constraints across all system components.

## Dependencies

All previous documents.

## Cross References

All documents in this specification.

---

## 1. Architecture Limitations

| ID | Area | Limitation | Impact | Status |
|----|------|-----------|--------|--------|
| A-01 | Room State | Rooms are in-memory only; server restart loses all active calls | Active calls terminated on deployment | Implemented as-is |
| A-02 | Matchmaking Lock | In-process boolean lock; does not coordinate across multiple server instances | Only single-server matchmaking is safe | Partially Implemented (Redis lock constants defined but not used in match cycle) |
| A-03 | Notification Context | Socket lookup is per-server; cross-server notification delivery not supported | Notifications may not be delivered in multi-server setup | Implemented for single-server |
| A-04 | Domain Isolation | No static analysis enforcement of domain import rules | Relies on developer discipline | Implemented as convention |

---

## 2. Scalability Limitations

| ID | Area | Limitation | Impact | Status |
|----|------|-----------|--------|--------|
| S-01 | Single Server | API runs as single Docker container | Single point of failure | Implemented as-is |
| S-02 | Socket.IO | No Redis adapter; events are per-server | Cannot scale Socket.IO horizontally | Planned |
| S-03 | Ollama | Single instance, no load balancing | Embedding generation bottleneck at scale | Implemented as-is |
| S-04 | Matchmaking | O(n^2) scoring capped at 50 candidates | Users beyond 50 in queue wait for earlier matches | Implemented with cap |
| S-05 | Database | No connection pooling configuration | May exhaust connections under load | Implemented as-is |

---

## 3. Security Limitations

| ID | Area | Limitation | Impact | Status |
|----|------|-----------|--------|--------|
| X-01 | RLS | Service role bypasses RLS; authorization is application-level | Database compromise exposes all data | Implemented by design |
| X-02 | Rate Limiting | Fails open when Redis unavailable | No rate limiting during Redis outage | Implemented as-is |
| X-03 | MQTT Auth | Shared credentials for all clients | Any client can publish to any presence topic | Implemented as-is |
| X-04 | Content Moderation | No automated content scanning for chat or media | Relies on manual reporting | Implemented as-is |
| X-05 | Admin Distinction | Admin vs superadmin partially frontend-enforced | Backend treats both as authorized for most operations | Partially Implemented |
| X-06 | Signal Validation | WebRTC signals relayed without content validation | Malformed signals could be injected | Implemented as-is |

---

## 4. Economy Limitations

| ID | Area | Limitation | Impact | Status |
|----|------|-----------|--------|--------|
| E-01 | Stabilizer Recovery | Conversion bonus only decreases; no auto-recovery from deflation | Manual intervention needed for deflation correction | Implemented as-is |
| E-02 | Seasonal Decay | Irreversible once applied | No undo for mistaken decay execution | Implemented by design |
| E-03 | RPC Idempotency | Economy RPCs are not idempotent | Duplicate calls could cause incorrect state | Implemented as-is |
| E-04 | Queue Timeout | 5-minute timeout is hardcoded | Cannot be adjusted without code change | Implemented as-is |
| E-05 | Estimated Wait | `estimatedWaitSeconds` always returns null | Queue status lacks wait time estimation | Partially Implemented |

---

## 5. Data Management Limitations

| ID | Area | Limitation | Impact | Status |
|----|------|-----------|--------|--------|
| D-01 | Soft Delete Cleanup | No job to clean up old soft-deleted users | Database grows indefinitely | Implemented as-is |
| D-02 | Schema Migrations | No automated migration tool documented | Schema changes require manual database operations | Implemented as-is |
| D-03 | Chat History | Room chat snapshots capped at 20 messages | Earlier messages lost on resync | Implemented by design |
| D-04 | Push Subscriptions | Only 410 errors trigger cleanup | Non-410 stale subscriptions accumulate | Partially Implemented |
| D-05 | Embedding Caching | Embeddings loaded from Supabase every match cycle | No Redis caching for embedding vectors | Implemented as-is |

---

## 6. Monitoring Limitations

| ID | Area | Limitation | Impact | Status |
|----|------|-----------|--------|--------|
| M-01 | Log Aggregation | Logs written to stdout; no centralized log storage documented | Log analysis requires container log access | Implemented as-is |
| M-02 | Alerting | No alerting rules defined in codebase | Assumes Sentry dashboard configuration | Implemented as-is |
| M-03 | Metrics | Economy metrics only captured daily | No real-time economy monitoring | Implemented as-is |

---

## 7. Frontend Limitations

| ID | Area | Limitation | Impact | Status |
|----|------|-----------|--------|--------|
| F-01 | Cache API | Uses `unstable_cache` from Next.js | API may change in future Next.js versions | Implemented as-is |
| F-02 | Multi-Tab | Single socket manager per browser context | Multiple tabs may conflict on socket state | Implemented as-is |
| F-03 | Offline Support | No service worker for offline functionality | App requires active internet connection | Implemented as-is |
| F-04 | Layer Enforcement | Frontend layer dependency rules not statically enforced | Relies on code review | Implemented as convention |

---

## 8. Deployment Limitations

| ID | Area | Limitation | Impact | Status |
|----|------|-----------|--------|--------|
| P-01 | Deployment Strategy | No blue-green or canary deployment | Downtime during deployment | Implemented as-is |
| P-02 | Auto-Scaling | No auto-scaling mechanism | Manual capacity planning required | Planned |
| P-03 | Network | Docker network must be created manually | Extra setup step on new deployments | Implemented as-is |
| P-04 | API Versioning | Only `/v1` prefix; no version negotiation | Breaking changes require coordinated deployment | Implemented as-is |
| P-05 | OpenAPI | No OpenAPI/Swagger specification | API documentation is manual | Implemented as-is |

---

## 9. Feature Gaps

| ID | Feature | Description | Status |
|----|---------|-------------|--------|
| G-01 | Video Recording | No call recording capability | Not Implemented |
| G-02 | Group Calls | Only 1-on-1 video chat supported | Not Implemented |
| G-03 | Persistent Chat | No chat history beyond active room | Not Implemented |
| G-04 | IP Blocking | No IP-based access control | Not Implemented |
| G-05 | Notification Batching | No aggregation of rapid notifications | Not Implemented |
| G-06 | User Search | No user search/discovery beyond matchmaking | Not Implemented |
| G-07 | Data Export | No user data export (GDPR) mechanism | Not Implemented |

---

## Related Components

All documents in this specification.

## Risk Considerations

The limitations documented here represent the current state of the system. Each limitation should be evaluated against:
1. Current user base size and growth trajectory
2. Security audit requirements
3. Compliance obligations (GDPR, data protection)
4. Service level objectives
5. Available engineering resources
