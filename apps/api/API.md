# API Documentation

Complete API reference for the video chat signaling backend.

## Base URL

```
http://localhost:3001
```

Default port: `3001` (configurable via `PORT` environment variable)

---

## REST API Endpoints

### Health Check

**GET** `/health`

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Status Codes:**
- `200 OK` - Server is healthy

---

### API Status

**GET** `/api`

Get API status information.

**Response:**
```json
{
  "message": "API is running"
}
```

**Status Codes:**
- `200 OK` - API is operational

---

### ICE Servers Configuration

**GET** `/api/ice-servers`

Fetches ICE server configuration from Cloudflare TURN API for WebRTC connections.

**Headers:**
- None required

**Query Parameters:**
- None

**Request Body:**
- None

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

**Status Codes:**
- `200 OK` - ICE servers fetched successfully
- `500 Internal Server Error` - Cloudflare credentials not configured or server error
- `504 Gateway Timeout` - Request to Cloudflare API timed out

**Notes:**
- Response is cached for 1 hour to reduce API calls
- Requires `CLOUDFLARE_TURN_API_TOKEN` and `CLOUDFLARE_TURN_KEY_ID` environment variables
- If credentials are not configured, returns 500 error

**Example:**
```bash
curl http://localhost:3001/api/ice-servers
```

---

## Socket.IO Events

### Connection

Connect to the Socket.IO server:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  transports: ["websocket"],
});
```

**Connection Options:**
- `transports`: `["websocket"]` - Use WebSocket transport
- CORS is configured on the server (configurable via `CORS_ORIGIN`)

---

### Client → Server Events

#### `join`

Join the matchmaking queue to find a random peer for video chat.

**Payload:**
- None

**Response Events:**
- `joined-queue` - Successfully added to queue
- `error` - Error occurred (already in room/queue)

**Example:**
```javascript
socket.emit("join");
```

**Response (`joined-queue`):**
```json
{
  "message": "Waiting for a match...",
  "queueSize": 3
}
```

**Error Response (`error`):**
```json
{
  "message": "Already in a room. Please disconnect first."
}
```
or
```json
{
  "message": "Already in queue."
}
```

---

#### `skip`

Skip the current peer and re-enter the matchmaking queue.

**Payload:**
- None

**Response Events:**
- `skipped` - Successfully skipped and re-queued
- `peer-left` (sent to peer) - Peer skipped the connection

**Example:**
```javascript
socket.emit("skip");
```

**Response (`skipped`):**
```json
{
  "message": "Skipped. Looking for new match...",
  "queueSize": 2
}
```

---

#### `signal`

Send WebRTC signaling data to the peer (SDP offers, answers, or ICE candidates).

**Payload:**
```typescript
{
  type: "offer" | "answer" | "ice-candidate",
  sdp?: RTCSessionDescriptionInit,  // For offer/answer
  candidate?: RTCIceCandidateInit    // For ICE candidates
}
```

**Response Events:**
- `signal` (sent to peer) - Signal relayed to peer
- `error` - Error occurred (not in a room)

**Example - SDP Offer:**
```javascript
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

