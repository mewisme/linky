# API Server

Express.js API server with TypeScript and Socket.IO for **random 1-to-1 video chat** (WebRTC signaling backend).

## Features

- **Random Matchmaking**: Pairs users randomly for 1-to-1 video chat
- **WebRTC Signaling**: Relays SDP offers, answers, and ICE candidates between peers
- **Room Management**: Creates and manages private rooms for matched pairs
- **Queue System**: Maintains a waiting queue for users looking for matches
- **Cloudflare TURN Integration**: Dynamic ICE server configuration endpoint
- **Clean Disconnection**: Proper cleanup of rooms and queue entries

## Project Structure

```
src/
├── config/              # Configuration and environment variables
├── middleware/          # Express middleware
├── routes/              # API routes
│   ├── index.ts         # Route setup
│   ├── api.ts           # API v1 routes
│   └── ice-servers.ts   # Cloudflare TURN ICE servers endpoint
├── services/            # Business logic services
│   ├── matchmaking.ts   # Matchmaking queue service
│   └── rooms.ts         # Room management service
├── socket/              # Socket.IO handlers
│   ├── index.ts         # Socket.IO server setup
│   ├── handlers.ts      # General socket handlers
│   └── video-chat.ts    # Video chat signaling handlers
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
│   └── logger.ts        # Custom logger
├── server.ts            # Server setup and initialization
└── index.ts             # Application entry point
```

## Development

```bash
pnpm dev
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## Build

```bash
pnpm build
```

## Production

```bash
pnpm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS origin for Socket.IO (default: "*")
- `CLOUDFLARE_TURN_API_TOKEN` - Cloudflare TURN API token (optional)
- `CLOUDFLARE_TURN_KEY_ID` - Cloudflare TURN API key ID (optional)

## Signaling and Matchmaking Flow

### 1. User Joins Queue

When a user connects and emits `join`:
- User is added to the matchmaking queue
- Server responds with `joined-queue` event
- Server periodically checks for matches (every 1 second)

### 2. Matching Process

When 2+ users are in the queue:
- Two users are randomly selected
- A private room is created for the pair
- Both users receive `matched` event with `roomId` and `peerId`

### 3. WebRTC Signaling

Once matched, users exchange WebRTC signaling:
- **SDP Offer**: First user creates offer and sends via `signal` event
- **SDP Answer**: Second user creates answer and sends via `signal` event
- **ICE Candidates**: Both users exchange ICE candidates via `signal` event
- Server relays all `signal` messages between peers in the same room

### 4. User Actions

- **`skip`**: User leaves current peer and re-enters queue
- **`disconnect`**: User disconnects, peer is notified via `peer-left` event

### 5. Cleanup

- When a user disconnects or skips:
  - Room is deleted
  - Peer is notified
  - Remaining peer can re-enter queue if needed

## Socket.IO Events

### Client → Server

- `join` - Enter matchmaking queue
- `skip` - Leave current peer and re-enter queue
- `signal` - Send WebRTC signaling data (SDP offer/answer, ICE candidates)
- `disconnect` - User disconnects (automatic)

### Server → Client

- `joined-queue` - Confirmed added to queue
- `matched` - Matched with another user (includes `roomId` and `peerId`)
- `signal` - WebRTC signaling data from peer
- `peer-left` - Peer disconnected or skipped
- `skipped` - Confirmed skip and re-queued
- `error` - Error occurred
- `queue-timeout` - Queue timeout (after 5 minutes)

## REST API Endpoints

### GET /api/ice-servers

Fetches ICE server configuration from Cloudflare TURN API.

**Response:**
```json
{
  "iceServers": [
    {
      "urls": [
        "stun:stun.cloudflare.com:3478",
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp"
      ],
      "username": "<generated-username>",
      "credential": "<generated-credential>"
    }
  ]
}
```

**Note**: Requires `CLOUDFLARE_TURN_API_TOKEN` and `CLOUDFLARE_TURN_KEY_ID` environment variables. Response is cached for 1 hour to reduce API calls.

### GET /health

Health check endpoint.

### GET /api

API status endpoint.

## Adding New Features

### Adding API Routes

Create new route files in `src/routes/` and import them in `src/routes/index.ts`:

```typescript
// src/routes/users.ts
import { Router, type Request, type Response } from "express";
import { type ExpressRouter } from "express";

const router: ExpressRouter = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ users: [] });
});

export default router;
```

Then mount in `src/routes/index.ts`:
```typescript
import usersRouter from "./users.js";
app.use("/api/v1/users", usersRouter);
```

### Adding Socket.IO Events

Add new event handlers in `src/socket/handlers.ts`:

```typescript
socket.on("custom-event", (data: CustomType) => {
  // Handle event
  io.emit("custom-event-response", response);
});
```

### Adding Middleware

Add middleware functions in `src/middleware/index.ts` or create new middleware files.

