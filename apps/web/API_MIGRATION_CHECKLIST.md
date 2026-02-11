# API Migration Checklist

Migration from direct `fetch()` calls to centralized API utilities (`apiUrl` + `client-api.ts`/`server-api.ts`).

## Migration Pattern

### Client Components
```typescript
// ❌ OLD PATTERN
const { state } = useUserContext();
const [token, setToken] = useState<string | null>(null);

useEffect(() => {
  const fetchToken = async () => {
    const t = await state.getToken();
    setToken(t);
  };
  fetchToken();
}, [state]);

const res = await fetch("/api/endpoint", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});

// ✅ NEW PATTERN
import { useUserTokenContext } from "@/components/providers/user/user-token-provider";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { postData } from "@/lib/api/fetch/client-api";

const { token } = useUserTokenContext();

const result = await postData<ResponseType>(
  apiUrl.category.endpoint(),
  {
    token: token ?? undefined,
    body: data,
  }
);
```

### Server Components
```typescript
// ✅ SERVER PATTERN
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";

const data = await fetchData<ResponseType>(
  apiUrl.category.endpoint(),
  { token: true }
);
```

## Progress Overview

- **Total Files**: 25
- **Completed**: 20 (80%)
- **Remaining**: 5 (20%)

---

## ✅ Completed Migrations

### Admin Pages (Server Components)
- [x] `app/(app)/admin/page.tsx` - Static dashboard (no fetch)
- [x] `app/(app)/settings/page.tsx` - Static dashboard (no fetch)
- [x] `app/(app)/admin/changelogs/page.tsx` - Uses server-api.ts
- [x] `app/(app)/admin/broadcasts/page.tsx` - Uses server-api.ts
- [x] `app/(app)/admin/interest-tags/page.tsx` - Uses server-api.ts
- [x] `app/(app)/admin/level-feature-unlocks/page.tsx` - Uses server-api.ts
- [x] `app/(app)/admin/level-rewards/page.tsx` - Uses server-api.ts
- [x] `app/(app)/admin/streak-exp-bonuses/page.tsx` - Uses server-api.ts
- [x] `app/(app)/admin/reports/page.tsx` - Uses server-api.ts
- [x] `app/(app)/admin/users/page.tsx` - Uses server-api.ts

### Admin Client Components
- [x] `app/(app)/admin/level-feature-unlocks/create/page.tsx`
  - ✅ Removed `useEffect` token pattern
  - ✅ Uses `useUserTokenContext()`
  - ✅ Uses `apiUrl.admin.levelFeatureUnlocks()` + `postData`

- [x] `app/(app)/admin/level-rewards/create/page.tsx`
  - ✅ Removed `useEffect` token pattern
  - ✅ Uses `useUserTokenContext()`
  - ✅ Uses `apiUrl.admin.levelRewards()` + `postData`

- [x] `components/data-table/interest-tags/import-interest-tags-dialog.tsx`
  - ✅ Uses `apiUrl.admin.interestTagsImport()` + `postData`
  - ✅ Fixed icon import to `@ws/ui/internal-lib/icons`

---

## ✅ Phase 1 Complete - Critical User Features

### User Pages
- [x] **`app/(app)/user/progress/page.tsx`**
  - ✅ Removed `useEffect` token pattern
  - ✅ Uses `useUserTokenContext()`
  - ✅ Uses `apiUrl.users.progress()` + `fetchData`
  - ✅ Maintains custom timezone header

- [x] **`app/(app)/connections/favorites/page.tsx`**
  - ✅ Removed `useEffect` token pattern
  - ✅ Uses `useUserTokenContext()`
  - ✅ Uses `apiUrl.resources.favorites()` + `fetchData`
  - ✅ Delete operation uses `apiUrl.resources.favoriteByUserId(id)`

### Chat/Video Components
- [x] **`app/(app)/chat/components/video-chat-idle-state.tsx`**
  - ✅ Removed `useEffect` token pattern
  - ✅ Uses `useUserTokenContext()`
  - ✅ Uses `apiUrl.users.progress()` + `fetchData`
  - ✅ Maintains custom timezone header

