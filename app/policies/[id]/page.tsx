'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Policy {
  id: string
  agentId: string
  dailyBudgetUsd: number
  expiresAt: string
  agentWalletId: string | null
  allowedTokens: string
  allowedProtocols: string
  allowedActions: string
  createdAt: string
}

interface ActionLog {
  id: string
  status: 'ALLOWED' | 'BLOCKED'
  summary: string
  reason: string
  source: string
  createdAt: string
}

export default function PolicyDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const policyId = params?.id as string | undefined
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [requestingFaucet, setRequestingFaucet] = useState<string | null>(null)
  const [faucetResult, setFaucetResult] = useState<string | null>(null)
  const [creatingWallet, setCreatingWallet] = useState(false)
  interface TokenBalance {
    contractAddress: string
    symbol: string
    name: string
    amount: string
    rawAmount: string
    decimals: number
    network: string
  }

  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (!policyId) {
      setLoading(false)
      return
    }

    if (status === 'authenticated' && policyId) {
      // Reset state when policyId changes
      setPolicy(null)
      setLogs([])
      setBalances([]) // Clear balances when switching policies
      setLoading(true)
      setFaucetResult(null)
      setBalanceError(null)
      setLoadingBalances(false) // Reset loading state
      
      // Fetch policy and logs for this specific policyId
      const fetchData = async () => {
        try {
          const response = await fetch(`/api/policies/${policyId}`, {
            cache: 'no-store', // Prevent caching
          })
          if (response.ok) {
            const policyData = await response.json()
            
            // Verify we got the correct policy
            if (policyData.id !== policyId) {
              setPolicy(null)
              return
            }
            
            setPolicy(policyData)
          } else {
            // Fallback to fetching all policies
            const allPoliciesResponse = await fetch('/api/policies', {
              cache: 'no-store',
            })
            if (allPoliciesResponse.ok) {
              const policies = await allPoliciesResponse.json()
              const found = policies.find((p: Policy) => p.id === policyId)
              
              if (found && found.id !== policyId) {
                setPolicy(null)
                return
              }
              
              if (found) {
                setPolicy(found)
              } else {
                setPolicy(null)
              }
            } else {
              setPolicy(null)
            }
          }
        } catch (error) {
          console.error('Error fetching policy:', error)
        } finally {
          setLoading(false)
        }
        
        // Fetch logs
        try {
          const logsResponse = await fetch(`/api/policies/${policyId}/logs`)
          if (logsResponse.ok) {
            const logsData = await logsResponse.json()
            setLogs(logsData)
          }
        } catch (error) {
          console.error('Error fetching logs:', error)
        }
      }
      
      fetchData()
    }
  }, [status, router, policyId])

  useEffect(() => {
    // Fetch balances when policy and wallet are available
    if (policy?.agentWalletId && policy?.id === policyId) {
      // Pass wallet address explicitly to avoid closure issues
      fetchBalances(policy.agentWalletId)
    } else {
      setBalances([])
      setBalanceError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy?.id, policy?.agentWalletId, policyId])

  const fetchBalances = async (expectedWalletAddress?: string) => {
    // Use the passed wallet address or fall back to policy state
    const walletAddress = expectedWalletAddress || policy?.agentWalletId
    
    if (!walletAddress) {
      setBalances([])
      return
    }

    if (!policyId) {
      return
    }

    setLoadingBalances(true)
    setBalanceError(null)
    try {
      const response = await fetch(`/api/policies/${policyId}/balances`, {
        cache: 'no-store', // Prevent caching
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Verify we got balances for the correct wallet
        if (result.walletAddress !== walletAddress) {
          setBalanceError(`Wrong wallet! Expected ${walletAddress.slice(0, 8)}... but got ${result.walletAddress.slice(0, 8)}...`)
          setBalances([])
          return
        }
        
        // Verify policy state matches (if policy is loaded)
        if (policy && result.walletAddress !== policy.agentWalletId) {
          setBalanceError(`Wallet mismatch: Policy shows ${policy.agentWalletId?.slice(0, 8)}... but API returned ${result.walletAddress.slice(0, 8)}...`)
          setBalances([])
          return
        }
        
        setBalances(result.balances || [])
        if (!result.balances || result.balances.length === 0) {
          setBalanceError('No tokens found in wallet. Request faucet funds to see balances.')
        } else {
          setBalanceError(null)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || errorData.message || 'Failed to fetch balances'
        if (!errorMessage.includes('Policy ID mismatch')) {
          setBalanceError(errorMessage)
        }
        setBalances([])
      }
    } catch (error: unknown) {
      console.error('Error fetching balances:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error fetching balances'
      setBalanceError(errorMessage)
      setBalances([])
    } finally {
      setLoadingBalances(false)
    }
  }

  const fetchPolicy = async () => {
    if (!policyId) return
    
    try {
      // Try fetching the specific policy first
      const response = await fetch(`/api/policies/${policyId}`)
      if (response.ok) {
        const policyData = await response.json()
        
        // Verify we got the correct policy
        if (policyData.id !== policyId) {
          return
        }
        
        setPolicy(policyData)
      } else {
        // Fallback to fetching all policies
        const allPoliciesResponse = await fetch('/api/policies')
        if (allPoliciesResponse.ok) {
          const policies = await allPoliciesResponse.json()
          const found = policies.find((p: Policy) => p.id === policyId)
          
          if (found && found.id !== policyId) {
            return
          }
          
          setPolicy(found || null)
        }
      }
    } catch (error) {
      console.error('Error fetching policy:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/logs`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  const handleRunAgent = async () => {
    if (!policy) return

    setExecuting(true)
    try {
      const allowedTokens = JSON.parse(policy.allowedTokens) as string[]
      const allowedProtocols = JSON.parse(
        policy.allowedProtocols
      ) as string[]
      const allowedActions = JSON.parse(policy.allowedActions) as string[]

      const response = await fetch('/api/execute-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: policy.id,
          agentId: policy.agentId,
          source: 'local-demo',
          action: allowedActions[0] || 'swap',
          amountUsd: 50,
          protocol: allowedProtocols[0] || 'uniswap_v3',
          tokenIn: allowedTokens[0] || 'USDC',
          tokenOut: allowedTokens[1] || 'WETH',
        }),
      })

      const result = await response.json()

      if (result.allowed) {
        alert(`Action allowed! Transaction ID: ${result.txId}`)
      } else {
        alert(`Action blocked: ${result.reason}`)
      }

      // Refresh logs
      fetchLogs()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      alert(`Error: ${errorMessage}`)
    } finally {
      setExecuting(false)
    }
  }

  const handleRequestFaucet = async (token: 'eth' | 'usdc') => {
    if (!policy?.agentWalletId) return

    setRequestingFaucet(token)
    setFaucetResult(null)

    try {
      console.log(`Requesting faucet for ${token} to wallet:`, policy.agentWalletId)
      const response = await fetch(`/api/policies/${policyId}/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (response.ok) {
        setFaucetResult(
          `Success! Transaction: ${result.transactionHash}`
        )
        // Refresh balances after successful faucet request
        setTimeout(() => {
          // Pass the wallet address explicitly
          if (policy?.agentWalletId) {
            fetchBalances(policy.agentWalletId)
          }
        }, 3000) // Wait 3 seconds for transaction to be processed
      } else {
        setFaucetResult(`Error: ${result.error || result.message}`)
      }
    } catch (error: unknown) {
      console.error('Faucet request error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      setFaucetResult(`Error: ${errorMessage}`)
    } finally {
      setRequestingFaucet(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Address copied to clipboard!')
  }

  const handleCreateWallet = async () => {
    if (!policy) return

    setCreatingWallet(true)
    try {
      const response = await fetch(`/api/policies/${policyId}/wallet`, {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh policy to get updated wallet ID
        await fetchPolicy()
        // Also refresh the router to ensure UI updates
        router.refresh()
        if (!result.alreadyExists) {
          alert('Wallet created successfully!')
        }
      } else {
        const errorMsg = result.details 
          ? `${result.error || result.message}\n\nDetails: ${result.details}`
          : result.error || result.message
        alert(`Error: ${errorMsg}`)
        console.error('Wallet creation error:', result)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      alert(`Error: ${errorMessage}`)
      console.error('Wallet creation exception:', error)
    } finally {
      setCreatingWallet(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (!policyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-red-600 mb-4 font-semibold">Invalid Policy ID</p>
          <p className="text-sm text-gray-500 mb-2">Policy ID is missing from URL.</p>
          <p className="text-xs text-gray-400 mb-4">Params: {JSON.stringify(params)}</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!loading && !policy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <p className="text-red-600 mb-4 font-semibold">Policy not found</p>
          <p className="text-sm text-gray-500 mb-2">Policy ID: <code className="bg-gray-100 px-2 py-1 rounded">{policyId}</code></p>
          <p className="text-xs text-gray-400 mb-2">User: {session?.user?.cdpWalletId || 'Not logged in'}</p>
          <p className="text-xs text-gray-400 mb-4">
            Check the browser console and server logs for more details.
            The policy might not exist or belong to a different user.
          </p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const allowedTokens = JSON.parse(policy.allowedTokens) as string[]
  const allowedProtocols = JSON.parse(policy.allowedProtocols) as string[]
  const allowedActions = JSON.parse(policy.allowedActions) as string[]
  const isExpired = new Date(policy.expiresAt) < new Date()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block"
          >
            ← Back to Policies
          </Link>
          <Link
            href={`/policies/${policyId}/edit`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
          >
            Edit Policy
          </Link>
        </div>

        {/* Agent Wallet Address Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <h2 className="text-lg font-semibold mb-3">Agent Wallet Address</h2>
          {policy.agentWalletId ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <code className="bg-black/20 px-4 py-2 rounded-md font-mono text-sm flex-1 break-all">
                  {policy.agentWalletId}
                </code>
                <button
                  onClick={() => copyToClipboard(policy.agentWalletId!)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Copy
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleRequestFaucet('eth')}
                  disabled={requestingFaucet !== null || isExpired}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {requestingFaucet === 'eth' ? 'Requesting...' : 'Request ETH Faucet'}
                </button>
                <button
                  onClick={() => handleRequestFaucet('usdc')}
                  disabled={requestingFaucet !== null || isExpired}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {requestingFaucet === 'usdc' ? 'Requesting...' : 'Request USDC Faucet'}
                </button>
              </div>
              {faucetResult && (
                <div className={`mt-4 p-3 rounded-md text-sm ${
                  faucetResult.startsWith('Success') 
                    ? 'bg-green-500/20 text-green-100' 
                    : 'bg-red-500/20 text-red-100'
                }`}>
                  {faucetResult}
                </div>
              )}
              
              {/* Token Balances Section */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-semibold">Token Balances</h3>
                  <p className="text-xs text-white/60 font-mono">
                    Wallet: {policy.agentWalletId.slice(0, 8)}...{policy.agentWalletId.slice(-6)}
                  </p>
                </div>
                {loadingBalances ? (
                  <p className="text-white/70 text-sm">Loading balances...</p>
                ) : balanceError ? (
                  <div className="bg-red-500/20 rounded-md p-3 mb-3">
                    <p className="text-red-100 text-sm">{balanceError}</p>
                  </div>
                ) : balances.length > 0 ? (
                  <div className="space-y-2">
                    {balances.map((balance, index) => (
                      <div
                        key={`${balance.contractAddress}-${index}`}
                        className="bg-black/20 rounded-md px-4 py-2 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{balance.symbol}</div>
                          <div className="text-xs text-white/70">{balance.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">{balance.amount}</div>
                          <div className="text-xs text-white/70">
                            {balance.contractAddress.slice(0, 6)}...{balance.contractAddress.slice(-4)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/70 text-sm">No token balances found. Request faucet funds to see balances.</p>
                )}
                <button
                  onClick={() => policy?.agentWalletId && fetchBalances(policy.agentWalletId)}
                  disabled={loadingBalances || !policy.agentWalletId}
                  className="mt-3 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingBalances ? 'Refreshing...' : 'Refresh Balances'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="mb-4 text-white/90">No wallet created yet for this agent.</p>
              <button
                onClick={handleCreateWallet}
                disabled={creatingWallet || isExpired}
                className="bg-white text-indigo-600 px-6 py-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {creatingWallet ? 'Creating Wallet...' : 'Create Agent Wallet'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {policy.agentId}
              </h1>
              <span
                className={`px-3 py-1 text-sm rounded-full ${
                  isExpired
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
            <button
              onClick={handleRunAgent}
              disabled={executing || isExpired || !policy.agentWalletId}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing
                ? 'Executing...'
                : 'Run agent once (swap $50 USDC → WETH)'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Policy Details
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Daily Budget
                  </dt>
                  <dd className="text-lg text-gray-900">
                    ${policy.dailyBudgetUsd.toFixed(2)} USD
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Expires At
                  </dt>
                  <dd className="text-lg text-gray-900">
                    {new Date(policy.expiresAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Created At
                  </dt>
                  <dd className="text-lg text-gray-900">
                    {new Date(policy.createdAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Permissions
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Allowed Tokens
                  </dt>
                  <dd className="text-lg text-gray-900">
                    {allowedTokens.join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Allowed Protocols
                  </dt>
                  <dd className="text-lg text-gray-900">
                    {allowedProtocols.join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Allowed Actions
                  </dt>
                  <dd className="text-lg text-gray-900">
                    {allowedActions.join(', ')}
                  </dd>
                </div>
                {policy.agentWalletId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Agent Wallet ID
                    </dt>
                    <dd className="text-sm text-gray-600 font-mono">
                      {policy.agentWalletId}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Activity Log</h2>
            <Link
              href={`/policies/${policyId}/activity`}
              className="text-indigo-600 hover:text-indigo-700 text-sm"
            >
              View All →
            </Link>
          </div>

          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No activity logs yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Summary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.slice(0, 5).map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            log.status === 'ALLOWED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.summary}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

