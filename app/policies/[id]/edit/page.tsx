'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Policy {
  id: string
  agentId: string
  dailyBudgetUsd: number
  expiresAt: string
  allowedTokens: string
  allowedProtocols: string
  allowedActions: string
}

export default function EditPolicyPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const policyId = params?.id as string | undefined
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [formData, setFormData] = useState({
    agentId: '',
    dailyBudgetUsd: '',
    allowedTokens: [] as string[],
    allowedProtocols: [] as string[],
    allowedActions: [] as string[],
    expiryHours: '24',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated' && policyId) {
      fetchPolicy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router, policyId])

  const fetchPolicy = async () => {
    if (!policyId) return

    try {
      const response = await fetch(`/api/policies/${policyId}`)
      if (response.ok) {
        const policyData = await response.json()
        setPolicy(policyData)
        
        // Calculate hours until expiry
        const expiresAt = new Date(policyData.expiresAt)
        const now = new Date()
        const hoursUntilExpiry = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)))
        
        setFormData({
          agentId: policyData.agentId,
          dailyBudgetUsd: policyData.dailyBudgetUsd.toString(),
          allowedTokens: JSON.parse(policyData.allowedTokens) as string[],
          allowedProtocols: JSON.parse(policyData.allowedProtocols) as string[],
          allowedActions: JSON.parse(policyData.allowedActions) as string[],
          expiryHours: hoursUntilExpiry.toString(),
        })
      }
    } catch (error) {
      console.error('Error fetching policy:', error)
    } finally {
      setFetching(false)
    }
  }

  if (status === 'loading' || fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-red-600 mb-4">Policy not found</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-700">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const handleTokenChange = (token: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedTokens: prev.allowedTokens.includes(token)
        ? prev.allowedTokens.filter((t) => t !== token)
        : [...prev.allowedTokens, token],
    }))
  }

  const handleProtocolChange = (protocol: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedProtocols: prev.allowedProtocols.includes(protocol)
        ? prev.allowedProtocols.filter((p) => p !== protocol)
        : [...prev.allowedProtocols, protocol],
    }))
  }

  const handleActionChange = (action: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedActions: prev.allowedActions.includes(action)
        ? prev.allowedActions.filter((a) => a !== action)
        : [...prev.allowedActions, action],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dailyBudgetUsd: parseFloat(formData.dailyBudgetUsd),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update policy')
      }

      router.push(`/policies/${policyId}`)
      router.refresh()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href={`/policies/${policyId}`}
            className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block"
          >
            ← Back to Policy
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Edit Policy
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="agentId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Agent Name
              </label>
              <input
                id="agentId"
                type="text"
                required
                value={formData.agentId}
                onChange={(e) =>
                  setFormData({ ...formData, agentId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., rebalance-bot-1"
              />
            </div>

            <div>
              <label
                htmlFor="dailyBudgetUsd"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Daily Budget (USD)
              </label>
              <input
                id="dailyBudgetUsd"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.dailyBudgetUsd}
                onChange={(e) =>
                  setFormData({ ...formData, dailyBudgetUsd: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="100.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Tokens
              </label>
              <div className="space-y-2">
                {['USDC', 'WETH'].map((token) => (
                  <label key={token} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allowedTokens.includes(token)}
                      onChange={() => handleTokenChange(token)}
                      className="mr-2"
                    />
                    <span>{token}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Protocols
              </label>
              <div className="space-y-2">
                {['uniswap_v3'].map((protocol) => (
                  <label key={protocol} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allowedProtocols.includes(protocol)}
                      onChange={() => handleProtocolChange(protocol)}
                      className="mr-2"
                    />
                    <span>Uniswap v3</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Actions
              </label>
              <div className="space-y-2">
                {['swap'].map((action) => (
                  <label key={action} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allowedActions.includes(action)}
                      onChange={() => handleActionChange(action)}
                      className="mr-2"
                    />
                    <span>Swap</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="expiryHours"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Expiry (hours from now)
              </label>
              <input
                id="expiryHours"
                type="number"
                required
                min="1"
                value={formData.expiryHours}
                onChange={(e) =>
                  setFormData({ ...formData, expiryHours: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Policy'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

