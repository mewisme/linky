# Multi-Tab Call Coordination

This module implements client-side multi-tab coordination for video calls in Linky, preventing conflicts when users open multiple tabs during an active call.

## Architecture

### Design Principles

1. **Client-side only**: No backend changes required
2. **BroadcastChannel first**: Uses BroadcastChannel API with localStorage fallback
3. **Single source of truth**: localStorage stores global call state across tabs
4. **Explicit ownership**: Only one tab can own an active call at a time
5. **No auto-switch**: User must explicitly request call transfer between tabs

### Core Concepts

- **Call Owner**: The tab that controls WebRTC, media devices, and socket events
- **Passive Tab**: A tab that observes call state but does not control it
- **Ownership Transfer**: Process of switching call control from one tab to another

## Components

### 1. CallTabCoordinator (call-tab-coordinator.ts)

Singleton class managing tab identity, ownership, and inter-tab communication.

**Key Responsibilities:**
- Generate and persist unique tab IDs
- Claim/release call ownership
- Broadcast heartbeats to prove liveness
- Handle ownership transfer requests
- Monitor owner heartbeats for crash detection

**State Storage:**
- `linky:tabId` (sessionStorage): Unique ID for this tab
- `linky:activeCallTabId` (localStorage): ID of tab owning the call
- `linky:activeCallRoomId` (localStorage): Current room ID
- `linky:callStartedAt` (localStorage): Call start timestamp

**Message Types:**
```typescript
type CallCoordinationMessage =
  | { type: "HEARTBEAT"; tabId: string; roomId: string | null; timestamp: number }
  | { type: "SWITCH_REQUEST"; requestingTabId: string }
  | { type: "SWITCH_APPROVED"; oldTabId: string; newTabId: string }
  | { type: "OWNER_RELEASED"; tabId: string }
  | { type: "CLAIM_OWNERSHIP"; tabId: string; roomId: string | null };
```

**Configuration:**
- `HEARTBEAT_INTERVAL_MS`: 3000ms (owner sends heartbeat every 3s)
- `HEARTBEAT_TIMEOUT_MS`: 6000ms (passive tabs wait 6s before clearing stale owner)

### 2. useCallTabCoordination Hook (use-call-tab-coordination.ts)

React hook providing tab coordination state and actions.

**API:**
```typescript
const {
  tabId,                    // Unique ID for this tab
  activeCallTabId,          // ID of tab owning the call (null if no call)
  activeCallRoomId,         // Current room ID (null if no call)
  activeCallStartedAt,      // Call start timestamp (null if no call)
  isCallOwner,              // true if this tab owns the call
  isPassive,                // true if call exists in another tab
  claimOwnership,           // (roomId?) => boolean
  releaseOwnership,         // () => void
  requestSwitch,            // () => void
} = useCallTabCoordination({
  onOwnershipLost: () => { /* cleanup WebRTC */ },
  onOwnershipGained: () => { /* re-initialize call */ },
  onSwitchApproved: () => { /* restart call in this tab */ },
});
```

**Lifecycle Callbacks:**
- `onOwnershipLost`: Called when another tab takes ownership (cleanup local WebRTC)
- `onOwnershipGained`: Called when this tab gains ownership (setup WebRTC)
- `onSwitchApproved`: Called when switch request is approved (re-initialize)

### 3. PassiveTabBanner Component (passive-tab-banner.tsx)

UI displayed in passive tabs showing call is active elsewhere.

**Features:**
- Displays call timer using shared call start time
- Large "Switch call to this tab" button
- Clear messaging about current state

## Integration Points

### useVideoChat Hook

The main video chat hook integrates tab coordination at these points:

1. **Initialization** (lines 90-111):
   ```typescript
   const tabCoordination = useCallTabCoordination({
     onOwnershipLost: () => {
       // Cleanup WebRTC without sending end-call to backend
     },
     onSwitchApproved: () => {
       // Re-initialize call in this tab
     },
   });
   ```

2. **start()** (lines 830-842):
   ```typescript
   const claimed = tabCoordination.claimOwnership(null);
   if (!claimed) {
     // Show error, another tab owns the call
     return;
   }
   // Proceed with camera/mic request and matchmaking
   ```

3. **onMatched** (line 523):
   ```typescript
   tabCoordination.claimOwnership(data.roomId);
   // Update ownership with actual room ID
   ```

4. **endCall()** (line 903):
   ```typescript
   tabCoordination.releaseOwnership();
   // Clear global ownership state
   ```

5. **useUnloadEndCall** (line 1080):
   ```typescript
   useUnloadEndCall(
     // ... existing params
     () => tabCoordination.releaseOwnership()
   );
   // Release ownership when tab closes
   ```

### VideoContainer Component

Shows passive UI when `isPassive` is true:

```typescript
if (isPassive) {
  return <PassiveTabBanner onSwitchToThisTab={...} callStartedAt={...} />;
}
// ... normal video UI
```

