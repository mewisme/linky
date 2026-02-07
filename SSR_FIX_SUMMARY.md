# SSR Fix for Multi-Tab Call Coordination

## Problem

The `CallTabCoordinator` singleton was instantiated at module level, causing it to execute during server-side rendering (SSR) in Next.js. This resulted in the error:

```
sessionStorage is not defined
```

## Root Cause

```typescript
class CallTabCoordinator {
  private tabId: string;

  constructor() {
    this.tabId = this.generateTabId(); // ❌ Calls sessionStorage during SSR
  }

  private generateTabId(): string {
    const existingTabId = sessionStorage.getItem("linky:tabId"); // ❌ SSR error
    // ...
  }
}

export const callTabCoordinator = new CallTabCoordinator(); // ❌ Runs on import
```

When Next.js imports this module during SSR, the constructor runs immediately, attempting to access `sessionStorage` which doesn't exist in Node.js.

## Solution

Implemented **lazy initialization** with SSR guards:

### 1. Lazy Tab ID Generation

```typescript
class CallTabCoordinator {
  private tabId: string | null = null; // ✅ Nullable, no immediate initialization

  constructor() {} // ✅ Empty constructor

  private ensureTabId(): string {
    if (this.tabId) {
      return this.tabId; // ✅ Return cached ID if available
    }

    // ✅ SSR guard
    if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
      this.tabId = `ssr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      return this.tabId;
    }

    // ✅ Client-side: use sessionStorage
    const existingTabId = sessionStorage.getItem("linky:tabId");
    if (existingTabId) {
      this.tabId = existingTabId;
      return existingTabId;
    }

    const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("linky:tabId", newTabId);
    this.tabId = newTabId;
    return newTabId;
  }
}
```

### 2. SSR Guards in All Methods

Added `typeof window === "undefined"` checks before using browser APIs:

```typescript
initialize(): void {
  if (typeof window === "undefined") {
    return; // ✅ Skip initialization during SSR
  }
  // ... rest of initialization
}

getState(): CallTabState {
  const tabId = this.ensureTabId();

  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return {
      tabId,
      activeCallTabId: null,
      activeCallRoomId: null,
      activeCallStartedAt: null,
      isCallOwner: false,
    }; // ✅ Return safe defaults during SSR
  }

  // ... client-side logic
}

claimOwnership(roomId: string | null = null): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false; // ✅ No-op during SSR
  }
  // ... client-side logic
}
```

### 3. Updated All References

Changed all `this.tabId` references to `this.ensureTabId()` to ensure lazy initialization:

```typescript
// Before
logger.info({ tabId: this.tabId }, "Message");

// After
const tabId = this.ensureTabId();
logger.info({ tabId }, "Message");
```

## Changes Made

**File**: `apps/web/src/lib/call-coordination/call-tab-coordinator.ts`

- Changed `tabId` from `string` to `string | null`
- Added `ensureTabId()` method with SSR guard
- Added SSR guards to: `initialize()`, `destroy()`, `setupStorageListener()`, `getState()`, `claimOwnership()`, `releaseOwnership()`, `startHeartbeatMonitoring()`
- Updated all `this.tabId` references to `this.ensureTabId()`

## Behavior

### Server-Side Rendering (SSR)

- Module imports safely without errors
- Coordinator returns safe defaults
- All browser API calls are skipped
- Tab ID gets a temporary `ssr_` prefix (discarded on hydration)

### Client-Side (Browser)

- First access to `ensureTabId()` generates and stores tab ID
- Normal operation with localStorage, sessionStorage, BroadcastChannel
- Full multi-tab coordination functionality

## Verification

✅ TypeScript compilation passes:
```bash
cd apps/web && pnpm exec tsc --noEmit
```

✅ Dev server runs without SSR errors:
```bash
pnpm dev:web
# No "sessionStorage is not defined" errors
```

✅ Client-side functionality unchanged:
- Tab coordination works as expected
- All features function normally in browser

## Testing

1. **SSR Safety**:
   ```bash
   pnpm dev:web
   # Open http://localhost:3000/chat
   # Verify no console errors
   # View page source - should see SSR HTML
   ```

2. **Client Hydration**:
   ```javascript
   // In browser console
   console.log(sessionStorage.getItem("linky:tabId"));
   // Should show: "tab_1707363840000_abc123" (not "ssr_...")
   ```

3. **Multi-Tab Functionality**:
   - Open two tabs
   - Start call in Tab 1
   - Verify Tab 2 shows passive banner
   - All coordination features work

## Best Practices Applied

1. **Lazy Initialization**: Defer expensive or environment-specific operations until first use
2. **SSR Guards**: Always check `typeof window !== "undefined"` before using browser APIs
3. **Safe Defaults**: Return sensible defaults when running in non-browser environments
4. **Graceful Degradation**: Coordinator continues to work even if browser APIs are unavailable

## Related Files

- `apps/web/src/lib/call-coordination/call-tab-coordinator.ts` (modified)
- `apps/web/src/hooks/call-coordination/use-call-tab-coordination.ts` (unchanged)

All other files remain unchanged - the fix is entirely contained in the coordinator implementation.
