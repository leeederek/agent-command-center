# Agent Permissions Dashboard

## Overview

**Agent Command Center (Firewall)** - A comprehensive platform for controlling and monitoring autonomous agent activities in decentralized finance (DeFi). This dashboard serves as a centralized firewall and command center where you can manage agent access, set spending limits, define allowed actions, and track all agent interactions using Coinbase Developer Platform (CDP) and x402 for access management.

### Purpose

The Agent Permissions Dashboard addresses the critical need for secure, controlled, and auditable autonomous agent operations in blockchain environments. As DeFi agents become more prevalent, there's an increasing need for:

- **Access Control**: Granular permission management for what agents can and cannot do
- **Budget Management**: Daily spending limits to prevent excessive or unauthorized transactions
- **Activity Monitoring**: Real-time tracking and logging of all agent actions
- **Policy Enforcement**: Automated validation of agent intents before execution
- **Wallet Management**: Dedicated wallet creation and funding for each agent

### Goals

1. **Security First**: Provide a robust firewall that validates and blocks unauthorized agent actions before they reach the blockchain
2. **Granular Control**: Enable fine-grained policy configuration including allowed tokens, protocols, actions, and spending limits
3. **Transparency**: Maintain comprehensive audit logs of all agent activities (both allowed and blocked)
4. **User-Friendly**: Offer an intuitive web interface for policy management and monitoring
5. **Scalability**: Support multiple agents per user with isolated wallets and independent policies
6. **Integration Ready**: Designed to work with x402 for advanced access management and CDP for blockchain operations

## Technologies Used

### Frontend
- **Next.js 16** (App Router): React framework for server-side rendering and API routes
- **React 19**: UI library for building interactive user interfaces
- **Tailwind CSS 4**: Utility-first CSS framework for rapid UI development
- **TypeScript**: Type-safe JavaScript for better code quality and developer experience

### Backend
- **Next.js API Routes**: Serverless API endpoints for handling business logic
- **NextAuth.js**: Authentication and session management with credentials provider
- **Prisma ORM**: Type-safe database client and migration tool
- **SQLite**: Lightweight, file-based database for development and small-scale deployments

### Blockchain & Infrastructure
- **Coinbase Developer Platform (CDP) SDK**: Integration with CDP for:
  - Server Wallet creation and management
  - Token balance queries
  - Swap execution via Trade API
  - Faucet requests for testnet funding
- **x402**: Access management system for controlling agent permissions (integration planned/ongoing)

### Development Tools
- **TypeScript**: Static type checking
- **ESLint**: Code linting and quality assurance
- **Prisma Studio**: Database GUI for data inspection and management

### Key Features

- **User Authentication**: CDP wallet-based authentication
- **Policy Management**: Create and manage agent policies with budgets, permissions, and expiry
- **Intent Execution**: Firewall endpoint that validates and executes agent intents via CDP Trade API
- **Activity Logging**: Track all agent actions (allowed/blocked) with detailed logs
- **Dashboard UI**: View policies, activity logs, and manage agent permissions
- **Wallet Management**: Create and fund dedicated wallets for each agent
- **Balance Tracking**: Real-time token balance display for agent wallets

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- CDP API credentials (API Key ID, API Key Secret, Wallet Secret)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
# CDP Configuration
CDP_API_KEY_ID=your_api_key_id
CDP_API_KEY_SECRET=your_api_key_secret
CDP_WALLET_SECRET=your_wallet_secret
CDP_BASE_URL=https://api.cdp.coinbase.com  # Optional, defaults to CDP API
CDP_NETWORK=base-sepolia  # Optional, defaults to base-sepolia

# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

3. Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Sign In

1. Navigate to `/auth/signin`
2. Enter your CDP Wallet ID
3. On first login, a user account will be created automatically

### Create a Policy

1. Click "Create New Policy" from the dashboard
2. Fill in the form:
   - Agent Name (e.g., "rebalance-bot-1")
   - Daily Budget (USD)
   - Allowed Tokens (select USDC, WETH)
   - Allowed Protocols (select Uniswap v3)
   - Allowed Actions (select Swap)
   - Expiry (24h, 7 days, or 30 days)
3. Submit the form
4. A CDP Server Wallet will be created automatically for the agent

### Execute Agent Intent

1. Navigate to a policy detail page
2. Click "Run agent once (swap $50 USDC → WETH)"
3. The system will:
   - Validate the intent against the policy
   - Check daily budget limits
   - Verify tokens, protocols, and actions are allowed
   - Execute the swap via CDP Trade API if validation passes
   - Log the action (ALLOWED or BLOCKED)

