# PocketOption Trading Bot Dashboard

## Overview

A full-stack trading bot application for binary options trading on PocketOption. The system features a React-based dashboard for monitoring bot performance and trade execution, backed by an Express server that manages bot control, WebSocket real-time updates, and PostgreSQL database integration. The bot implements a Parabolic SAR (Stop and Reverse) strategy across multiple timeframes (1m, 5m, 15m) with confluence-based trade signals for ETHUSD_otc binary options.

**✅ TELEGRAM MINI-APP FULLY FUNCTIONAL**: Integration allows remote bot management via Telegram chat (ID: 7373419661) with live status updates, trade history, and control commands. WebSocket connection fixed for Telegram Web App context.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, built using Vite for fast development and optimized production builds.

**UI Component System**: Shadcn/ui component library with Radix UI primitives, providing accessible, customizable components styled with Tailwind CSS. The design follows financial dashboard patterns emphasizing data clarity and professional aesthetics.

**State Management**: 
- TanStack Query (React Query) for server state management with automatic caching and refetching
- Local component state for UI interactions
- Real-time updates via WebSocket connection for bot status and trade events

**Routing**: Wouter for lightweight client-side routing

**Design System**:
- Typography: Inter for UI text, JetBrains Mono for numerical data
- Color scheme: Dark mode optimized with HSL-based theming
- Responsive grid layout supporting wide trading monitors (max-width: 1920px)
- Glass-morphism effects with backdrop blur for modern card designs

**Real-time Communication**: Custom WebSocket hook (`useWebSocket`) managing persistent connection with automatic reconnection, handling bot state updates, trade started events, and trade completion notifications.

**Key Pages**:
- Dashboard: Main trading interface displaying bot status, current positions, SAR indicators, trade history, and monitored assets
- Not Found: 404 error page

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful endpoints for bot control and status queries:
- POST `/api/bot/start` - Start trading bot
- POST `/api/bot/stop` - Stop trading bot  
- GET `/api/bot/status` - Get current bot status and stats
- Trade-related endpoints for creating/updating/retrieving trades

**WebSocket Server**: Implements real-time bidirectional communication using `ws` library:
- Path: `/ws`
- Broadcasts bot state updates, trade started events, and trade completion events
- Maintains active connections and handles cleanup on disconnect

**Bot Controller**: Event-driven architecture using Node.js EventEmitter pattern:
- Manages bot lifecycle (start/stop)
- Tracks current trade state and monitored assets
- Simulates SAR indicator calculations across multiple timeframes
- Emits events for state changes that WebSocket server broadcasts to clients

**Storage Layer**: Dual-mode storage system:
- Primary: PostgreSQL via Drizzle ORM for production
- Fallback: In-memory storage when database unavailable
- Abstracts storage operations through `IStorage` interface for consistency

**Session Management**: Express sessions with PostgreSQL session store (`connect-pg-simple`) for production persistence.

**Development Tools**:
- Vite middleware integration for HMR during development
- Replit-specific plugins for runtime error overlay and development banner
- TypeScript with strict mode enabled

### Database Design

**ORM**: Drizzle ORM with Neon serverless PostgreSQL adapter using WebSocket connections.

**Schema**:

**Users Table**:
- id: UUID primary key (auto-generated)
- username: unique text
- password: hashed text

**Trades Table**:
- id: UUID primary key (auto-generated)
- occurredAt: timestamp with timezone
- direction: enum ('call', 'put')
- amount: decimal(10,2)
- asset: text (e.g., 'ETHUSD_otc')
- durationSeconds: integer
- entryPrice: decimal(10,2)
- exitPrice: decimal(10,2)
- result: enum ('win', 'loss', 'pending')
- sarSignal: text

**Migrations**: Managed via drizzle-kit with migration files in `/migrations` directory.

### Trading Bot Strategy

**Strategy Name**: SAR Multi-Timeframe Confluence

**Core Logic**:
- Monitors Parabolic SAR indicator on 1-minute, 5-minute, and 15-minute timeframes
- Trades only when all three timeframes align (confluence)
- All SAR signals LONG → open CALL option
- All SAR signals SHORT → open PUT option
- $1 stake per trade, 60-180 second duration
- 60-180 second cooldown between trades

**Assets Monitored**: Multiple OTC assets including BNB, Solana, Chainlink, Toncoin, Polygon, Dogecoin, Bitcoin, with primary focus on ETHUSD_otc.

**Trade Execution Flow**:
1. Fetch OHLCV data from PocketOption API
2. Calculate SAR indicators for each timeframe
3. Check for confluence (all timeframes aligned)
4. Place trade via PocketOption executor
5. Store trade in database
6. Monitor trade duration
7. Update trade result on completion

**PocketOption Integration**: Async-capable executor using `pocketoptionapi_async` library:
- Background asyncio event loop in separate thread
- Synchronous interface for bot integration
- WebSocket-based real-time connection
- SSID-based authentication from environment variable

## External Dependencies

### Third-Party Services

**PocketOption API**: Binary options trading platform integration
- Authentication: SSID token from environment (`POCKET_OPTION_SSID`)
- WebSocket connection for real-time data and trade execution
- Async library: `pocketoptionapi_async`

**Neon Database**: Serverless PostgreSQL hosting
- Connection: Environment variable `DATABASE_URL`
- WebSocket-based protocol for serverless compatibility
- Managed via Drizzle ORM