socket.emit("signal", {
  type: "offer",
  sdp: offer,
});
```

**Example - SDP Answer:**
```javascript
socket.on("signal", async (data) => {
  if (data.type === "offer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit("signal", {
      type: "answer",
      sdp: answer,
    });
  }
});
```

**Example - ICE Candidate:**
```javascript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("signal", {
      type: "ice-candidate",
      candidate: event.candidate,
    });
  }
};
```

**Error Response (`error`):**
```json
{
  "message": "Not in a room. Cannot send signal."
}
```

---

#### `disconnect`

Disconnect from the server (automatic on socket close).

**Payload:**
- None (automatic)

**Response Events:**
- `peer-left` (sent to peer) - Peer disconnected

---

### Server → Client Events

#### `joined-queue`

Emitted when successfully added to the matchmaking queue.

**Payload:**
```json
{
  "message": "Waiting for a match...",
  "queueSize": 3
}
```

---

#### `matched`

Emitted when matched with another user. Both users receive this event.

**Payload:**
```json
{
  "roomId": "room_abc123_xyz789_1705315845123",
  "peerId": "xyz789",
  "isOfferer": true
}
```

**Fields:**
- `roomId` - Unique room identifier for this match
- `peerId` - Socket ID of the matched peer
- `isOfferer` - Boolean indicating if this user should create the WebRTC offer (user with lower socket ID becomes offerer)

**Notes:**
- Only the user with `isOfferer: true` should create and send the SDP offer
- The other user (`isOfferer: false`) should wait for the offer and respond with an answer
- This prevents race conditions where both peers try to create offers simultaneously

**Example:**
```javascript
socket.on("matched", ({ roomId, peerId, isOfferer }) => {
  console.log("Matched with peer:", peerId);
  console.log("Room ID:", roomId);
  console.log("Is offerer:", isOfferer);
  
  if (isOfferer) {
    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signal", { type: "offer", sdp: offer });
  } else {
    // Wait for offer from peer
    console.log("Waiting for offer from peer...");
  }
});
```

---

#### `signal`

Received WebRTC signaling data from the peer.

**Payload:**
```typescript
{
  type: "offer" | "answer" | "ice-candidate",
  sdp?: RTCSessionDescriptionInit,
  candidate?: RTCIceCandidateInit
}
```

**Example:**
```javascript
socket.on("signal", async (data) => {
  if (data.type === "offer") {
    // Handle SDP offer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("signal", { type: "answer", sdp: answer });
  } else if (data.type === "answer") {
    // Handle SDP answer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  } else if (data.type === "ice-candidate") {
    // Handle ICE candidate
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});
```

---

#### `peer-left`

Emitted when the peer disconnects or skips the connection.

**Payload:**
```json
{
  "message": "Peer disconnected"
}
```

**Example:**
```javascript
socket.on("peer-left", () => {
  console.log("Peer left, cleaning up...");
  peerConnection.close();
  // Optionally re-enter queue
  socket.emit("join");
});
```

---

#### `skipped`

Emitted when successfully skipped and re-queued.

**Payload:**
```json
{
  "message": "Skipped. Looking for new match...",
  "queueSize": 2
}
```

---

#### `error`

Emitted when an error occurs.

**Payload:**
```json
{
  "message": "Error description"
}
```

**Common Error Messages:**
- `"Already in a room. Please disconnect first."`
- `"Already in queue."`
- `"Not in a room. Cannot send signal."`

---

#### `queue-timeout`

Emitted when a user has been waiting in the queue for too long (5 minutes).

**Payload:**
```json
{
  "message": "Queue timeout. Please try again."
}
```

---

## WebRTC Integration Flow

### Complete Example

```javascript
import { io } from "socket.io-client";

// 1. Fetch ICE servers
const iceResponse = await fetch("http://localhost:3001/api/ice-servers");
const { iceServers } = await iceResponse.json();

// 2. Create RTCPeerConnection with ICE servers
const peerConnection = new RTCPeerConnection({ iceServers });

// 3. Connect to signaling server
const socket = io("http://localhost:3001");

// 4. Join matchmaking queue
socket.emit("join");

// 5. Wait for match
socket.on("matched", async ({ peerId, isOfferer }) => {
  console.log("Matched with:", peerId);
  console.log("Is offerer:", isOfferer);
  
  // 6. Set up local media stream
  const localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });
  
  // 7. Create and send offer (only if offerer)
  if (isOfferer) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signal", { type: "offer", sdp: offer });
  } else {
    console.log("Waiting for offer from peer...");
  }
});

// 8. Handle incoming signals
socket.on("signal", async (data) => {
  if (data.type === "offer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("signal", { type: "answer", sdp: answer });
  } else if (data.type === "answer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  } else if (data.type === "ice-candidate") {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

// 9. Handle ICE candidates
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("signal", {
      type: "ice-candidate",
      candidate: event.candidate,
    });
  }
};

// 10. Handle remote stream
peerConnection.ontrack = (event) => {
  const remoteVideo = document.getElementById("remoteVideo");
  remoteVideo.srcObject = event.streams[0];
};

// 11. Handle peer leaving
socket.on("peer-left", () => {
  peerConnection.close();
  localStream.getTracks().forEach(track => track.stop());
  // Optionally re-join queue
  socket.emit("join");
});
```

---

## Environment Variables

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `CORS_ORIGIN` | CORS origin for Socket.IO | `*` |

### Cloudflare TURN (Optional)

| Variable | Description | Required |
|----------|-------------|----------|
| `CLOUDFLARE_TURN_API_TOKEN` | Cloudflare TURN API token | Yes (for `/api/ice-servers`) |
| `CLOUDFLARE_TURN_KEY_ID` | Cloudflare TURN API key ID | Yes (for `/api/ice-servers`) |

---

## Error Handling

### HTTP Errors

All REST endpoints return standard HTTP status codes:
- `200` - Success
- `404` - Not found
- `500` - Internal server error
- `504` - Gateway timeout (for external API calls)

### Socket.IO Errors

Errors are sent via the `error` event with a descriptive message:

```javascript
socket.on("error", (data) => {
  console.error("Socket error:", data.message);
});
```

---

## Rate Limiting

Currently, there are no rate limits implemented. Consider implementing rate limiting for production use.

---

## CORS Configuration

CORS is enabled for all origins by default (`CORS_ORIGIN=*`). For production, set `CORS_ORIGIN` to your frontend domain:

```bash
CORS_ORIGIN=https://yourdomain.com
```

---

## Notes

- The backend does **NOT** handle media streams (audio/video)
- All media handling is done client-side via WebRTC
- The backend only handles signaling (SDP offers/answers, ICE candidates)
- Rooms are automatically cleaned up when users disconnect
- Matchmaking is random - no filtering or preferences
- Queue timeout is 5 minutes

