# PPYLSE Game Hub

## Overview

PPYLSE is a multi-game web platform featuring classic card games (Durak, UNO) and mini casino-style games (Crash, Coinflip, Rolls). The application is built as a full-stack web application with a React/TypeScript frontend and Node.js/Express backend, optimized for Replit deployment with Telegram Mini App integration.

## Recent Changes (November 15, 2025)

**Migration to Replit**: Successfully migrated from Vercel to Replit environment with the following changes:
- Replaced better-sqlite3 with sql.js (pure JavaScript SQLite) to avoid native compilation issues
- Created custom database adapter (server/db-adapter.js) with better-sqlite3 API compatibility
- Configured ports for Replit (frontend: 5000, backend: 3003)
- Fixed Vite file watching to exclude .cache directory
- Implemented per-instance debounced save strategy for optimal performance
- Added proper error handling with fail-fast behavior on database initialization failures

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

**Primary Database**: SQLite with sql.js (pure JavaScript implementation)
- Cross-platform compatibility without native compilation
- Database file stored at configurable path (DB_PATH environment variable)
- Default location: /tmp/pyplse_game_hub.db on Replit
- Per-dbPath instance caching prevents concurrent access conflicts
- Automatic database saves on process shutdown (SIGINT/SIGTERM handlers)

**Schema**:
- `user_auth` - User credentials and password hashes
- `profiles` - User profiles with game statistics and diamond balance
- `crash_history` - Historical crash game results
- `player_balances` - Player currency balances
- `game_lobbies` - Multiplayer game lobby management
- `game_sessions` - Active game state tracking
- `achievements` - Achievement definitions and user unlocks
- Game-specific tables created dynamically

**Database Adapter Design**:
- Multiple database paths supported (main server + crash websocket can use separate or shared DBs)
- Each instance maintains its own debounce timer to prevent cross-instance interference
- Schema operations (CREATE TABLE) save immediately to disk
- Data operations (INSERT/UPDATE) batch with 100ms debounce for performance
- All operations throw errors on failure (no silent failures)
- Process terminates if database cannot be initialized or persisted

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
- SQLite database persists across restarts on Replit
- All dependencies are pure JavaScript (no native compilation required)
- Ready for production deployment on Replit or similar platforms

**Known Considerations**:
- Database file at /tmp may not persist on some serverless platforms (Vercel)
- For production at scale, consider migrating to PostgreSQL or MongoDB
- Current implementation optimized for single-process environments