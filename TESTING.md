# Testing Guide

This guide will walk you through testing the Agent Permissions Dashboard step by step.

## Prerequisites

1. **CDP API Credentials**: You need:
   - `CDP_API_KEY_ID` (or `CDP_API_KEY`)
   - `CDP_API_KEY_SECRET` (or `CDP_API_SECRET`)
   - `CDP_WALLET_SECRET` (optional but recommended for wallet operations)
   
   Get these from: https://portal.cdp.coinbase.com/projects/api-keys

2. **Environment Setup**: Create a `.env.local` file in the project root with:
   ```env
   CDP_API_KEY_ID=your_api_key_id
   CDP_API_KEY_SECRET=your_api_key_secret
   CDP_WALLET_SECRET=your_wallet_secret
   CDP_BASE_URL=https://api.cdp.coinbase.com
   CDP_NETWORK=base-sepolia
   
   DATABASE_URL="file:./dev.db"
   
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret-key-here
   ```

   Generate a random `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

## Step 1: Start the Development Server

```bash
cd agent-permissions-dashboard
npm run dev
```

The app should start at `http://localhost:3000`

## Step 2: Test Authentication

1. **Navigate to Sign In**:
   - Go to `http://localhost:3000`
   - You should be redirected to `/auth/signin`

2. **Sign In with CDP Wallet ID**:
   - For testing, you can use any string as a CDP Wallet ID (e.g., `test-wallet-123`)
   - Enter it in the form and click "Sign in"
   - On first login, a user account will be created automatically
   - You should be redirected to the dashboard (`/`)

## Step 3: Test Policy Creation

1. **Create a New Policy**:
   - Click "Create New Policy" button
   - Fill in the form:
     - **Agent Name**: `test-bot-1`
     - **Daily Budget**: `100`
     - **Allowed Tokens**: Check `USDC` and `WETH`
     - **Allowed Protocols**: Check `Uniswap v3`
     - **Allowed Actions**: Check `Swap`
     - **Expiry**: Select `24 hours`
   - Click "Create Policy"

2. **Expected Result**:
   - Policy should be created
   - A CDP Server Wallet should be created for the agent
   - You should be redirected back to the dashboard
   - The new policy should appear in the policies list

3. **Verify Policy Details**:
   - Click "View Details" on the new policy
   - You should see:
     - Policy information
     - **Agent Wallet Address** section at the top (with gradient background)
     - Copy button for the address
     - "Request ETH Faucet" and "Request USDC Faucet" buttons

## Step 4: Test Faucet Functionality

1. **View Wallet Address**:
   - On the policy detail page, you should see the Agent Wallet Address section
   - The address should be displayed (starts with `0x...`)
   - Click "Copy" to copy the address to clipboard

2. **Request ETH Faucet**:
   - Click "Request ETH Faucet" button
   - Wait for the request to process
   - You should see a success message with a transaction hash
   - Example: `Success! Transaction: 0x...`

3. **Request USDC Faucet**:
   - Click "Request USDC Faucet" button
   - Wait for the request to process
   - You should see a success message with a transaction hash

4. **Verify Funds** (Optional):
   - You can check the wallet balance using a Base Sepolia explorer:
   - Go to: https://sepolia.basescan.org/address/YOUR_WALLET_ADDRESS
   - Replace `YOUR_WALLET_ADDRESS` with the agent wallet address

## Step 5: Test Agent Execution

1. **Run Agent**:
   - On the policy detail page, click "Run agent once (swap $50 USDC → WETH)"
   - This will trigger the `/api/execute-intent` endpoint

2. **Expected Scenarios**:

   **Scenario A: Successful Execution** (if wallet has funds):
   - Intent validation passes
   - Swap is executed via CDP Trade API
   - You see: `Action allowed! Transaction ID: 0x...`
   - Activity log shows an "ALLOWED" entry

   **Scenario B: Blocked Execution** (if validation fails):
   - You see: `Action blocked: [reason]`
   - Common reasons:
     - "Insufficient daily budget"
     - "Policy expired"
     - "Token not allowed"
     - "Protocol not allowed"
   - Activity log shows a "BLOCKED" entry

3. **Check Activity Log**:
   - Scroll down to see the Activity Log section
   - You should see entries with:
     - Timestamp
     - Status (ALLOWED/BLOCKED)
     - Summary
     - Reason
     - Source (local-demo)

4. **View Full Activity Log**:
   - Click "View All →" or navigate to `/policies/[id]/activity`
   - See all activity logs in a table format

## Step 6: Test Policy Validation

Test different validation scenarios by modifying the policy or request:

1. **Test Expired Policy**:
   - Create a policy with 1 hour expiry
   - Wait for it to expire (or manually update DB)
   - Try to run agent → Should be blocked

2. **Test Budget Limits**:
   - Create a policy with $10 daily budget
   - Run agent with $50 amount → Should be blocked
   - Run agent with $5 amount → Should be allowed (if within budget)

3. **Test Token Validation**:
   - Create a policy with only USDC allowed
   - Try to swap USDC → WETH → Should be allowed
   - Try to swap WETH → USDC → Should be blocked (if WETH not in allowed tokens)

## Troubleshooting

### Issue: "CDP_API_KEY_ID and CDP_API_KEY_SECRET must be set"
- **Solution**: Make sure `.env.local` file exists with correct credentials
- Restart the dev server after adding environment variables

### Issue: "Policy created but failed to create agent wallet"
- **Solution**: Check CDP API credentials and network configuration
- Verify `CDP_WALLET_SECRET` is set if required
- Check CDP API logs/console for errors

### Issue: "Faucet request failed"
- **Solution**: 
  - Verify network is `base-sepolia` or `ethereum-sepolia`
  - Check if faucet is available for the selected token
  - Ensure wallet address is valid

### Issue: "Swap execution failed"
- **Solution**:
  - Ensure wallet has sufficient funds (ETH for gas, tokens for swap)
  - Verify token addresses are correct in `lib/cdp.ts`
  - Check network configuration matches token addresses

### Issue: Database errors
- **Solution**: 
  ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] Can sign in with CDP Wallet ID
- [ ] Can create a new policy
- [ ] Agent wallet address is displayed
- [ ] Can copy wallet address
- [ ] Can request ETH faucet
- [ ] Can request USDC faucet
- [ ] Can run agent (may be blocked if no funds)
- [ ] Activity logs are displayed
- [ ] Can view full activity log

## Testing with Real CDP Credentials

For full functionality testing:

1. **Get CDP API Keys**:
   - Sign up at https://portal.cdp.coinbase.com
   - Create a project
   - Generate API keys
   - Copy credentials to `.env.local`

2. **Test on Base Sepolia**:
   - Network: `base-sepolia`
   - Use testnet tokens (USDC, WETH)
   - Faucet should work for testnet

3. **Monitor Transactions**:
   - Use Base Sepolia explorer: https://sepolia.basescan.org
   - Check transaction status
   - Verify wallet balances

## Next Steps

After basic testing:
1. Test with multiple policies
2. Test with different token combinations
3. Test daily budget tracking
4. Test policy expiry
5. Test error handling scenarios