## Ownership Flow

### Starting a Call (Fresh)

1. User clicks "Start" in Tab A
2. `start()` calls `tabCoordination.claimOwnership(null)`
3. Tab A writes its `tabId` to `localStorage.activeCallTabId`
4. Tab A requests camera/mic and joins matchmaking queue
5. Backend matches users
6. `onMatched` fires, updates ownership with `roomId`
7. Tab A starts sending heartbeats every 3s

### Opening Second Tab (During Call)

1. User opens Tab B while call active in Tab A
2. Tab B initializes `useCallTabCoordination`
3. Tab B reads `localStorage.activeCallTabId` → sees Tab A owns call
4. Tab B derives `isPassive = true`
5. VideoContainer shows PassiveTabBanner
6. Tab B listens for heartbeats from Tab A
7. Tab B does NOT request camera/mic or initialize WebRTC

### Switching Call to Another Tab

1. User clicks "Switch call to this tab" in Tab B
2. Tab B calls `tabCoordination.requestSwitch()`
3. Tab B broadcasts `SWITCH_REQUEST` message
4. Tab A receives message, calls `releaseOwnership()`
5. Tab A:
   - Stops WebRTC (peer connection, media tracks)
   - Clears `localStorage.activeCallTabId`
   - Broadcasts `SWITCH_APPROVED` message
   - Calls `onOwnershipLost` callback (cleanup)
6. Tab B receives `SWITCH_APPROVED`
7. Tab B claims ownership via `claimOwnership()`
8. Tab B calls `onSwitchApproved` → triggers `start()`
9. Tab B re-initializes WebRTC with existing room via resync logic
10. Tab B starts sending heartbeats

**Key Point**: Backend is unaware of the switch. Socket stays connected in both tabs. Only WebRTC and media are transferred.

### Owner Tab Closes/Crashes

1. Tab A heartbeat stops
2. Tab B waits `HEARTBEAT_TIMEOUT_MS` (6s)
3. Tab B detects heartbeat timeout
4. Tab B clears stale `localStorage.activeCallTabId`
5. Tab B notifies state change → `isPassive` becomes false
6. User can manually click "Start" or implement auto-takeover

**Design Decision**: No auto-takeover to avoid race conditions. User must explicitly start call again.

## Edge Cases

### Rapid Tab Switching

- Each switch request waits for `SWITCH_APPROVED` before claiming
- BroadcastChannel ensures messages are ordered
- Ownership is atomic (only one tab can claim at a time)

### Browser Session Restore

- Tab IDs are in sessionStorage → new IDs on restore
- Stale `activeCallTabId` in localStorage → cleared by heartbeat timeout
- User sees passive banner briefly, then it clears

### Mobile Safari (No BroadcastChannel)

- Falls back to `storage` event listener
- Heartbeat writes to localStorage trigger `storage` events in other tabs
- Slightly higher latency but functionally equivalent

### Network Disconnection

- Socket disconnects in both tabs
- Both tabs enter "reconnecting" state
- WebRTC cleanup remains tab-local
- Ownership preserved across reconnection

### Simultaneous Claims

- localStorage writes are atomic
- First write wins
- Losing tab sees `claimOwnership()` return false
- Shows error toast

## Testing Checklist

- [ ] Opening second tab during call shows passive UI
- [ ] No second tab requests camera/mic
- [ ] Switching tabs transfers call cleanly (video/audio continue)
- [ ] Closing owner tab allows passive tab to detect timeout
- [ ] No backend errors during switch
- [ ] No duplicated socket events (no double-join, double-signal)
- [ ] Heartbeat stops when owner tab closes
- [ ] Passive tab can manually start new call after owner closes
- [ ] Rapid switching between 3+ tabs is stable
- [ ] Browser restore session clears stale ownership within 6s

## Debugging

Enable debug logging:
```typescript
import { logger } from "@ws/logger";

// CallTabCoordinator logs all:
// - Tab ID generation
// - Ownership claims/releases
// - Heartbeat send/receive
// - Message broadcasts
// - State changes

// Check console for:
// - "[CallTabCoordinator] initialized"
// - "[CallTabCoordinator] Claimed call ownership"
// - "[CallTabCoordinator] Handling switch request"
```

Inspect localStorage:
```javascript
localStorage.getItem("linky:activeCallTabId");
localStorage.getItem("linky:activeCallRoomId");
localStorage.getItem("linky:callStartedAt");
```

Inspect sessionStorage:
```javascript
sessionStorage.getItem("linky:tabId");
```

## Future Enhancements

- Auto-takeover on owner crash (configurable)
- Visual indication of which tab owns call (tab title badge)
- Tab list UI showing all open tabs
- Explicit "hand off" vs. "switch" flows
- Mobile tab coordination (service worker)
- Shared clipboard between tabs during call
