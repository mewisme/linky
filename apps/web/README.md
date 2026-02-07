# Linky - Frontend Application

A Next.js frontend application for random 1-to-1 video chat using WebRTC and Socket.IO. This application enables users to connect with people around the world through secure, real-time video conversations with integrated text chat functionality.

## Features

- **Clerk Authentication** - Secure user authentication with email verification, password, and passkey support
- **WebRTC Video Chat** - Peer-to-peer video and audio communication with low latency
- **Real-time Signaling** - Socket.IO-based signaling for WebRTC connection setup and management
- **Text Chat** - Real-time text messaging during video calls with message history
- **Admin Dashboard** - User management interface with role-based access control and presence monitoring
- **Presence System** - MQTT-based presence tracking for user status (online, offline, available, matching, in_call, idle)
- **Modern UI** - Built with shadcn/ui components and responsive design
- **Theme Support** - Dark and light mode with system preference detection
- **File Storage** - S3 integration for file uploads and downloads
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Next.js 16+** (App Router) - React framework with server-side rendering
- **TypeScript** - Type-safe development
- **Clerk** - Authentication and user management
- **Socket.IO Client** - Real-time signaling and communication
- **WebRTC** - Peer-to-peer video and audio streaming
- **MQTT** - Presence and status updates
- **shadcn/ui** - UI component library from `@repo/ui`
- **Zustand** - Lightweight state management
- **React Hot Toast** - Toast notifications
- **Motion** - Animation library
- **Axios** - HTTP client for API requests
- **Tailwind CSS** - Utility-first CSS framework

## Prerequisites

- Node.js 18+ and pnpm
- Clerk account (for authentication)
- Backend API running (see `apps/api/README.md`)
- MQTT broker (for presence system, optional)

## Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

