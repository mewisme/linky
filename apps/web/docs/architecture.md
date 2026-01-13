# Video Chat Architecture

This document provides a comprehensive overview of the video chat system architecture, including hook relationships, WebSocket communication flows, and integration patterns.

## System Overview

The video chat system is built on a client-server architecture using:
- **Frontend**: React hooks managing WebRTC connections and WebSocket signaling
- **Backend**: Node.js/Express with Socket.IO for real-time communication
- **WebRTC**: Peer-to-peer video/audio communication
- **MQTT**: Presence status broadcasting

## Architecture Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (React)"]
        Component["Video Chat Component"]
        useVideoChat["use-video-chat<br/>(Orchestrator)"]
        useSocketSignaling["use-socket-signaling<br/>(WebSocket)"]
        usePeerConnection["use-peer-connection<br/>(WebRTC)"]
        useMediaStream["use-media-stream<br/>(Media)"]
        useVideoChatState["use-video-chat-state<br/>(State)"]
    end

    subgraph Backend["Backend (Node.js)"]
        SocketIO["Socket.IO Server"]
        Matchmaking["Matchmaking Service"]
        RoomService["Room Service"]
        UserSessions["User Session Service"]
    end

    subgraph External["External Services"]
        MQTTBroker["MQTT Broker<br/>(Presence)"]
        ICEServers["ICE Servers<br/>(STUN/TURN)"]
    end

    Component --> useVideoChat
    useVideoChat --> useSocketSignaling
    useVideoChat --> usePeerConnection
    useVideoChat --> useMediaStream
    useVideoChat --> useVideoChatState
    
    useSocketSignaling <-->|WebSocket| SocketIO
    usePeerConnection -->|Fetch Config| ICEServers
    useSocketSignaling -->|Publish| MQTTBroker
    
    SocketIO --> Matchmaking
    SocketIO --> RoomService
    SocketIO --> UserSessions
```

## Hook Dependency Relationships

```mermaid
graph LR
    A[use-video-chat] --> B[use-socket-signaling]
    A --> C[use-peer-connection]
    A --> D[use-media-stream]
    A --> E[use-video-chat-state]
    
    B -->|Sends signals| C
    C -->|Uses stream| D
    A -->|Manages state| E
```

## WebSocket Communication Flow

### Connection Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant SocketIO
    participant Matchmaking
    participant Peer

    Client->>SocketIO: connect (with auth token)
    SocketIO->>Client: session-waiting / session-activated
    
    Client->>SocketIO: join
    SocketIO->>Matchmaking: enqueue user
    SocketIO->>Client: joined-queue
    
    Matchmaking->>Matchmaking: find match
    Matchmaking->>Client: matched (isOfferer: true)
    Matchmaking->>Peer: matched (isOfferer: false)
    
    Client->>SocketIO: signal (offer)
    SocketIO->>Peer: signal (offer)
    Peer->>SocketIO: signal (answer)
    SocketIO->>Client: signal (answer)
    
    Client->>SocketIO: signal (ice-candidate)
    SocketIO->>Peer: signal (ice-candidate)
    Peer->>SocketIO: signal (ice-candidate)
    SocketIO->>Client: signal (ice-candidate)
    
    Note over Client,Peer: WebRTC connection established
    
    Client->>SocketIO: chat-message
    SocketIO->>Peer: chat-message
    
    Client->>SocketIO: end-call
    SocketIO->>Peer: end-call
    SocketIO->>Matchmaking: cleanup room
```

### WebSocket Events

#### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `join` | Join matchmaking queue | None |
| `skip` | Skip current peer | None |
| `signal` | WebRTC signaling data | `{ type, sdp?, candidate? }` |
| `chat-message` | Send chat message | `{ message, timestamp }` |
| `mute-toggle` | Toggle mute state | `{ muted: boolean }` |
| `end-call` | End current call | None |

#### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `session-waiting` | Session queued | `{ message, positionInQueue, queueSize }` |
| `session-activated` | Session activated | `{ message }` |
| `joined-queue` | Successfully joined queue | `{ message, queueSize }` |
| `matched` | Peer matched | `{ roomId, peerId, isOfferer }` |
| `signal` | WebRTC signaling data | `{ type, sdp?, candidate? }` |
| `peer-left` | Peer disconnected | `{ message, queueSize? }` |
| `peer-skipped` | Peer skipped | `{ message, queueSize }` |
| `skipped` | You skipped peer | `{ message, queueSize }` |
| `end-call` | Call ended | `{ message }` |
| `chat-message` | Chat message received | `{ message, timestamp, senderId, senderName?, senderImageUrl? }` |
| `mute-toggle` | Peer mute state changed | `{ muted: boolean }` |
| `queue-timeout` | Queue timeout | `{ message }` |
| `error` | Error occurred | `{ message }` |

## WebRTC Signaling Flow

