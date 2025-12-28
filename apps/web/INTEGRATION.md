# Integration Guide

This document explains how authentication, signaling, and WebRTC integrate in the Random Video Chat application.

## Architecture Overview

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─── Clerk (Authentication)
         │    └─── User management, sign-in/sign-up
         │
         ├─── Socket.IO Client (Signaling)
         │    └─── WebRTC signaling, matchmaking
         │
         └─── WebRTC (Media)
             └─── Peer-to-peer video/audio
```

## Component Integration

### 1. Authentication (Clerk)

**Location**: `app/layout.tsx`, `proxy.ts`

**How it works:**
- `ClerkProvider` wraps the entire application in the root layout
- `clerkMiddleware` protects routes (except public routes like `/`, `/sign-in`, `/sign-up`)
- Unauthenticated users accessing `/chat` are redirected to Clerk sign-in
- Clerk handles all authentication UI (`<SignIn />`, `<SignUp />`, `<UserButton />`)

**Flow:**
1. User visits `/` (landing page)
2. Clicks "Start Chat"
3. If not authenticated → Clerk redirects to `/sign-in`
4. User signs in → Clerk redirects back to `/chat`
5. If authenticated → Direct navigation to `/chat`

### 2. Signaling (Socket.IO)

**Location**: `lib/socket.ts`, `hooks/use-video-chat.ts`

**How it works:**
- Socket.IO client connects to backend signaling server
- Handles matchmaking queue and WebRTC signaling
- Events flow:
  - Client emits `join` → Server responds with `joined-queue` or `matched`
  - When matched, both peers exchange WebRTC signals via `signal` event
  - Server relays SDP offers/answers and ICE candidates between peers

**Key Events:**
- `join` - Enter matchmaking queue
- `matched` - Peer found, start WebRTC negotiation
- `signal` - Exchange SDP/ICE data
- `peer-left` - Peer disconnected, cleanup required
- `skip` - Skip current peer, re-enter queue

### 3. WebRTC (Peer-to-Peer Media)

**Location**: `lib/webrtc.ts`, `hooks/use-video-chat.ts`

**How it works:**
1. **ICE Servers**: Fetched from backend API (`/api/ice-servers`)
2. **Media Stream**: Requested from browser (`getUserMedia`)
3. **Peer Connection**: Created with ICE servers
4. **Signaling**: SDP offers/answers and ICE candidates exchanged via Socket.IO
5. **Connection**: Once connected, remote stream appears in video element

**WebRTC Flow:**
```
User clicks "Start"
  ↓
Fetch ICE servers from backend
  ↓
Get user media (camera + microphone)
  ↓
Create RTCPeerConnection with ICE servers
  ↓
Add local tracks to peer connection
  ↓
Connect to Socket.IO
  ↓
Emit "join" → Wait for match
  ↓
On "matched":
  - Create SDP offer
  - Set local description
  - Send offer via Socket.IO
  ↓
On receiving offer:
  - Set remote description
  - Create SDP answer
  - Set local description
  - Send answer via Socket.IO
  ↓
Exchange ICE candidates via Socket.IO
  ↓
Connection established → Remote stream received
```

## Data Flow

### Starting a Chat Session

```
1. User clicks "Start" button
   ↓
2. useVideoChat hook:
   - Fetches ICE servers (GET /api/ice-servers)
   - Requests media (getUserMedia)
   - Creates RTCPeerConnection
   - Connects Socket.IO
   - Emits "join"
   ↓
3. Backend:
   - Adds user to matchmaking queue
   - When match found, emits "matched" to both users
   ↓
4. Both users:
   - Create SDP offer (one peer)
   - Create SDP answer (other peer)
   - Exchange via Socket.IO "signal" events
   ↓
5. ICE candidates exchanged
   ↓
6. Connection established
   - Remote stream received
   - Status changes to "connected"
```

### Skipping a Peer

```
1. User clicks "Skip" button
   ↓
2. Socket.IO emits "skip"
   ↓
3. Backend:
   - Removes both users from room
   - Emits "peer-left" to other peer
   - Re-adds user to queue
   - Emits "skipped" to user
   ↓
4. User:
   - Cleans up peer connection
   - Waits for new match
```

### Cleanup on Disconnect

```
1. User leaves page or clicks disconnect
   ↓
2. Cleanup function:
   - Stops all media tracks
   - Closes RTCPeerConnection
   - Disconnects Socket.IO
   ↓
3. Backend:
   - Removes user from room/queue
   - Emits "peer-left" to peer (if in room)
```

## State Management

The `useVideoChat` hook manages all state:

- **localStream**: User's camera/microphone stream
- **remoteStream**: Peer's video/audio stream
- **connectionStatus**: Current connection state (idle/searching/connected/peer-disconnected)
- **isMuted**: Audio mute state
- **isVideoOff**: Video off state
- **error**: Error messages

## Error Handling

### Media Access Errors
- User denies camera/microphone → Error message shown
- Device not available → Error message shown

### Connection Errors
- ICE server fetch fails → Error message, retry option
- WebRTC connection fails → Status changes to "peer-disconnected"
- Socket.IO errors → Error message shown

### Timeout Handling
- Queue timeout (5 minutes) → Error message, user can retry

## Security Considerations

1. **Authentication**: All routes except public ones require Clerk authentication
2. **CORS**: Backend handles CORS for Socket.IO connections
3. **Media Permissions**: Browser handles camera/microphone permissions
4. **HTTPS**: Required for WebRTC in production (browser requirement)

## Performance Optimizations

1. **ICE Server Caching**: Backend caches ICE servers for 1 hour
2. **Connection Pooling**: ICE candidate pool size set to 10
3. **Media Constraints**: Video resolution optimized (1280x720 ideal)
4. **Cleanup**: Proper resource cleanup prevents memory leaks

## Testing the Integration

1. **Start Backend**: Ensure API server is running on port 3001
2. **Start Frontend**: Run `pnpm dev` in `apps/web`
3. **Test Flow**:
   - Visit `http://localhost:3000`
   - Sign in with Clerk
   - Click "Start Chat"
   - Grant camera/microphone permissions
   - Wait for match
   - Test video/audio
   - Test skip functionality
   - Test mute/video toggle

## Troubleshooting Integration Issues

### Authentication Not Working
- Check Clerk keys in `.env.local`
- Verify Clerk dashboard configuration
- Check browser console for Clerk errors

### Signaling Not Working
- Verify backend is running
- Check `NEXT_PUBLIC_API_URL` environment variable
- Check Socket.IO connection in browser DevTools Network tab
- Verify backend CORS configuration

### WebRTC Not Connecting
- Check ICE servers are fetched successfully
- Verify media permissions are granted
- Check browser console for WebRTC errors
- Verify both peers are in the same room (check Socket.IO events)
- Check firewall/NAT configuration (may need TURN servers)

### Media Not Showing
- Verify camera/microphone permissions
- Check if devices are in use by another application
- Verify video elements have `autoPlay` and `playsInline` attributes
- Check browser console for media errors

