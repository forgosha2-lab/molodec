# PPYLSE Game Hub

## Overview

PPYLSE is a multi-game web platform featuring classic card games (Durak, UNO) and mini casino-style games (Crash, Coinflip, Rolls). The application is built as a full-stack web application with a React/TypeScript frontend and Node.js/Express backend, optimized for Replit deployment with Telegram Mini App integration.

## Recent Changes

### November 18, 2025 - Rolls WebSocket Native Implementation

**Rolls WebSocket Migration - COMPLETED**: Migrated Rolls game back to native WebSocket (ws library) for reliability:
- ✅ Rewrote Rolls WebSocket from Socket.IO to native WebSocket using working example from `вебсокет_пример`
- ✅ Implemented message queue mechanism in `useRollsWebSocket.ts` to solve race condition where messages sent before socket fully opened
- ✅ Added environment-aware URL configuration: direct port 3003 connection in Replit dev, proxy-based in production
- ✅ Verified WebSocket connects successfully and sends/receives messages (JOIN, PLACE_BET, CHAT_MESSAGE, STATE_SYNC)
- ✅ Fixed client-side message sending - queued messages automatically sent when socket opens
- ✅ Server properly receives and parses all message types with full logging
- ✅ Solution works in Replit development environment and prepared for HTTPS production deployment
- ✅ Cleaned up debug console.log statements after successful testing

### November 17, 2025 - Major Feature Additions and Enhancements

**Rolls Game Logic Rewrite - COMPLETED**: Implemented new betting flow and countdown system:
- ✅ Rewrote Rolls server logic: First player bets → waiting continues → second player bets → 25-second countdown begins
- ✅ Added countdown state to client WebSocket hook with optional timer display
- ✅ Fixed balance display showing 1000 instead of real database balance
- ✅ Implemented 5% house fee tracking for admin panel (recorded after each bet)
- ✅ Added balance refund system when countdown expires without enough players

**Mobile Responsiveness - COMPLETED**: Improved mobile UI across the platform:
- ✅ Optimized hero banner scaling for mobile devices (responsive height and text sizing)
- ✅ Adjusted game card spacing on mobile to match desktop layout
- ✅ Enhanced touch interaction areas for better mobile UX

**Deposit & Withdrawal System - COMPLETED**: Created payment pages with Crypto Bot integration:
- ✅ Built Deposit page (/deposit) with Crypto Bot payment option
- ✅ Built Withdrawal page (/withdrawal) with Crypto Bot integration
- ✅ Connected Header "Пополнить/Вывести" button to navigate to deposit page
- ✅ Added routing for both pages in App.tsx

**Leaderboard Enhancement - COMPLETED**: Switched from mock data to real user data:
- ✅ Created /api/leaderboard/top endpoint to fetch top players by diamonds_balance
- ✅ Displays real user avatars, usernames, and balances from database
- ✅ Integrated into main page with automatic data loading

**Admin Panel - COMPLETED**: Built comprehensive admin dashboard with earnings tracking:
- ✅ Created AdminPanel page (/admin) with secure ADMIN_KEY authentication
- ✅ Displays total earnings across all games
- ✅ Shows breakdown by game type (Rolls, Coinflip)
- ✅ Added user search and management features
- ✅ Created /api/admin/earnings and /api/admin/users endpoints
- ✅ Added game_earnings table to database schema
- ✅ Implemented 5% commission tracking for both Rolls and Coinflip games
- ✅ Security: Removed hardcoded admin key, requires proper ADMIN_KEY environment variable

**Database Fixes - COMPLETED**: Resolved profile and lobby access issues:
- ✅ Ran `drizzle-kit push` to initialize all database tables
- ✅ Fixed "relation does not exist" errors for profiles and other tables
- ✅ Verified all API endpoints working correctly (/api/profile, /api/auth/signup, etc.)
- ✅ Profile and Durak lobbies now accessible without errors

**Coinflip Earnings Tracking - COMPLETED**: Added commission tracking for admin panel:
- ✅ Created /api/game-earnings endpoint to record game commissions
- ✅ Coinflip now records 5% of each bet to game_earnings table
- ✅ Earnings recorded only after game completion (not on bet placement)
- ✅ Admin panel displays accurate Coinflip revenue

**Security Enhancements - COMPLETED**:
- ✅ Removed hardcoded admin bypass key from authentication
- ✅ Admin endpoints now require valid ADMIN_KEY environment variable
- ✅ Server returns 500 error if ADMIN_KEY not configured or equals placeholder
- ✅ Prevents unauthorized access to earnings and user data

### November 17, 2025 - Russian Localization and UI Polish

**Complete Russian Localization - COMPLETED**: All user-facing text translated to Russian:
- ✅ Fixed Rolls game: All English text replaced with Russian (Игрок, ПОБЕДИЛ, Шанс выигрыша, Сумма ставки, ДОБАВИТЬ/СДЕЛАТЬ СТАВКУ, ВАША СТАВКА, Чат, Введите сообщение, 95% от банка, Комиссия дома 5%)
- ✅ Updated default player names from "Player" to "Игрок" in WebSocket hook
- ✅ Verified deposit/withdrawal pages show "1 алмаз = 1₽" on both tabs
- ✅ Fixed TypeScript type alignment: Added avatar_url to Bet interface, changed text to message in ChatMessage
- ✅ Removed all type assertion casts (as any) after proper interface alignment
- ✅ Fixed countdown timer to show "Ожидание игроков" when waiting, starts only after 2 players bet
- ✅ Enabled betting during countdown status (not just waiting)
- ✅ Pushed database schema to fix "relation does not exist" errors

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
- Native WebSocket (ws library) for Rolls (/ws-rolls) and Crash (/ws) games with message queue for reliable delivery
- Socket.IO for UNO (/ws-uno) game with Bun-compatible implementation
- Custom game logic modules (uno-game-logic.js, durak-server.js, rolls-websocket.ts, crash-websocket.js)
- Client hooks: useRollsWebSocket (native WebSocket with queue), useUnoWebSocket (socket.io-client), useWebSocket (native WebSocket for Crash)
- Environment-aware WebSocket URL: direct port 3003 in Replit dev, proxy-based in production for HTTPS support

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
- Native WebSocket (ws library) for Rolls and Crash games with message queueing for race condition prevention
- Socket.IO v4 for UNO game (better Bun runtime compatibility)
- Custom WebSocket servers embedded in Express app via http.createServer
- Environment-aware URL resolution (Replit dev vs production HTTPS)
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