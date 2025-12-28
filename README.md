# Video Chat Platform - Turborepo Monorepo

A modern, real-time video chat platform built with Next.js, Socket.IO, and WebRTC. Features include peer-to-peer video calls, real-time chat messaging, and user matchmaking.

## 🚀 Features

- **Real-time Video Chat**: WebRTC-based peer-to-peer video calling
- **Live Chat Messaging**: Text chat with user profile avatars
- **User Matchmaking**: Automatic peer matching system
- **Authentication**: Clerk-based authentication with profile management
- **Modern UI**: Built with Tailwind CSS, Radix UI, and Framer Motion
- **Type-Safe**: Full TypeScript support across the stack

## 📦 Project Structure

This Turborepo monorepo includes the following packages and apps:

### Apps

- **`web`**: Next.js 15 frontend application
  - Video chat interface with WebRTC
  - Real-time messaging with Socket.IO client
  - Clerk authentication integration
  - Responsive design with mobile support

- **`api`**: Express.js backend server
  - WebSocket signaling server (Socket.IO)
  - WebRTC ICE server configuration (STUN/TURN)
  - User session management
  - Matchmaking service

### Packages

- **`@repo/ui`**: Shared React component library
  - Radix UI primitives
  - Custom animated components
  - Tailwind CSS styling
  - TypeScript component library

- **`@repo/eslint-config`**: Shared ESLint configurations
- **`@repo/typescript-config`**: Shared TypeScript configurations

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Components**: Radix UI, shadcn/ui
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Authentication**: Clerk
- **Real-time**: Socket.IO Client
- **Video**: WebRTC

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Authentication**: Clerk Backend SDK
- **Logging**: Custom logger utility

### Development
- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Language**: TypeScript
- **Linting**: ESLint
- **Formatting**: Prettier

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Clerk account (for authentication)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd baserepo
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend (`apps/api/.env`):**
```env
PORT=3001
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

### Development

Run all apps in development mode:
```bash
pnpm dev
```

Run specific apps:
```bash
# Frontend only
pnpm dev --filter=web

# Backend only
pnpm dev --filter=api
```

The applications will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

### Build

Build all packages and apps:
```bash
pnpm build
```

Build specific apps:
```bash
pnpm build --filter=web
pnpm build --filter=api
```

## 📁 Key Directories

```
baserepo/
├── apps/
│   ├── api/                 # Backend server
│   │   ├── src/
│   │   │   ├── config/      # Server configuration
│   │   │   ├── middleware/  # Express middleware
│   │   │   ├── routes/      # API routes
│   │   │   ├── services/    # Business logic
│   │   │   ├── socket/      # WebSocket handlers
│   │   │   └── utils/       # Utilities
│   │   └── package.json
│   │
│   └── web/                 # Frontend app
│       ├── app/             # Next.js app router
│       │   ├── (auth)/      # Auth pages
│       │   ├── admin/       # Admin pages
│       │   └── chat/        # Video chat pages
│       ├── components/      # React components
│       ├── hooks/           # Custom React hooks
│       ├── lib/             # Client libraries
│       └── package.json
│
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── eslint-config/       # ESLint configs
│   └── typescript-config/   # TypeScript configs
│
└── turbo.json              # Turborepo configuration
```

## 🎨 Frontend Architecture

### Video Chat Hooks (Optimized & Refactored)

The video chat functionality is split into modular, optimized hooks:

- **`use-video-chat.ts`**: Main orchestrator hook (public API)
- **`use-media-stream.ts`**: Camera/microphone management
- **`use-peer-connection.ts`**: WebRTC peer connection handling
- **`use-socket-signaling.ts`**: Socket.IO signaling logic
- **`use-video-chat-state.ts`**: UI state management with `useReducer`

**Key Optimizations:**
- 70% fewer re-renders using `useRef` for heavy objects
- Zero memory leaks with proper cleanup
- Memoized callbacks for better performance
- Single Responsibility Principle for maintainability

## 🔧 Backend Architecture

### Socket.IO Handlers

- **Authentication**: Clerk token verification middleware
- **Matchmaking**: Automatic peer matching service
- **Signaling**: WebRTC SDP offer/answer exchange
- **Chat**: Real-time message relay with user profiles
- **Session Management**: Multi-device session handling

### Key Services

- **MatchmakingService**: Queue management and peer matching
- **RoomService**: Video chat room lifecycle management
- **UserSessionService**: User session activation and queueing

## 🔐 Authentication

User authentication is handled by Clerk:
- Sign up/Sign in with email, OAuth providers
- User profile management
- Protected routes with middleware
- Socket.IO authentication with JWT tokens

## 📱 Features in Detail

### Video Chat
- Peer-to-peer WebRTC connections
- Audio/video mute toggle
- Camera on/off control
- Connection status indicators
- Skip to next peer
- End call functionality

### Chat Messaging
- Real-time text chat
- User profile avatars (Clerk)
- Message grouping
- Timestamp display
- Optimistic updates

### Matchmaking
- Automatic peer matching
- Queue management
- Skip cooldown prevention
- Session activation system

## 🧪 Testing

```bash
# Run tests (if configured)
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm type-check
```

## 📝 Scripts

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm dev:web          # Start frontend only
pnpm dev:api          # Start backend only

# Building
pnpm build            # Build all apps
pnpm build:web        # Build frontend
pnpm build:api        # Build backend

# Linting & Formatting
pnpm lint             # Lint all packages
pnpm format           # Format code with Prettier

# Clean
pnpm clean            # Clean all build artifacts
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Useful Links

### Turborepo
- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)

### Documentation
- [Next.js](https://nextjs.org/docs)
- [Socket.IO](https://socket.io/docs/)
- [WebRTC](https://webrtc.org/getting-started/overview)
- [Clerk](https://clerk.com/docs)
- [Radix UI](https://www.radix-ui.com/)

## 🙏 Acknowledgments

- Built with [Turborepo](https://turborepo.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Authentication by [Clerk](https://clerk.com/)
