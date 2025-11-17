# PPYLSE Game Hub

## Overview

PPYLSE is a multi-game web platform featuring classic card games (Durak, UNO) and mini casino-style games (Crash, Coinflip, Rolls). The application is built as a full-stack web application with a React/TypeScript frontend and Node.js/Express backend, optimized for Replit deployment with Telegram Mini App integration.

## Recent Changes

### November 17, 2025 - Bug Fixes and UI Updates

**Bug Fixes and UI Improvements - COMPLETED**: Fixed critical issues in Rolls game and updated Coinflip styling:
- ✅ Fixed Rolls game live chat - corrected property reference from `msg.text` to `msg.message`
- ✅ Changed Coinflip background from green gradient to gray gradient (from-gray-800 via-gray-700 to-gray-900)
- ✅ Updated Coinflip header colors to match gray theme (border-gray-500/30 bg-gray-900/80)
- ✅ Pushed database schema using drizzle-kit to fix API 500 errors on /api/profile and /api/auth/signup
- ✅ Verified balance synchronization works correctly via balanceSync.ts across all games
- ✅ All API endpoints tested and working properly
- ✅ Rolls game betting functionality verified working

### November 17, 2025 - WebSocket Migration to Socket.IO

**Migration to Socket.IO for Rolls and UNO - COMPLETED**: Successfully migrated Rolls and UNO games from ws library to socket.io for better Bun runtime compatibility:
- ✅ Migrated server/rolls-websocket.ts to socket.io with path /ws-rolls
- ✅ Migrated server/websocket-uno.js to socket.io with path /ws-uno
- ✅ Created src/hooks/useRollsWebSocket.ts client hook using socket.io-client
- ✅ Updated src/hooks/useUnoWebSocket.ts client hook to socket.io-client
- ✅ Fixed all client-server contract mismatches (event names, payload structures)
- ✅ Implemented functional state updates for balance handlers to fix closure issues
- ✅ Aligned chat message payloads ({ message } instead of { text })
- ✅ Removed ws dependency from package.json
- ✅ Crash game intentionally kept on ws library as per user preference
- ✅ Updated Durak page background to gray gradient
- ✅ All games tested and verified working without blocking defects

### November 15, 2025 - PostgreSQL Database Migration

**Migration to Neon PostgreSQL - COMPLETED**: Successfully migrated project from Supabase to Neon PostgreSQL with Drizzle ORM:
- ✅ Migrated from Supabase to Neon PostgreSQL serverless database
- ✅ Implemented Drizzle ORM for type-safe database operations
- ✅ Created comprehensive schema in shared/schema.ts with TEXT-based IDs
- ✅ Added UUID generation (uuid v4) for all database inserts using the uuid package
- ✅ Fixed port configuration: Express server on 3003, Vite frontend on 5000
- ✅ Updated all API routes to use Drizzle queries with proper UUID handling
- ✅ Removed all Supabase artifacts (supabase/ directory, migrations, dependencies)
- ✅ Generated Drizzle migration snapshot for schema drift detection
- ✅ Verified application running successfully with WebSocket and HTTP endpoints
- ✅ Database includes 10 tables: profiles, game_lobbies, lobby_players, achievements, user_achievements, game_sessions, chat_messages, game_emojis, friendships, user_auth

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript and Vite build system

**UI Components**: 
- Radix UI primitives for accessible component foundation
- Shadcn/ui component library with Tailwind CSS for styling
- Custom game-specific components organized by game type (durak/, uno/)

**State Management**:
- TanStack Query (React Query) for server state and caching
- Local React state with hooks for UI interactions
- WebSocket connections managed through custom hooks (useRollsWebSocket for Rolls, useUnoWebSocket for UNO, useWebSocket for Crash)

**Routing**: React Router v6 with client-side routing for SPA navigation

**Styling Approach**: Utility-first with Tailwind CSS, custom CSS variables for theming, dark mode support via class-based system

### Backend Architecture

**Runtime**: Node.js with Express.js web framework

**API Design**: RESTful endpoints for game state management, user authentication, and profile data

