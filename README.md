# Agent Command Center (ACC)

## High Level Overview

A centralized firewall and control panel for autonomous DeFi agents. It manages permissions, spending limits, allowed actions, and activity logs using the Coinbase Developer Platform (CDP) and (planned) x402 access control.

## Motivation & rationale
Autonomous agents are becoming increasingly common in decentralized finance, but most teams lack the infrastructure to control, monitor, and safely deploy these systems. Today, engineers often stitch together ad-hoc scripts, multisig checks, and custom logic just to prevent agents from overspending, interacting with the wrong protocols, or executing unintended transactions. This creates operational risk, inconsistent security guarantees, and a heavy maintenance burden. A centralized firewall-style dashboard solves these issues by giving teams one place to define budgets, permissions, allowed actions, and execution rules, ensuring agent behavior is tightly governed before anything touches the blockchain.

Beyond security, visibility is another major pain point. Teams typically have no unified view of what their agents are doing, which policies they’re following, or which actions were blocked and why. Logs are fragmented across wallets, explorers, and internal tooling. This lack of observability becomes especially problematic as teams scale to multiple agents or introduce more complex strategies. A dedicated permissions dashboard consolidates all agent activity into a single audit layer, simplifying compliance, debugging, and incident response.

This type of product has clear product-market fit with teams building autonomous DeFi agents, on-chain automation, trading bots, or agent-based applications that require strong guardrails and auditability. As the agent ecosystem grows, organizations will need standardized infrastructure to manage permissioning, prevent loss of funds, and maintain trust in autonomous execution. There is significant opportunity to become the default “agent operations layer,” integrate with leading agent frameworks, and expand into policy automation, compliance tooling, and enterprise-grade access control as the market matures.

### Purpose

- Enforce granular agent permissions
- Set daily spending limits
- Monitor all actions in real time
- Validate intents before execution
- Create and manage dedicated agent wallets

### Goals
- Block unauthorized actions before they reach the blockchain
- Configure precise policy rules
- Maintain transparent audit logs
- Provide a simple web UI
- Support multiple isolated agent wallets
- Integrate with CDP and x402
  
### Key Features

- **User Authentication**: CDP wallet-based authentication
- **Policy Management**: Create and manage agent policies with budgets, permissions, and expiry
- **Intent Execution**: Firewall endpoint that validates and executes agent intents via CDP Trade API
- **Activity Logging**: Track all agent actions (allowed/blocked) with detailed logs
- **Dashboard UI**: View policies, activity logs, and manage agent permissions
- **Wallet Management**: Create and fund dedicated wallets for each agent
- **Balance Tracking**: Real-time token balance display for agent wallets

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

3. Generate Prisma client and run database migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

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