- [x] **`app/(app)/chat/components/video-controls.tsx`**
  - ✅ Removed `state.getToken()` pattern
  - ✅ Uses `useUserTokenContext()`
  - ✅ All 4 API calls updated:
    - GET favorites: `apiUrl.resources.favorites()` + `fetchData`
    - POST favorite: `apiUrl.resources.favorites()` + `postData`
    - DELETE favorite: `apiUrl.resources.favoriteByUserId(id)` + `fetchData`
    - POST report: `apiUrl.resources.reports()` + `postData`

---

## 🔄 Remaining High Priority Components

### User Pages
- [ ] **`app/(app)/user/reports/page.tsx`**
  - **Endpoint**: `/api/resources/reports/me`
  - **API Method**: `apiUrl.resources.reportsMe()`
  - **Action**: Update to use `client-api.ts` + `useUserTokenContext`
  - **Priority**: 🟡 Medium

### User Components
- [ ] **`app/(app)/user/components/favorites/favorite-view.tsx`**
  - **Endpoint**: `/api/resources/favorites`
  - **API Method**: `apiUrl.resources.favorites()` / `apiUrl.resources.favoriteByUserId(userId)`
  - **Action**: Update to use `client-api.ts` + `useUserTokenContext`
  - **Priority**: 🟡 Medium

- [ ] **`app/(app)/user/components/interest-tags-section.tsx`**
  - **Endpoint**: `/api/users/interest-tags` (likely)
  - **API Method**: `apiUrl.users.interestTags()` / `apiUrl.users.interestTagsAll()`
  - **Action**: Update to use `client-api.ts` + `useUserTokenContext`
  - **Priority**: 🟡 Medium

### Chat Components
- [ ] **`app/(app)/chat/call-history/page.tsx`**
  - **Endpoint**: `/api/resources/call-history`
  - **API Method**: `apiUrl.resources.callHistory()`
  - **Action**: Update to use `client-api.ts` + `useUserTokenContext`
  - **Priority**: 🟡 Medium

---

## ✅ Admin Components Complete

### Admin User Management
- [x] **`app/(app)/admin/components/users/use-users-mutations.ts`**
  - ✅ Migrated **4 mutations**:
    - UPDATE user: `apiUrl.admin.userById(id)` + `fetchData` (PUT)
    - DELETE user: `apiUrl.admin.userById(id)` + `fetchData` (DELETE)
    - RESTORE user: `apiUrl.admin.userById(id)` + `fetchData` (PATCH)
    - SYNC embeddings: `apiUrl.admin.embeddingsSync()` + `postData`
  - ✅ All mutations use centralized API utilities

- [x] **`app/(app)/admin/components/users/embedding-actions/compare-embeddings-modal.tsx`**
  - ✅ Uses `apiUrl.admin.embeddingsCompare()` + `postData`
  - ✅ Simplified error handling with centralized pattern

- [x] **`app/(app)/admin/components/users/embedding-actions/find-similar-users-modal.tsx`**
  - ✅ Uses `apiUrl.admin.embeddingsSimilar()` + `postData`
  - ✅ Proper error message extraction

---

## 🔄 Remaining Components

### Admin Reports
- [ ] **`app/(app)/admin/reports/[id]/page.tsx`**
  - **Endpoint**: `/api/admin/reports/${id}`
  - **API Method**: `apiUrl.admin.reportById(id)`
  - **Action**: Check if needs migration
  - **Priority**: 🟡 Medium

---

## 🌐 Low Priority - Marketing/Public Pages

- [ ] **`app/(marketing)/changelogs/page.tsx`**
  - **Endpoint**: `/api/resources/changelogs`
  - **API Method**: `apiUrl.resources.changelogs()`
  - **Action**: Convert to Server Component pattern (public route)
  - **Priority**: 🟢 Low

- [ ] **`app/(marketing)/changelogs/[version]/page.tsx`**
  - **Endpoint**: `/api/resources/changelogs/${version}`
  - **API Method**: `apiUrl.resources.changelogByVersion(version)`
  - **Action**: Convert to Server Component pattern (public route)
  - **Priority**: 🟢 Low

---

## 📊 Migration Statistics by Category

