# Random Video Chat - Frontend

A Next.js frontend application for random 1-to-1 video chat using WebRTC and Socket.IO.

## Features

- 🔐 **Clerk Authentication** - Secure user authentication with email verification
- 🎥 **WebRTC Video Chat** - Peer-to-peer video and audio communication
- 🔄 **Real-time Signaling** - Socket.IO-based signaling for WebRTC connection setup
- 🎨 **Modern UI** - Built with shadcn/ui components
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Next.js 16+** (App Router)
- **TypeScript**
- **Clerk** - Authentication
- **Socket.IO Client** - Signaling
- **WebRTC** - Peer-to-peer video/audio
- **shadcn/ui** - UI components from `@repo/ui`

## Setup

### Prerequisites

- Node.js 18+ and pnpm
- Clerk account (for authentication)
- Backend API running (see `apps/api/README.md`)

### Installation

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
├── app/
│   ├── chat/              # Chat page (protected route)
│   ├── sign-in/           # Clerk sign-in page
│   ├── sign-up/           # Clerk sign-up page
│   ├── layout.tsx         # Root layout with Clerk provider
│   └── page.tsx           # Landing page
├── hooks/
│   └── use-video-chat.ts  # WebRTC and signaling hook
├── lib/
│   ├── socket.ts          # Socket.IO client utilities
│   └── webrtc.ts          # WebRTC utilities
└── proxy.ts               # Clerk authentication proxy (Next.js 16)
```

## How It Works

### Authentication Flow

1. User visits landing page (`/`)
2. Clicks "Start Chat" button
3. If not authenticated → redirected to Clerk sign-in
4. If authenticated → navigated to `/chat`

### Video Chat Flow

1. **Initialization**: User clicks "Start" button
2. **Media Access**: Browser requests camera and microphone permissions
3. **ICE Servers**: Frontend fetches ICE server configuration from backend
4. **Socket Connection**: Connects to Socket.IO signaling server
5. **Matchmaking**: Joins matchmaking queue via `join` event
6. **Matching**: When matched, receives `matched` event with peer info
7. **WebRTC Setup**:
   - Creates `RTCPeerConnection` with ICE servers
   - Adds local media tracks
   - Creates and sends SDP offer
   - Handles SDP answer and ICE candidates
8. **Connection**: When connection established, remote video stream appears
9. **Controls**: User can mute/unmute, toggle video, or skip to next peer

### Signaling Events

**Client → Server:**
- `join` - Join matchmaking queue
- `skip` - Skip current peer and re-queue
- `signal` - Send WebRTC signaling data (offer/answer/ICE candidate)
- `disconnect` - Disconnect from server

**Server → Client:**
- `joined-queue` - Successfully added to queue
- `matched` - Matched with a peer
- `signal` - Receive signaling data from peer
- `peer-left` - Peer disconnected or skipped
- `error` - Error occurred
- `queue-timeout` - Queue timeout (5 minutes)

### Cleanup

The application properly cleans up resources:
- Stops all media tracks on unmount or disconnect
- Closes RTCPeerConnection
- Disconnects Socket.IO client
- Handles page unload events

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `NEXT_PUBLIC_API_URL` | Backend API URL | No (default: `http://localhost:3001`) |

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
- Protected routes use Clerk proxy to redirect unauthenticated users
- User profile accessible via `<UserButton />` component

### Signaling (Socket.IO)

- Connects to backend Socket.IO server for WebRTC signaling
- Handles all WebRTC signaling events (offers, answers, ICE candidates)
- Manages matchmaking queue and peer matching

### WebRTC

- Uses native WebRTC APIs for peer-to-peer communication
- Fetches ICE servers from backend API
- Handles media streams (video/audio tracks)
- Properly manages connection lifecycle

## Troubleshooting

### Camera/Microphone Not Working

- Ensure browser permissions are granted
- Check if HTTPS is required (some browsers require HTTPS for media access)
- Verify camera/microphone are not in use by another application

### Connection Issues

- Verify backend API is running and accessible
- Check `NEXT_PUBLIC_API_URL` environment variable
- Check browser console for WebRTC errors
- Ensure ICE servers are properly configured on backend

### Authentication Issues

- Verify Clerk keys are correct in `.env.local`
- Check Clerk dashboard for application configuration
- Ensure email verification is properly configured

## License

Private - Internal use only