**Real-time Communication**: 
- Socket.IO for Rolls (/ws-rolls) and UNO (/ws-uno) games with Bun-compatible implementation
- Native WebSocket (ws library) for Crash game (/ws) - intentionally kept separate
- Custom game logic modules (uno-game-logic.js, durak-server.js, crash-websocket.js)
- Client hooks: useRollsWebSocket, useUnoWebSocket (socket.io-client), useWebSocket (native WebSocket)

**Data Layer**:
- Drizzle ORM with PostgreSQL (Neon) for type-safe database operations
- UUID v4 generation for all primary keys using the uuid package
- Connection pooling via pg.Pool for efficient database access
- Hybrid approach: Drizzle for ORM queries, pg Pool for raw SQL when needed
- In-memory storage classes for WebSocket game state (UnoStorage for UNO, crash game state)
- Fail-fast behavior: process exits on database initialization failures

**Authentication**: 
- Telegram Web App SDK integration for user identity
- bcryptjs for password hashing
- Session management via localStorage on client side

### Data Storage

**Primary Database**: PostgreSQL with Neon Database (serverless)
- Managed PostgreSQL database via Replit integration
- Drizzle ORM for type-safe database operations
- WebSocket connection to Neon using @neondatabase/serverless
- Environment variables managed automatically (DATABASE_URL, PGHOST, etc.)

**Schema** (all tables use TEXT for IDs to support formats like 'tg_123456789'):
- `user_auth` - User credentials and password hashes
- `profiles` - User profiles with game statistics and diamond balance
- `friendships` - User friend relationships and statuses
- `game_lobbies` - Multiplayer game lobby management
- `lobby_players` - Players in each lobby
- `game_sessions` - Active game state tracking with JSONB game_state
- `chat_messages` - In-game chat messages
- `achievements` - Achievement definitions (6 default achievements)
- `user_achievements` - User achievement unlocks
- `game_emojis` - In-game emoji reactions

**ORM Design**:
- Drizzle ORM provides type-safe query builder
- Schema defined in shared/schema.ts with full TypeScript support
- Relations defined for easy joins and nested queries
- TEXT-based IDs throughout for compatibility with Telegram IDs
- JSONB columns for flexible game state storage
- Timestamp fields with timezone support

### Authentication & Authorization

**Telegram Integration**:
- Primary authentication via Telegram Web App SDK (@twa-dev/sdk)
- Automatic user registration from Telegram user data
- User ID format: `tg_{telegram_user_id}` or `guest_{timestamp}` for development

**Session Management**:
- Sessions stored in localStorage
- User data cached client-side in JSON format
- Server validates user via x-user-id header in API requests

**Security**:
- Password hashing with bcryptjs (10 salt rounds)
- CORS enabled for cross-origin requests
- Trust proxy configuration for reverse proxy deployments

### External Dependencies

**Real-time Gaming**:
- Socket.IO v4 for Rolls and UNO games (better Bun runtime compatibility)
- Native WebSocket (ws library) for Crash game only
- Custom WebSocket servers embedded in Express app via http.createServer
- Hybrid approach allows per-game protocol optimization

**Telegram Platform**:
- @twa-dev/sdk for Telegram Mini App integration
- Auto-registration and user profile sync from Telegram

**Build & Deployment**:
- Optimized for Replit deployment
- Package manager: Bun for fast dependency installation
- Concurrent development servers (frontend on :5000, backend on :3003)
- Frontend binds to 0.0.0.0:5000 for Replit webview compatibility
- Production build outputs to /dist directory
- Legacy configs available for Vercel/Railway deployment

**UI Libraries**:
- Radix UI for accessible component primitives
- Framer Motion for animations in game components
- Lucide React for iconography

**Key Capabilities**:
- WebSocket support fully functional on Replit
- PostgreSQL database with automatic backups via Neon
- Type-safe database queries with Drizzle ORM
- All dependencies are pure JavaScript (no native compilation required)
- Ready for production deployment on Replit

**Database Scripts**:
- `bun run db:push` - Sync schema to database (use --force if needed)
- `bun run db:generate` - Generate migration files
- `bun run db:studio` - Open Drizzle Studio for database management