| Category | Total | Completed | Remaining | Progress |
|----------|-------|-----------|-----------|----------|
| Admin Pages (Server) | 10 | 10 | 0 | 100% ✅ |
| Admin Components | 6 | 6 | 0 | 100% ✅ |
| User Pages | 3 | 2 | 1 | 67% |
| User Components | 2 | 0 | 2 | 0% |
| Chat/Video | 3 | 2 | 1 | 67% |
| Marketing | 2 | 0 | 2 | 0% |
| **TOTAL** | **26** | **20** | **6** | **77%** |

---

## 🎯 Recommended Migration Order

### Phase 1: Critical User Features ✅ COMPLETE
1. ✅ Video chat controls (`video-controls.tsx`) - 4 API calls migrated
2. ✅ Video chat idle state (`video-chat-idle-state.tsx`)
3. ✅ User progress page (`user/progress/page.tsx`)
4. ✅ User favorites page (`connections/favorites/page.tsx`)

### Phase 2: User Components (Week 1-2)
5. ✅ Favorite view component (`favorite-view.tsx`)
6. ✅ Interest tags section (`interest-tags-section.tsx`)
7. ✅ User reports page (`user/reports/page.tsx`)
8. ✅ Call history page (`chat/call-history/page.tsx`)

### Phase 3: Admin Tools ✅ COMPLETE
9. ✅ Admin user mutations (`use-users-mutations.ts`) - 4 mutations migrated
10. ✅ Admin embeddings compare modal - `embeddingsCompare()` + `postData`
11. ✅ Admin embeddings similar modal - `embeddingsSimilar()` + `postData`

### Phase 4: Marketing Pages (Week 2-3)
12. ✅ Public changelogs list and detail

---

## ✅ Verification Checklist

After each migration:
- [ ] TypeScript compilation passes (`pnpm check-types`)
- [ ] No runtime errors in browser console
- [ ] API calls return expected data
- [ ] Authentication headers properly included
- [ ] Error handling works correctly
- [ ] Loading states function as expected

---

## 📝 Notes

### Key Benefits of Migration
- ✅ **Type Safety**: Centralized URL construction with TypeScript
- ✅ **Consistency**: Single source of truth for all API endpoints
- ✅ **Maintainability**: Easy to update API versions or endpoints
- ✅ **Performance**: Eliminated useEffect token waterfall pattern
- ✅ **Security**: Centralized auth header injection

### Breaking Changes to Avoid
- ❌ Do NOT change API response types during migration
- ❌ Do NOT modify error handling behavior
- ❌ Do NOT alter loading/success state management
- ✅ DO preserve existing functionality exactly

### Common Pitfalls
1. **Token nullability**: Always use `token ?? undefined` when passing to fetch functions
2. **Method specification**: Use `postData` for POST, `fetchData` for GET (with method override if needed)
3. **Query params**: Build URLSearchParams before passing to apiUrl methods
4. **Error handling**: postData/fetchData throw errors - wrap in try/catch

---

## 🚀 Quick Migration Template

```typescript
// 1. Update imports
- import { useUserContext } from "@/components/providers/user/user-provider";
+ import { useUserTokenContext } from "@/components/providers/user/user-token-provider";
+ import { apiUrl } from "@/lib/api/fetch/api-url";
+ import { postData, fetchData } from "@/lib/api/fetch/client-api";

// 2. Update token management
- const { state } = useUserContext();
- const [token, setToken] = useState<string | null>(null);
- useEffect(() => { ... }, [state]);
+ const { token } = useUserTokenContext();

// 3. Update fetch calls
- const res = await fetch("/api/endpoint", { ... });
- if (!res.ok) throw new Error(...);
- const data = await res.json();
+ const data = await postData<ResponseType>(
+   apiUrl.category.endpoint(),
+   { token: token ?? undefined, body: payload }
+ );
```

---

**Last Updated**: 2026-02-11
**Migration Status**: 77% Complete (20/26 files)
**Phase 1**: ✅ Complete (4/4 critical user features)
**Phase 3**: ✅ Complete (3/3 admin components)
**Remaining**: 6 files (user components + marketing pages)