Create a `.env.local` file in `apps/web/`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Backend API URL (default: http://localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001

# MQTT Configuration (optional, for presence system)
NEXT_PUBLIC_MQTT_CLIENT_URL=mqtt://localhost
NEXT_PUBLIC_MQTT_CLIENT_PORT=1883
NEXT_PUBLIC_MQTT_CLIENT_USERNAME=your_username
NEXT_PUBLIC_MQTT_CLIENT_PASSWORD=your_password
```

3. Configure Clerk:

- Sign up at [clerk.com](https://clerk.com)
- Create a new application
- Enable the following authentication methods:
  - Email (required)
  - Email verification code (magic code)
  - Password (minimum 8 characters, reject compromised passwords)
  - Passkeys
- Copy your publishable key and secret key to `.env.local`

4. Start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
apps/web/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication routes
│   │   ├── sign-in/              # Clerk sign-in page
│   │   ├── sign-up/              # Clerk sign-up page
│   │   └── user-profile/          # User profile management
│   ├── admin/                     # Admin dashboard (protected)
│   │   ├── _components/           # Admin-specific components
│   │   │   ├── data-table.tsx     # User data table
│   │   │   └── define-data.tsx    # Data definition utilities
│   │   ├── layout.tsx             # Admin layout
│   │   └── page.tsx               # Admin dashboard page
│   ├── chat/                      # Video chat page (protected)
│   │   ├── _components/           # Chat-specific components
│   │   │   ├── chat-sidebar.tsx   # Text chat sidebar
│   │   │   ├── draggable-video-overlay.tsx
│   │   │   ├── video-container.tsx
│   │   │   ├── video-controls.tsx
│   │   │   └── video-player.tsx
│   │   └── page.tsx               # Main chat page
│   ├── layout.tsx                 # Root layout with providers
│   └── page.tsx                   # Landing page
├── components/                    # Shared React components
│   ├── auth/                      # Authentication components
│   │   └── user-button.tsx        # User profile button
│   ├── header/                    # Header components
│   │   ├── index.tsx
│   │   ├── logo.tsx
│   │   └── mode-toggle.tsx        # Theme toggle
│   ├── landing/                   # Landing page components
│   │   ├── footer.tsx
│   │   └── social-proof.tsx
│   ├── layouts/                   # Layout components
│   │   └── with-header.tsx        # Layout with header
│   └── providers/                 # Context providers
│       ├── mqtt.tsx               # MQTT provider
│       ├── theme.tsx              # Theme provider
│       └── user-provider.tsx      # User data provider
├── hooks/                         # Custom React hooks
│   ├── use-media-stream.ts        # Media stream management
│   ├── use-peer-connection.ts     # WebRTC peer connection
│   ├── use-socket-signaling.ts    # Socket.IO signaling
│   ├── use-video-chat-state.ts    # Video chat state management
│   └── use-video-chat.ts          # Main video chat hook
├── lib/                           # Utility libraries
│   ├── api/                       # API utilities
│   │   ├── index.ts
│   │   └── s3.ts                  # S3 file operations
│   ├── mqtt/                      # MQTT client
│   │   └── client.ts
│   ├── client.ts                  # Axios HTTP client
│   ├── socket.ts                  # Socket.IO utilities
│   └── webrtc.ts                  # WebRTC utilities
├── stores/                        # Zustand state stores
│   ├── auth-store.ts              # Authentication state
│   └── user-store.ts               # User data state
├── types/                         # TypeScript type definitions
│   ├── api.types.ts               # API type definitions
│   └── globals.d.ts               # Global type declarations
├── utils/                         # Utility functions
│   ├── logger.ts                  # Logging utilities
│   └── roles.ts                   # Role management
├── shared/                        # Shared configuration
│   └── config.ts                  # Application configuration
├── proxy.ts                       # Clerk authentication proxy (Next.js 16)
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies and scripts
```

## How It Works

### Authentication Flow

1. User visits landing page (`/`)
2. Clicks "Start Chatting Now" button
3. If not authenticated → redirected to Clerk sign-in
4. If authenticated → navigated to `/chat`

### Video Chat Flow

1. **Initialization**: User clicks "Start" button on chat page
2. **Media Access**: Browser requests camera and microphone permissions
3. **ICE Servers**: Frontend fetches ICE server configuration from backend API
4. **Socket Connection**: Connects to Socket.IO signaling server with authentication token
5. **Matchmaking**: Joins matchmaking queue via `join` event
6. **Matching**: When matched, receives `matched` event with peer information
7. **WebRTC Setup**:
   - Creates `RTCPeerConnection` with ICE servers
   - Adds local media tracks (video and audio)
   - Creates and sends SDP offer (if offerer)
   - Handles SDP answer and ICE candidates
8. **Connection**: When connection established, remote video stream appears
9. **Controls**: User can mute/unmute, toggle video, send text messages, skip to next peer, or end call

### Signaling Events

**Client → Server:**
- `join` - Join matchmaking queue
- `skip` - Skip current peer and re-queue
- `signal` - Send WebRTC signaling data (offer/answer/ICE candidate)
- `chat-message` - Send text message to peer
- `mute-toggle` - Notify peer of mute state change
- `end-call` - End the current call
- `disconnect` - Disconnect from server

**Server → Client:**
- `joined-queue` - Successfully added to queue
- `matched` - Matched with a peer
- `signal` - Receive signaling data from peer
- `chat-message` - Receive text message from peer
- `peer-left` - Peer disconnected or skipped
- `peer-skipped` - Peer skipped the connection
- `skipped` - Your skip request was processed
- `end-call` - Peer ended the call
- `mute-toggle` - Peer mute state changed
- `error` - Error occurred
- `queue-timeout` - Queue timeout (5 minutes)

### Presence System

The application uses MQTT for real-time presence updates:
- Users publish their presence state (online, offline, available, matching, in_call, idle)
- Admin dashboard receives real-time presence updates via Socket.IO
- Presence is automatically updated based on user actions

### Admin Dashboard

The admin dashboard (`/admin`) provides:
- User list with pagination and search
- User role management (admin/member)
- User allow/deny status management
- Real-time presence monitoring
- User profile information display

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `NEXT_PUBLIC_API_URL` | Backend API URL | No (default: `http://localhost:3001`) |
| `NEXT_PUBLIC_MQTT_CLIENT_URL` | MQTT broker URL | No |
| `NEXT_PUBLIC_MQTT_CLIENT_PORT` | MQTT broker port | No |
| `NEXT_PUBLIC_MQTT_CLIENT_USERNAME` | MQTT username | No |
| `NEXT_PUBLIC_MQTT_CLIENT_PASSWORD` | MQTT password | No |

## Development

### Running the App

```bash
# Development mode
pnpm dev

# Production build
pnpm build
pnpm start
```

### Linting

```bash
pnpm lint
```

## Integration Details

### Authentication (Clerk)

- Uses Clerk's `<SignIn />` and `<SignUp />` components for authentication UI
- Protected routes use Clerk middleware to redirect unauthenticated users
- User profile accessible via `<UserButton />` component
- Custom JWT template for backend authentication
- Token refresh handled automatically every 5 minutes

### Signaling (Socket.IO)

- Connects to backend Socket.IO server for WebRTC signaling
- Handles all WebRTC signaling events (offers, answers, ICE candidates)
- Manages matchmaking queue and peer matching
- Supports text chat and presence updates
- Automatic reconnection on connection loss

### WebRTC

- Uses native WebRTC APIs for peer-to-peer communication
- Fetches ICE servers from backend API endpoint
- Handles media streams (video/audio tracks)
- Properly manages connection lifecycle
- Supports connection state monitoring and error handling

### MQTT (Presence)

- Connects to MQTT broker for presence updates
- Publishes user presence state changes
- Automatically disconnects on user sign-out
- Used for real-time user status tracking

### State Management

- Zustand stores for authentication and user data
- React hooks for video chat state management
- Local component state for UI interactions

## Cleanup

The application properly cleans up resources:
- Stops all media tracks on unmount or disconnect
- Closes RTCPeerConnection
- Disconnects Socket.IO client
- Disconnects MQTT client
- Handles page unload events
- Clears timers and intervals

## Troubleshooting

### Camera/Microphone Not Working

- Ensure browser permissions are granted
- Check if HTTPS is required (some browsers require HTTPS for media access)
- Verify camera/microphone are not in use by another application
- Check browser console for permission errors

### Connection Issues

- Verify backend API is running and accessible
- Check `NEXT_PUBLIC_API_URL` environment variable
- Check browser console for WebRTC errors
- Ensure ICE servers are properly configured on backend
- Verify Socket.IO connection is established

### Authentication Issues

- Verify Clerk keys are correct in `.env.local`
- Check Clerk dashboard for application configuration
- Ensure email verification is properly configured
- Verify custom JWT template is set up in Clerk

### MQTT Connection Issues

- Verify MQTT broker is running and accessible
- Check MQTT configuration in environment variables
- Ensure MQTT credentials are correct
- Check browser console for MQTT connection errors

### Admin Dashboard Issues

- Verify user has admin role in the system
- Check backend API is accessible
- Ensure Socket.IO connection is established for presence updates
- Verify authentication token is valid

## License

Private - Internal use only
