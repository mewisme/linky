# Linky Economy API Routes

Base URL for authenticated API: `/api/v1`  
Base URL for admin API: `/api/v1/admin` (requires admin role)

---

## User-Facing Economy Routes

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| POST | `/api/v1/economy/convert` | Convert EXP to coins (body: `{ expAmount: number }`) | [economy.route.ts](apps/api/src/domains/economy/http/economy.route.ts) |
| GET | `/api/v1/economy/shop` | List active coin shop items | [shop.route.ts](apps/api/src/domains/economy-shop/http/shop.route.ts) |
| POST | `/api/v1/economy/shop/purchase` | Purchase a shop item (body: `{ itemId: string }`) | [shop.route.ts](apps/api/src/domains/economy-shop/http/shop.route.ts) |
| POST | `/api/v1/economy/boost/purchase` | Purchase a boost (body: `{ boostType: string }`) | [boost.route.ts](apps/api/src/domains/economy-boost/http/boost.route.ts) |
| GET | `/api/v1/economy/daily/progress` | Get daily EXP progress and milestones (optional: `x-user-timezone` or `?timezone=`) | [daily-exp.route.ts](apps/api/src/domains/economy-daily/http/daily-exp.route.ts) |
| GET | `/api/v1/economy/weekly/progress` | Get weekly check-in progress (optional: `x-user-timezone` or `?timezone=`) | [weekly-checkin.route.ts](apps/api/src/domains/economy-weekly/http/weekly-checkin.route.ts) |
| POST | `/api/v1/economy/weekly/checkin` | Claim weekly check-in (optional: `x-user-timezone` or `?timezone=`) | [weekly-checkin.route.ts](apps/api/src/domains/economy-weekly/http/weekly-checkin.route.ts) |
| GET | `/api/v1/economy/monthly/progress` | Get monthly check-in progress (optional: `x-user-timezone` or `?timezone=`) | [monthly-checkin.route.ts](apps/api/src/domains/economy-monthly/http/monthly-checkin.route.ts) |
| POST | `/api/v1/economy/monthly/checkin` | Claim monthly check-in for a day (body: `{ day: number }`) | [monthly-checkin.route.ts](apps/api/src/domains/economy-monthly/http/monthly-checkin.route.ts) |
| POST | `/api/v1/economy/monthly/buyback` | Buy back a missed monthly day with EXP (body: `{ day: number }`) | [monthly-checkin.route.ts](apps/api/src/domains/economy-monthly/http/monthly-checkin.route.ts) |
| POST | `/api/v1/users/prestige` | Prestige (reset EXP/level, grant vault bonus) | [prestige.route.ts](apps/api/src/domains/economy-prestige/http/prestige.route.ts) |

---

## Admin-Only Economy Routes

| Method | Path | Description | Source |
|--------|------|-------------|--------|
| GET | `/api/v1/admin/economy/stats` | Get economy aggregate stats (supply, mint/burn rates, etc.) | [economy-stats.route.ts](apps/api/src/domains/admin/http/economy-stats.route.ts) |
| POST | `/api/v1/admin/economy/simulate` | Run economy simulation (body: `{ days, avg_exp_per_user, user_count }`) | [economy-simulate.route.ts](apps/api/src/domains/admin/http/economy-simulate.route.ts) |

---

## Route Mount Summary (from [api.ts](apps/api/src/routes/api.ts))

```
router.use("/economy", economyRouter);           -> /api/v1/economy/*
router.use("/economy/shop", shopRouter);         -> /api/v1/economy/shop/*
router.use("/economy/boost", boostRouter);       -> /api/v1/economy/boost/*
router.use("/economy/daily", dailyExpRouter);    -> /api/v1/economy/daily/*
router.use("/economy/weekly", weeklyCheckinRouter); -> /api/v1/economy/weekly/*
router.use("/economy/monthly", monthlyCheckinRouter); -> /api/v1/economy/monthly/*
router.use("/users/prestige", prestigeRouter);   -> /api/v1/users/prestige/*
```

Admin economy routes are mounted in the admin router at `/economy/stats` and `/economy/simulate`, giving full paths under `/api/v1/admin/economy/*`.