```mermaid
sequenceDiagram
    participant ClientA as Client A<br/>(Offerer)
    participant SocketIO as Socket.IO
    participant ClientB as Client B<br/>(Answerer)
    participant WebRTC as WebRTC Engine

    Note over ClientA,ClientB: Match found
    ClientA->>WebRTC: createOffer()
    WebRTC->>ClientA: offer (SDP)
    ClientA->>SocketIO: signal { type: "offer", sdp }
    SocketIO->>ClientB: signal { type: "offer", sdp }
    ClientB->>WebRTC: setRemoteDescription(offer)
    ClientB->>WebRTC: createAnswer()
    WebRTC->>ClientB: answer (SDP)
    ClientB->>SocketIO: signal { type: "answer", sdp }
    SocketIO->>ClientA: signal { type: "answer", sdp }
    ClientA->>WebRTC: setRemoteDescription(answer)
    
    Note over ClientA,ClientB: ICE Candidate Exchange
    ClientA->>WebRTC: ICE candidate generated
    WebRTC->>ClientA: onicecandidate
    ClientA->>SocketIO: signal { type: "ice-candidate", candidate }
    SocketIO->>ClientB: signal { type: "ice-candidate", candidate }
    ClientB->>WebRTC: addIceCandidate(candidate)
    
    ClientB->>WebRTC: ICE candidate generated
    WebRTC->>ClientB: onicecandidate
    ClientB->>SocketIO: signal { type: "ice-candidate", candidate }
    SocketIO->>ClientA: signal { type: "ice-candidate", candidate }
    ClientA->>WebRTC: addIceCandidate(candidate)
    
    Note over ClientA,ClientB: Connection Established
    WebRTC->>ClientA: ontrack (remote stream)
    WebRTC->>ClientB: ontrack (remote stream)
```

## Video Chat Lifecycle

```mermaid
stateDiagram-v2
    [*] --> idle: Initial state
    
    idle --> searching: start() called
    searching --> connecting: matched event
    connecting --> connected: WebRTC connection established
    connecting --> peer-disconnected: Connection failed
    connected --> searching: peer-left / peer-skipped
    connected --> idle: end-call
    searching --> idle: queue-timeout / error
    peer-disconnected --> idle: Cleanup
    
    note right of searching
        Waiting in matchmaking queue
    end note
    
    note right of connecting
        Exchanging WebRTC offers/answers
        and ICE candidates
    end note
    
    note right of connected
        Active video/audio call
        Chat messages enabled
    end note
```

## State Management Pattern

The system uses a centralized state management approach:

```mermaid
graph TB
    Component["Component"] --> useVideoChat["use-video-chat"]
    useVideoChat --> useVideoChatState["use-video-chat-state<br/>(useReducer)"]
    
    useVideoChatState --> State["State Object"]
    useVideoChatState --> Actions["Action Creators"]
    
    useVideoChat --> useSocketSignaling
    useSocketSignaling -->|Updates state| useVideoChatState
    useVideoChat --> usePeerConnection
    usePeerConnection -->|Updates state| useVideoChatState
    useVideoChat --> useMediaStream
    useMediaStream -->|Updates state| useVideoChatState
```

### State Structure

```typescript
interface VideoChatState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteMuted: boolean;
  connectionStatus: ConnectionStatus;
  chatMessages: ChatMessage[];
  error: string | null;
}
```

## MQTT Presence Integration

The system publishes presence status to an MQTT broker for real-time user status tracking:

```mermaid
sequenceDiagram
    participant Hook
    participant MQTTClient
    participant MQTTBroker
    participant Subscribers

    Hook->>MQTTClient: publishPresence('online')
    MQTTClient->>MQTTBroker: Publish to presence/{userId}
    MQTTBroker->>Subscribers: Broadcast presence update
    
    Hook->>MQTTClient: publishPresence('matching')
    MQTTClient->>MQTTBroker: Publish to presence/{userId}
    
    Hook->>MQTTClient: publishPresence('in_call')
    MQTTClient->>MQTTBroker: Publish to presence/{userId}
    
    Hook->>MQTTClient: publishPresence('available')
    MQTTClient->>MQTTBroker: Publish to presence/{userId}
    
    Hook->>MQTTClient: publishPresence('offline')
    MQTTClient->>MQTTBroker: Publish to presence/{userId}
```

### Presence States

- `online`: Socket connected, user available
- `matching`: User in matchmaking queue
- `in_call`: User in active video call
- `available`: User available but not in queue
- `offline`: Socket disconnected

## Authentication Flow

```mermaid
sequenceDiagram
    participant Component
    participant useVideoChat
    participant Clerk
    participant SocketIO

    Component->>useVideoChat: start()
    useVideoChat->>Clerk: getToken()
    Clerk->>useVideoChat: JWT token
    useVideoChat->>SocketIO: connect with token
    SocketIO->>SocketIO: Verify token
    SocketIO->>useVideoChat: Connected
    
    Note over useVideoChat,SocketIO: Token refreshed every 5 minutes
    useVideoChat->>Clerk: getToken() (periodic)
    Clerk->>useVideoChat: New token
    useVideoChat->>SocketIO: updateToken()
    SocketIO->>SocketIO: Reconnect with new token
```

## Error Handling Strategy

The system implements multiple layers of error handling:

1. **WebSocket Level**: Connection errors, reconnection attempts
2. **WebRTC Level**: ICE connection failures, peer disconnections
3. **State Level**: Error messages stored in state, displayed to user
4. **User Level**: Toast notifications for critical errors

## Performance Considerations

- **ICE Server Pooling**: Pre-fetched and cached ICE servers
- **Token Refresh**: Automatic token refresh every 5 minutes
- **Resource Cleanup**: Proper cleanup of media streams and peer connections
- **State Optimization**: useReducer to minimize re-renders
- **Memoization**: Callbacks and return values memoized

## Security Considerations

- **JWT Authentication**: All WebSocket connections require valid JWT tokens
- **Token Refresh**: Tokens automatically refreshed to prevent expiration
- **Session Management**: Backend enforces single active session per user
- **Room Isolation**: Users can only communicate within matched rooms
- **Signal Validation**: Backend validates all signaling data before relay
