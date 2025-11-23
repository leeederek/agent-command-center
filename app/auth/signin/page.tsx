'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const [cdpWalletId, setCdpWalletId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        cdpWalletId,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/')
        router.refresh()
      } else {
        alert('Sign in failed. Please check your CDP Wallet ID.')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      alert('An error occurred during sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in with CDP Wallet
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your CDP Wallet ID to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="cdpWalletId" className="block text-sm font-medium text-gray-700">
              CDP Wallet ID
            </label>
            <input
              id="cdpWalletId"
              name="cdpWalletId"
              type="text"
              required
              value={cdpWalletId}
              onChange={(e) => setCdpWalletId(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter your CDP Wallet ID"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

