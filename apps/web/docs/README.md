# Video Chat Hooks Documentation

This directory contains comprehensive documentation for the video chat hooks used in the Linky application. These hooks manage WebSocket connections, WebRTC peer connections, media streams, and state management for the video chat feature.

## Documentation Structure

### [Architecture Overview](./architecture.md)
High-level system architecture, hook relationships, WebSocket communication flows, and integration patterns.

### Hook Documentation

#### Core Hooks

- **[use-socket-signaling](./hooks/use-socket-signaling.md)** - WebSocket connection management and signaling layer
- **[use-peer-connection](./hooks/use-peer-connection.md)** - WebRTC peer connection wrapper
- **[use-media-stream](./hooks/use-media-stream.md)** - Local media stream (camera/microphone) management
- **[use-video-chat-state](./hooks/use-video-chat-state.md)** - Centralized state management using useReducer
- **[use-video-chat](./hooks/use-video-chat.md)** - Main orchestrator hook combining all video chat functionality

## Quick Start

The primary hook for video chat functionality is `use-video-chat`. It orchestrates all other hooks and provides a simple interface for components:

```typescript
import { useVideoChat } from '@/hooks/use-video-chat';

function VideoChatComponent() {
  const {
    localStream,
    remoteStream,
    connectionStatus,
    isMuted,
    isVideoOff,
    chatMessages,
    sendMessage,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    error,
    clearError,
  } = useVideoChat();

  // Use the hook's return values...
}
```

## Hook Dependency Graph

```
use-video-chat (orchestrator)
├── use-socket-signaling (WebSocket)
├── use-peer-connection (WebRTC)
├── use-media-stream (Media)
└── use-video-chat-state (State)
```

## Backend Integration

All hooks interact with the backend through:

- **WebSocket (Socket.IO)**: Real-time signaling, matchmaking, and chat
- **REST API**: ICE server configuration, authentication
- **MQTT**: Presence status publishing

See [Architecture Overview](./architecture.md) for detailed integration flows.

## Related Documentation

- Backend WebSocket handlers: `apps/api/src/socket/video-chat/`
- WebRTC utilities: `apps/web/lib/webrtc.ts`
- Socket client: `apps/web/lib/socket.ts`
- MQTT client: `apps/web/lib/mqtt/client.ts`
