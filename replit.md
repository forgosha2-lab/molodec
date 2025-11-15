# PPYLSE Game Hub

## Overview

PPYLSE is a multi-game web platform featuring classic card games (Durak, UNO) and mini casino-style games (Crash, Coinflip, Rolls). The application is built as a full-stack web application with a React/TypeScript frontend and Node.js/Express backend, optimized for Replit deployment with Telegram Mini App integration.

## Recent Changes (November 15, 2025)

**Migration to PostgreSQL (Neon Database)**: Successfully migrated from SQLite to PostgreSQL with Drizzle ORM:
- Migrated from sql.js (SQLite) to Neon PostgreSQL serverless database
- Implemented Drizzle ORM for type-safe database operations
- Created comprehensive schema in shared/schema.ts mirroring original SQLite structure
- Converted all UUID fields to TEXT to maintain compatibility with existing app logic (e.g., 'tg_123456789')
- Replaced server.js with TypeScript server (server/index.ts) using Drizzle ORM
- Updated all API routes to use Drizzle queries instead of SQLite statements
- Database schema created directly with SQL (profiles, game_lobbies, achievements, etc.)
- Removed old SQLite dependencies (sql.js, db-adapter.js)
- Server successfully running with PostgreSQL backend on port 3003

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
- WebSocket connections managed through custom hooks (useWebSocket, useUnoWebSocket)

**Routing**: React Router v6 with client-side routing for SPA navigation

**Styling Approach**: Utility-first with Tailwind CSS, custom CSS variables for theming, dark mode support via class-based system

### Backend Architecture

**Runtime**: Node.js with Express.js web framework

**API Design**: RESTful endpoints for game state management, user authentication, and profile data

**Real-time Communication**: 
- WebSocket servers for multi-player game synchronization
- Separate WebSocket paths for different games (/ws-uno, /ws for crash/coinflip/rolls)
- Custom game logic modules (uno-game-logic.js, durak-server.js, crash-websocket.js)

**Data Layer**:
- Custom database abstraction layer (server/db-adapter.js) providing better-sqlite3 compatible API
- Uses sql.js (pure JavaScript SQLite) for cross-platform compatibility
- Per-instance debounce timers (100ms) for write batching without data loss
- Immediate persistence for schema changes (exec), debounced for data operations (run)
- In-memory storage classes for WebSocket game state (UnoStorage)
- Fail-fast behavior: process exits on database initialization or persistence failures

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
- WebSocket protocol for bidirectional game state synchronization
- Custom WebSocket servers embedded in Express app via http.createServer

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