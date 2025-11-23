# Quick Start Testing Guide

## 1. Start the Server

```bash
cd agent-permissions-dashboard
npm run dev
```

Open http://localhost:3000 in your browser.

## 2. Sign In

- You'll be redirected to `/auth/signin`
- Enter any test wallet ID (e.g., `test-wallet-123`)
- Click "Sign in"
- You'll be redirected to the dashboard

## 3. Create Your First Policy

1. Click **"Create New Policy"**
2. Fill in:
   - Agent Name: `my-test-bot`
   - Daily Budget: `100`
   - Allowed Tokens: ✓ USDC, ✓ WETH
   - Allowed Protocols: ✓ Uniswap v3
   - Allowed Actions: ✓ Swap
   - Expiry: `24 hours`
3. Click **"Create Policy"**

## 4. View Wallet & Request Faucet

1. On the policy detail page, you'll see:
   - **Agent Wallet Address** (gradient card at top)
   - Copy button
   - **"Request ETH Faucet"** button
   - **"Request USDC Faucet"** button

2. **Copy the wallet address** (click Copy button)

3. **Request faucet funds**:
   - Click "Request ETH Faucet" → Wait for success message
   - Click "Request USDC Faucet" → Wait for success message

## 5. Test Agent Execution

1. Click **"Run agent once (swap $50 USDC → WETH)"**
2. Check the result:
   - ✅ **Success**: "Action allowed! Transaction ID: 0x..."
   - ❌ **Blocked**: "Action blocked: [reason]"
3. Scroll down to see **Activity Log** with the result

## 6. View Activity Logs

- Click **"View All →"** or navigate to Activity tab
- See all ALLOWED/BLOCKED actions with details

## Common Issues

**"Policy created but failed to create agent wallet"**
- Check CDP credentials in `.env`
- Verify `CDP_WALLET_SECRET` is set

**"Faucet request failed"**
- Ensure network is `base-sepolia`
- Check CDP API status

**"Swap execution failed"**
- Make sure wallet has funds (request faucet first)
- Check token addresses in `lib/cdp.ts`

## Verify Transactions

Check your wallet on Base Sepolia Explorer:
- Go to: https://sepolia.basescan.org/address/YOUR_WALLET_ADDRESS
- Replace `YOUR_WALLET_ADDRESS` with the agent wallet address

