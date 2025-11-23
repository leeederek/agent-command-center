'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchPolicies()
    }
  }, [status, router])

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/policies')
      if (response.ok) {
        const data = await response.json()
        setPolicies(data)
      }
    } catch (error) {
      console.error('Error fetching policies:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDailySpent = async (policyId: string) => {
    // This would ideally be calculated server-side, but for now we'll show 0
    // In production, add an API endpoint to calculate this
    return 0
  }

  const getStatus = (expiresAt: string) => {
    return new Date(expiresAt) > new Date() ? 'Active' : 'Expired'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Agent Permissions Dashboard
          </h1>
          <div className="flex gap-4">
            <span className="text-sm text-gray-600">
              Wallet: {session?.user?.cdpWalletId?.slice(0, 10)}...
            </span>
            <Link
              href="/policies/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Create New Policy
            </Link>
          </div>
        </div>

        {policies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No policies found.</p>
            <Link
              href="/policies/new"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Create your first policy →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => {
              const allowedTokens = JSON.parse(policy.allowedTokens) as string[]
              const status = getStatus(policy.expiresAt)
              return (
                <div
                  key={policy.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {policy.agentId}
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">ID: {policy.id.slice(0, 8)}...</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Daily Budget:</span>{' '}
                      ${policy.dailyBudgetUsd.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Expires:</span>{' '}
                      {formatDate(policy.expiresAt)}
                    </div>
                    <div>
                      <span className="font-medium">Tokens:</span>{' '}
                      {allowedTokens.join(', ')}
                    </div>
                    {policy.agentWalletId ? (
                      <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded" title={`Full address: ${policy.agentWalletId}`}>
                        <span className="font-medium text-gray-700">Wallet:</span>{' '}
                        {policy.agentWalletId.slice(0, 8)}...{policy.agentWalletId.slice(-8)}
                      </div>
                    ) : (
                      <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        No wallet created
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/policies/${policy.id}`}
                      className="flex-1 text-center bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 text-sm"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/policies/${policy.id}/activity`}
                      className="flex-1 text-center bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 text-sm"
                    >
                      Activity
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