### Key NPM Packages

**Frontend**:
- @tanstack/react-query: Server state management
- @radix-ui/*: Accessible UI primitives (20+ components)
- wouter: Lightweight routing
- tailwindcss: Utility-first CSS framework
- class-variance-authority: Component variant styling
- date-fns: Date manipulation

**Backend**:
- express: Web server framework
- ws: WebSocket server
- drizzle-orm: Type-safe ORM
- @neondatabase/serverless: Neon PostgreSQL client
- connect-pg-simple: PostgreSQL session store
- ccxt: Cryptocurrency exchange library (for market data)

**Trading/Analytics**:
- ta (technical analysis): SAR and other technical indicators
- pandas (Python equivalent in attached assets): Data analysis

**Build Tools**:
- vite: Frontend build tool
- tsx: TypeScript execution for development
- esbuild: Backend bundling for production

### Environment Configuration

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `POCKET_OPTION_SSID`: PocketOption authentication token
- `SESSION_SECRET`: Session encryption key (auto-generated if missing)
- `NODE_ENV`: Environment mode (development/production)
- `RUN_IN_PAPER`: Paper trading mode flag (legacy)
- `USE_SIMULATOR`: Market simulator mode (legacy)

### Python Components (Legacy/Reference)

The `attached_assets` directory contains Python-based trading bot implementations that appear to be reference implementations or previous iterations:
- Flask-based dashboard
- Market simulator for testing
- PocketOption executor implementations
- SQLite/PostgreSQL database initialization scripts

These Python components are not actively used in the current TypeScript implementation but provide context for the trading strategy and PocketOption integration patterns.
## Telegram Mini-App Integration

### Features
- **Telegram Bot Commands**:
  - `/start` - Open mini-app dashboard and main menu
  - `/status` - Get real-time bot status and balance
  - `/trades` - View last 5 trades with results
  - `/stop` - Stop the bot immediately

- **Mini-App Page**: `/telegram?user={id}`
  - Live bot status (running/stopped)
  - Balance and trade statistics
  - Active positions real-time
  - Quick start/stop controls
  - Full dashboard link

### Architecture
- **Backend**: `server/telegram-webhook.ts` - Handles Telegram webhook, messages, and commands
- **Frontend**: `client/src/pages/telegram.tsx` - Mobile-optimized mini-app interface
- **Integration**: Both via `/api/telegram/webhook` endpoint

### Setup
1. Set `TELEGRAM_BOT_TOKEN` (already configured as secret)
2. Set `TELEGRAM_CHAT_ID` (default: 7373419661)
3. Configure webhook on Telegram:
   ```
   POST /bot{TOKEN}/setWebhook
   url=https://{railway-domain}/api/telegram/webhook
   ```


## Replit Setup Notes

- **Workflow**: "Start application" runs `npm run dev` on port 5000 (webview)
- **Vite integration**: Fixed to use ESM dynamic import (`import('./vite.js')`) for HMR in development
- **Deployment**: Configured as `vm` target (always-on for WebSocket support), build: `npm run build`, run: `npm run start`
- **Python microservice**: `po_service.py` starts automatically via `server/index.ts` and runs on port 5001
- **Database**: Falls back to in-memory storage when `DATABASE_URL` is not set
- **Optional env vars**: `POCKET_OPTION_SSID` (trading API), `TELEGRAM_BOT_TOKEN` (Telegram bot), `DATABASE_URL` (PostgreSQL)

## Latest Updates (Nov 28, 2025)

### ✅ Open Dashboard Button Added (Nov 28)
- **Telegram Mini-App Enhanced**: Added "📊 Open Full Dashboard" button directly under header
- **Gradient Button**: Cyan-to-blue gradient styling for better visibility
- **Easy Navigation**: Users can quickly switch from mini-app to full dashboard

### ✅ Production Build Fixed
- **WebSocket Fix**: Updated `client/src/lib/websocket.ts` to correctly handle missing `window.location.port` in Telegram mini-app context
  - Changed: `${window.location.hostname}:${window.location.port || "80"}` 
  - To: Properly handle empty port with fallback to hostname only
- **Production Bundling**: Updated esbuild configuration to exclude vite from production bundle
- **Result**: Telegram mini-app now connects successfully with proper WebSocket URLs

### Infrastructure Status
- ✅ Local development: Fully functional
- ✅ Telegram mini-app: WebSocket connection working
- ⏳ Railway deployment: Requires GitHub build command update

### 🔧 Railway Fix Instructions (For GitHub Repository)
**Update `package.json` build script to:**
```json
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --external:vite --external:./server/vite --bundle --format=esm --outdir=dist"
```

**Steps:**
1. Go to GitHub repo: https://github.com/manuninkirill-bot/pocketoption
2. Edit `package.json`
3. Replace the build script with command above
4. Commit and push changes
5. Railway will auto-rebuild and deploy

**Why this works:**
- `--external:vite` tells esbuild to not include vite in the bundle
- `--external:./server/vite` prevents vite-setup.ts from being bundled
- Removes "Cannot find package 'vite'" error on Railway
- Local development remains unchanged

**Current Railway URL** (will work after build fix):
https://pocketoption-pocketoptionbotv10.up.railway.app
