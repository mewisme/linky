# Linky Frontend

Next.js 16 application providing the user interface for Linky's real-time video chat platform. Handles WebRTC peer connections, real-time messaging, matchmaking UI, user profiles, and admin dashboard.

## Purpose

This application serves as the client-side interface for users to:
- Join random 1-to-1 video chat sessions
- Manage video/audio controls during calls
- Send real-time text messages and attachments
- Track progress (streaks, levels, favorites)
- Manage profile and preferences
- Monitor system health (admin users only)

## Core Features

### Video Chat

**Matching lifecycle:**
1. User clicks "Start" to join matchmaking queue
2. Browser requests camera and microphone permissions
3. Frontend connects to Socket.IO `/chat` namespace with auth token
4. Backend pairs user with another from queue
5. WebRTC establishes peer-to-peer connection using STUN/TURN servers
6. Video streams render in UI with controls for mute, video toggle, skip, end call

**Floating video behavior:**
- Users can navigate away from `/chat` while in active call
- Video minimizes to draggable picture-in-picture overlay
- Call persists until user explicitly ends or peer disconnects
- Navigation back to `/chat` restores full video UI

**Reconnection handling:**
- Socket.IO auto-reconnects on transient disconnects
- Frontend updates socketId in matchmaking queue on reconnection
- Users remain queued during brief network interruptions
- Active calls end on transport-level disconnect (real network failure)

### Chat Messaging

Real-time text chat runs alongside video calls:
- Message input with typing indicators
- File attachments (images, documents) via S3 upload
- Message history persisted to database
- Reactions and message snapshots
- Chat panel toggles open/closed without affecting video

### User Progress

**Streaks**: Days of consecutive usage, displayed on profile. Resets if user misses a day.

**Levels**: Calculated from total call time and other metrics. Unlocks badges and UI customizations.

**Favorites**: Users can favorite peers during or after calls. Favorites increase chance of future matches.

### Admin Dashboard

High-level view for admin users:
- User table with pagination, search, and filtering
- Real-time presence monitoring via Socket.IO `/admin` namespace
- Role management (admin/member)
- User allow/deny status updates
- Visit statistics and call history

## State Management

**Zustand stores** (client-side state):
- `user-store.ts`: Current user profile, preferences
- `video-chat-store.ts`: Call state, peer info, room ID
- `socket-store.ts`: Socket connection status
- `notifications-store.ts`: Toast notifications queue
- `chat-panel-store.ts`: Chat sidebar open/closed state

**TanStack React Query** (server state):
- Fetches user data, favorites, progress from REST API
- Caches responses with stale-while-revalidate
- Automatic refetch on window focus or network reconnection
- Mutation hooks for updates (add favorite, update profile)

**Custom hooks**:
- `use-socket-signaling.ts`: Socket.IO event handling
- `use-peer-connection.ts`: WebRTC RTCPeerConnection lifecycle
- `use-media-stream.ts`: Camera/microphone access and track management
- `use-video-chat.ts`: Orchestrates signaling, peer connection, media stream

## Socket Usage

**Connection initialization:**
- `SocketProvider` establishes Socket.IO connection on app load
- Auth token from Clerk passed in connection handshake
- Single shared socket instance stored in module-level singleton
- Listeners registered once per component mount with idempotency guards

**Event flow (client to server):**
- `join`: Enter matchmaking queue
- `skip`: Leave current peer, re-enter queue
- `end-call`: End call gracefully, do NOT re-enter queue
- `signal`: Send WebRTC signaling data (offer, answer, ICE candidate)
- `chat:send`: Send text message
- `chat:attachment:send`: Send file attachment
- `mute-toggle`, `video-toggle`, `screen-share:toggle`: Notify peer of control changes
- `favorite:notify-peer`: Notify peer they've been favorited

**Event flow (server to client):**
- `joined-queue`: Confirmation of queue entry
- `matched`: Paired with peer (includes `roomId`, `peerId`, `isOfferer`, peer info)
- `signal`: Receive WebRTC signaling data from peer
- `peer-left`: Peer disconnected
- `peer-skipped`: Peer clicked skip
- `end-call`: Peer ended call
- `chat:message`: Incoming text message
- `chat:typing`: Peer typing indicator
- `mute-toggle`, `video-toggle`, `screen-share:toggle`: Peer control changes
- `favorite:added`, `favorite:removed`: Peer favorited/unfavorited you

## Clerk Authentication

**Integration:**
- `@clerk/nextjs` provides middleware, components, hooks
- `<SignIn />` and `<SignUp />` components render auth UI
- `clerkMiddleware` redirects unauthenticated users to sign-in
- Custom JWT template includes user metadata for backend validation

**Token refresh:**
- Tokens auto-refresh every 5 minutes
- Frontend re-initializes Socket.IO connection on token expiry
- Backend validates tokens via Clerk SDK on protected routes

**User profile:**
- `<UserButton />` component provides profile dropdown
- Profile page allows bio, location, interests, photo upload
- Changes persist to Supabase via backend API

## Environment Variables

Frontend requires these environment variables in `apps/web/.env.local`:

```env
# Clerk authentication (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Backend API URL (required)
NEXT_PUBLIC_API_URL=http://localhost:3001

# MQTT presence (optional)
NEXT_PUBLIC_MQTT_CLIENT_URL=mqtt://localhost
NEXT_PUBLIC_MQTT_CLIENT_PORT=1883
NEXT_PUBLIC_MQTT_CLIENT_USERNAME=
NEXT_PUBLIC_MQTT_CLIENT_PASSWORD=

# App URL (optional, defaults to localhost:3000)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Obtain Clerk keys from [clerk.com](https://clerk.com) dashboard. Create application and enable email, password, and passkey authentication methods.

## Development

**Run frontend only:**

```bash
cd apps/web
pnpm dev
```

App runs on `http://localhost:3000`.