### View Activity Logs

1. Navigate to a policy detail page
2. Click "Activity" or "View All" to see all logs
3. Logs show:
   - Timestamp
   - Status (ALLOWED/BLOCKED)
   - Summary
   - Reason
   - Source

## API Endpoints

### POST `/api/policies`
Create a new policy.

**Request Body:**
```json
{
  "agentId": "rebalance-bot-1",
  "dailyBudgetUsd": 100,
  "allowedTokens": ["USDC", "WETH"],
  "allowedProtocols": ["uniswap_v3"],
  "allowedActions": ["swap"],
  "expiryHours": "24"
}
```

### GET `/api/policies`
Get all policies for the current user.

### POST `/api/execute-intent`
Execute an agent intent (firewall endpoint).

**Request Body:**
```json
{
  "policyId": "abc123",
  "agentId": "rebalance-bot-1",
  "source": "local-demo",
  "action": "swap",
  "amountUsd": 50,
  "protocol": "uniswap_v3",
  "tokenIn": "USDC",
  "tokenOut": "WETH"
}
```

**Response (Success):**
```json
{
  "allowed": true,
  "txId": "0x...",
  "logId": "log-id"
}
```

**Response (Blocked):**
```json
{
  "allowed": false,
  "reason": "Insufficient daily budget...",
  "logId": "log-id"
}
```

### GET `/api/policies/[id]/logs`
Get activity logs for a specific policy.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │ Policy Mgmt  │  │ Activity Log │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Next.js API Routes)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Policies   │  │ Execute Intent│  │   Auth API   │     │
│  │     API      │  │   (Firewall) │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Database   │    │  CDP SDK     │    │    x402      │
│  (SQLite +   │    │  Integration │    │  Access Mgmt │
│   Prisma)    │    │              │    │  (Planned)   │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Technology Stack Details

- **Database**: SQLite with Prisma ORM
  - Lightweight, file-based database perfect for development and small-scale deployments
  - Prisma provides type-safe database access and migrations
  - Models: User, Policy, AgentActionLog

- **Authentication**: NextAuth.js with credentials provider
  - Session-based authentication using CDP wallet IDs
  - Automatic user creation on first login
  - Secure session management

- **CDP Integration**: Coinbase Developer Platform SDK
  - Server Wallet creation and management
  - Token balance queries
  - Swap execution via Trade API
  - Faucet integration for testnet funding
  - Network support: Base Sepolia (configurable)

- **Frontend**: Next.js App Router with Tailwind CSS
  - Server-side rendering for optimal performance
  - Client-side interactivity with React hooks
  - Responsive design with Tailwind utility classes

- **Backend**: Next.js API Routes
  - Serverless API endpoints
  - Policy CRUD operations
  - Intent execution firewall
  - Wallet and balance management

- **Access Management**: x402 Integration (Planned)
  - Advanced permission management system
  - Fine-grained access control for agent operations
  - Integration with policy enforcement layer

## Data Models

### User
- `id`: Unique identifier
- `cdpWalletId`: CDP wallet address/ID
- `createdAt`, `updatedAt`: Timestamps

### Policy
- `id`: Unique identifier
- `userId`: Owner user ID
- `agentId`: Agent identifier
- `dailyBudgetUsd`: Daily spending limit
- `allowedProtocols`: JSON array of allowed protocols
- `allowedActions`: JSON array of allowed actions
- `allowedTokens`: JSON array of allowed tokens
- `deniedFunctions`: JSON array of denied functions
- `expiresAt`: Policy expiration date
- `agentWalletId`: CDP Server Wallet ID for the agent

### AgentActionLog
- `id`: Unique identifier
- `policyId`: Associated policy ID
- `agentId`: Agent identifier
- `status`: "ALLOWED" or "BLOCKED"
- `summary`: Human-readable summary
- `reason`: Detailed reason for status
- `rawRequest`: JSON string of the original request
- `source`: Source of the request (e.g., "local-demo", "chainlink-cre")
- `createdAt`: Timestamp

## Notes

- Token addresses are hardcoded for Base Sepolia testnet. Update `lib/cdp.ts` with actual token addresses for your network.
- Daily budget calculation sums ALLOWED logs for the current day (UTC).
- Agent wallets must be manually funded from a faucet or another wallet for testing.
- CDP SDK API methods may vary - adjust based on actual CDP documentation.

## Development

### Database Migrations
```bash
npx prisma migrate dev --name migration_name
```

### Prisma Studio
```bash
npx prisma studio
```

### Build for Production
```bash
npm run build
npm start
```

## License

MIT
