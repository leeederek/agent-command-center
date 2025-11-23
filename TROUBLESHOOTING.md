# Troubleshooting Wallet Creation

## Common Error: "Failed to create wallet"

If you're seeing this error, check the following:

### 1. Check Environment Variables

Make sure your `.env` file has all required CDP credentials:

```env
CDP_API_KEY_ID=your_api_key_id
CDP_API_KEY_SECRET=your_api_key_secret
CDP_WALLET_SECRET=your_wallet_secret  # IMPORTANT: This is required for wallet operations
CDP_BASE_URL=https://api.cdp.coinbase.com
CDP_NETWORK=base-sepolia
```

**Note**: `CDP_WALLET_SECRET` is required for creating accounts/wallets. Get it from:
https://portal.cdp.coinbase.com/projects/api-keys

### 2. Check Server Logs

Look at your terminal where `npm run dev` is running. You should see detailed error logs like:

```
Error creating wallet: [error details]
CDP createAccount error: [CDP SDK error]
```

### 3. Common Issues

#### Issue: "Wallet Secret not configured"
**Solution**: Add `CDP_WALLET_SECRET` to your `.env` file

#### Issue: "Invalid API credentials"
**Solution**: 
- Verify your API keys are correct
- Check they're not expired
- Ensure they have the right permissions

#### Issue: "Network error" or "Connection refused"
**Solution**:
- Check your internet connection
- Verify `CDP_BASE_URL` is correct
- Check if CDP API is accessible

#### Issue: "Rate limit exceeded"
**Solution**: Wait a few minutes and try again

### 4. Verify CDP Credentials

1. Go to https://portal.cdp.coinbase.com
2. Navigate to your project
3. Check API Keys section
4. Verify:
   - API Key ID matches `CDP_API_KEY_ID`
   - API Key Secret matches `CDP_API_KEY_SECRET`
   - Wallet Secret matches `CDP_WALLET_SECRET`

### 5. Test CDP Connection

You can test if your CDP credentials work by checking the server logs when you try to create a wallet. The error message should now include more details.

### 6. Check Browser Console

Open browser DevTools (F12) → Console tab, and look for any JavaScript errors or network errors.

### 7. Check Network Tab

In browser DevTools → Network tab:
- Look for the `/api/policies/[id]/wallet` request
- Check the response for error details
- Look at the status code and response body

### 8. Restart Dev Server

After updating `.env` file:
1. Stop the dev server (Ctrl+C)
2. Restart: `npm run dev`
3. Try creating wallet again

### 9. Verify Database

Make sure Prisma is set up correctly:
```bash
npx prisma generate
npx prisma migrate dev
```

### 10. Get Help

If the error persists:
1. Check the full error message in browser alert (should now show details)
2. Check server terminal logs
3. Check browser console for errors
4. Share the error message and details

