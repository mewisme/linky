# Matchmaking domain

This domain owns all matchmaking behavior, including:

- match candidate selection
- scoring logic
- Redis-backed matchmaking state
- interest and favorites weighting
- skip cooldown logic

Public entry points are exported from `apps/api/src/domains/matchmaking/index.ts`.