**Prerequisites:**
- Backend API must be running on port 3001 (or `NEXT_PUBLIC_API_URL`)
- Clerk account configured with correct redirect URLs
- Valid Clerk publishable and secret keys

**Hot reload:**
- Next.js watches file changes and hot-reloads
- React components update without full page refresh
- Shared `@ws/ui` components also hot-reload via Turborepo

**Type checking:**

```bash
pnpm check-types
```

**Linting:**

```bash
pnpm lint
```

**Building:**

```bash
pnpm build
pnpm start
```

## Development Constraints

**Network layer:**
- Use native `fetch` for API requests
- Do NOT install or use `axios`
- API client in `lib/client.ts` wraps fetch with auth headers

**Shared components:**
- Import UI primitives from `@ws/ui/components/*`
- Import date utilities from `@ws/ui/internal-lib/date-fns`
- Do NOT install dependencies already in `@ws/ui/package.json`

**Icons:**
- Use `@tabler/icons-react` for new icons
- Avoid `lucide-react` (legacy usage exists but should not be extended)

**Redis:**
- Frontend has NO access to Redis
- All cache reads/writes happen via backend API
- Do NOT install `redis` or `ioredis` in frontend

**File naming:**
- Use kebab-case for all files: `user-profile.tsx`, `use-socket-signaling.ts`

## Navigation During Calls

**Supported routes while in call:**
- `/chat`: Full video chat UI
- `/`: Landing page (video minimizes to PiP)
- `/profile`: User profile (video minimizes to PiP)
- Any other route (video minimizes to PiP)

**Unsupported routes (end call automatically):**
- `/sign-in`, `/sign-up`: Auth pages
- `/admin`: Admin dashboard (different Socket.IO namespace)

**Implementation:**
- `DraggableVideoOverlay` component tracks call state in `video-chat-store`
- Component conditionally renders based on route and call status
- User can click PiP overlay to navigate back to `/chat`
- Clicking "End Call" in PiP destroys overlay and tears down peer connection

## WebRTC Connection Flow

1. **ICE servers fetch**: `GET /api/ice-servers` returns Cloudflare TURN credentials
2. **Peer connection setup**: Create `RTCPeerConnection` with ICE servers
3. **Media tracks**: Add local video and audio tracks from `getUserMedia`
4. **Offer/Answer (if offerer)**: Create SDP offer, send via `signal` event
5. **Offer/Answer (if answerer)**: Receive SDP offer, create answer, send via `signal` event
6. **ICE candidates**: Both peers exchange ICE candidates via `signal` event
7. **Connection established**: `ontrack` fires with remote media stream
8. **Render remote video**: Attach remote stream to `<video>` element

**Cleanup on disconnect:**
- Stop all local media tracks
- Close `RTCPeerConnection`
- Remove Socket.IO event listeners
- Disconnect MQTT client
- Clear peer info from state

## Project Structure

```
apps/web/src/
├── app/                       Next.js App Router
│   ├── (app)/                 Authenticated pages
│   │   ├── chat/              Video chat UI
│   │   ├── profile/           User profile
│   │   ├── favorites/         Favorites list
│   │   ├── history/           Call history
│   │   └── admin/             Admin dashboard
│   ├── (auth)/                Auth pages
│   │   ├── sign-in/           Clerk sign-in
│   │   └── sign-up/           Clerk sign-up
│   ├── (marketing)/           Public pages
│   │   └── page.tsx           Landing page
│   └── api/                   Next.js API routes (proxies to backend)
│
├── components/                React components
│   ├── header/                App header, logo, theme toggle
│   ├── landing/               Landing page sections
│   └── layouts/               Layout wrappers
│
├── hooks/                     Custom React hooks
│   ├── socket/                Socket.IO hooks
│   ├── webrtc/                WebRTC hooks
│   ├── chat/                  Chat message hooks
│   ├── user/                  User data hooks
│   └── notifications/         Notification hooks
│
├── lib/                       Client libraries
│   ├── api/                   Backend API client
│   ├── socket/                Socket.IO client setup
│   ├── webrtc/                WebRTC utilities
│   ├── mqtt/                  MQTT client
│   └── client.ts              Fetch wrapper with auth
│
├── stores/                    Zustand stores
│   ├── user-store.ts
│   ├── video-chat-store.ts
│   ├── socket-store.ts
│   ├── notifications-store.ts
│   └── chat-panel-store.ts
│
├── types/                     TypeScript types
│   ├── api.types.ts           API response types
│   ├── chat-message.types.ts  Chat message types
│   └── users.types.ts         User types
│
└── utils/                     Utility functions
    ├── logger.ts              Console logging wrapper
    └── roles.ts               Role checking helpers
```

## Testing

E2E tests run via Playwright from repository root:

```bash
pnpm test          # All tests
pnpm test:ui       # UI mode
pnpm test:debug    # Debug mode
```

Tests cover:
- Authentication flow (sign-in, sign-up, sign-out)
- Video chat matching
- Chat messaging
- User profile updates
- Admin dashboard (for admin users)

Test configuration in `playwright.config.ts`. Global setup authenticates test users via Clerk.
