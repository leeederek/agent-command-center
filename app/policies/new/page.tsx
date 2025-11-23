'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function NewPolicyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    agentId: '',
    dailyBudgetUsd: '',
    allowedTokens: [] as string[],
    allowedProtocols: [] as string[],
    allowedActions: [] as string[],
    expiryHours: '24',
  })

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
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
      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dailyBudgetUsd: parseFloat(formData.dailyBudgetUsd),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create policy')
      }

      const policy = await response.json()
      router.push('/')
      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Create New Policy
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
                Expiry
              </label>
              <select
                id="expiryHours"
                value={formData.expiryHours}
                onChange={(e) =>
                  setFormData({ ...formData, expiryHours: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Policy'}
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

