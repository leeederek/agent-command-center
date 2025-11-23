import { CdpClient } from '@coinbase/cdp-sdk'

// Initialize CDP client with API credentials
export function getCdpClient(): CdpClient {
  const apiKeyId = process.env.CDP_API_KEY_ID || process.env.CDP_API_KEY
  const apiKeySecret = process.env.CDP_API_KEY_SECRET || process.env.CDP_API_SECRET
  const walletSecret = process.env.CDP_WALLET_SECRET

  if (!apiKeyId || !apiKeySecret) {
    throw new Error('CDP_API_KEY_ID and CDP_API_KEY_SECRET must be set in environment variables')
  }

  const options: any = {
    apiKeyId,
    apiKeySecret,
  }

  if (walletSecret) {
    options.walletSecret = walletSecret
  }

  // Don't set basePath - let CDP SDK use its default
  // The SDK handles the base URL internally

  return new CdpClient(options)
}

// Network configuration
export const CDP_NETWORK = process.env.CDP_NETWORK || 'base-sepolia'

// Token address mappings for Base Sepolia (testnet)
// In production, these should be fetched from CDP or a token registry
const TOKEN_ADDRESSES: Record<string, Record<string, `0x${string}`>> = {
  'base-sepolia': {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // Example - replace with actual testnet address
    WETH: '0x4200000000000000000000000000000000000006' as `0x${string}`, // Example - replace with actual testnet address
  },
}

// Sanitize account name to meet CDP requirements:
// - 2-36 characters
// - Alphanumeric and hyphens only
function sanitizeAccountName(name: string): string {
  // Remove invalid characters, keep only alphanumeric and hyphens
  let sanitized = name.replace(/[^a-zA-Z0-9-]/g, '-')
  
  // Remove consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-')
  
  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '')
  
  // Truncate to 36 characters max
  if (sanitized.length > 36) {
    sanitized = sanitized.substring(0, 36)
    // Remove trailing hyphen if truncated
    sanitized = sanitized.replace(/-+$/, '')
  }
  
  // Ensure minimum length of 2
  if (sanitized.length < 2) {
    sanitized = `agent-${sanitized || 'wallet'}`
  }
  
  return sanitized
}

// Create a server wallet for an agent
export async function createAgentWallet(label: string) {
  try {
    const cdp = getCdpClient()
    
    // Generate a unique name that includes timestamp to ensure uniqueness
    // CDP might reuse accounts with the same name, so we need to ensure each is unique
    const timestamp = Date.now()
    const uniqueLabel = `${label}-${timestamp}`
    
    // Sanitize the label to meet CDP name requirements
    const sanitizedName = sanitizeAccountName(uniqueLabel)
    
    console.log(`Creating account with name: ${sanitizedName} (original: ${label}, unique: ${uniqueLabel})`)
    
    // Create EVM server account (wallet)
    // Note: CDP createAccount creates a NEW account each time, but if name collision occurs,
    // we use timestamp to ensure uniqueness
    const account = await cdp.evm.createAccount({
      name: sanitizedName,
    })
    
    console.log(`Created account: ${account.address} with name: ${sanitizedName}`)
    
    // Return the account address as the wallet ID
    return {
      id: account.address,
      address: account.address,
    }
  } catch (error: any) {
    console.error('CDP createAccount error:', error)
    // Re-throw with more context
    throw new Error(
      `Failed to create CDP account: ${error.message || 'Unknown error'}. ` +
      `Make sure CDP_WALLET_SECRET is set in environment variables if required.`
    )
  }
}

// Execute a swap trade
export async function executeSwap(params: {
  walletId: string
  fromAsset: string
  toAsset: string
  amountUsd: number
}) {
  const cdp = getCdpClient()
  
  // Get token addresses for the network
  const tokenAddresses = TOKEN_ADDRESSES[CDP_NETWORK] || TOKEN_ADDRESSES['base-sepolia']
  const fromToken = tokenAddresses[params.fromAsset]
  const toToken = tokenAddresses[params.toAsset]

  if (!fromToken || !toToken) {
    throw new Error(`Token addresses not configured for ${params.fromAsset} or ${params.toAsset}`)
  }

  // Convert USD amount to token amount (simplified - in production, use price oracle)
  // For now, assuming 1 USD = 1 USDC (6 decimals), and using a fixed amount
  // In production, you'd fetch the actual token price and convert properly
  const fromAmount = BigInt(Math.floor(params.amountUsd * 1e6)) // Assuming 6 decimals for USDC

  // Ensure walletId is a valid address format
  const takerAddress = params.walletId.startsWith('0x') 
    ? params.walletId as `0x${string}`
    : `0x${params.walletId}` as `0x${string}`

  // Create swap quote
  const swapQuote = await cdp.evm.createSwapQuote({
    network: CDP_NETWORK as any,
    fromToken,
    toToken,
    fromAmount,
    taker: takerAddress,
  })

  if ('liquidityAvailable' in swapQuote && !swapQuote.liquidityAvailable) {
    throw new Error('Swap not available - insufficient liquidity')
  }

  // Type guard to ensure we have CreateSwapQuoteResult
  if (!('execute' in swapQuote)) {
    throw new Error('Swap quote execution not available')
  }

  // Execute the swap
  const result = await swapQuote.execute()
  
  return {
    txId: result.transactionHash || result.userOpHash || 'pending',
    userOperationHash: result.userOpHash,
    transactionHash: result.transactionHash,
  }
}

// Request faucet funds for an account
export async function requestFaucet(params: {
  address: string
  network: 'base-sepolia' | 'ethereum-sepolia'
  token: 'eth' | 'usdc' | 'eurc' | 'cbbtc'
}) {
  const cdp = getCdpClient()
  
  // Get the account first
  const account = await cdp.evm.getAccount({
    address: params.address as `0x${string}`,
  })

  // Request faucet using the account's requestFaucet method
  const result = await account.requestFaucet({
    network: params.network,
    token: params.token,
  })

  return {
    transactionHash: result.transactionHash,
  }
}

// Get token balances for an account
export async function getTokenBalances(params: {
  address: string
  network?: string
}) {
  const cdp = getCdpClient()
  const network = (params.network || CDP_NETWORK) as any
  
  // Get the account first
  const account = await cdp.evm.getAccount({
    address: params.address as `0x${string}`,
  })

  // Get network-scoped account
  const networkAccount = await account.useNetwork(network)

  // Check if listTokenBalances is available (it's network-dependent)
  if (!('listTokenBalances' in networkAccount) || typeof networkAccount.listTokenBalances !== 'function') {
    throw new Error(`Token balance listing not available for network: ${network}`)
  }

  // List token balances
  const balances = await networkAccount.listTokenBalances({})

  // Format balances for display
  return balances.balances.map((balance: any) => {
    const amount = balance.amount.amount
    const decimals = balance.amount.decimals
    const divisor = BigInt(10 ** decimals)
    const wholePart = amount / divisor
    const fractionalPart = amount % divisor
    
    // Format as decimal string
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
    const formattedAmount = `${wholePart.toString()}.${fractionalStr}`.replace(/\.?0+$/, '')
    
    return {
      contractAddress: balance.token.contractAddress,
      symbol: balance.token.symbol || 'UNKNOWN',
      name: balance.token.name || 'Unknown Token',
      amount: formattedAmount,
      rawAmount: amount.toString(),
      decimals: decimals,
      network: balance.token.network,
    }
  })
}

