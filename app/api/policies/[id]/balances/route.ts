import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTokenBalances } from '@/lib/cdp'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle both Promise and direct params (Next.js 14+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const policyId = resolvedParams.id
    
    if (!policyId) {
      console.error(`[API] ❌ policyId is undefined!`)
      console.error(`[API] Params:`, resolvedParams)
      return NextResponse.json(
        { error: 'Policy ID is required' },
        { status: 400 }
      )
    }
    console.log(`[API] ========================================`)
    console.log(`[API] Balance request for policy ${policyId}`)
    console.log(`[API] User ID: ${user.id}`)
    console.log(`[API] Requested Policy ID: ${policyId}`)

    // First, let's check what policies exist for this user
    const allUserPolicies = await db.policy.findMany({
      where: { userId: user.id },
      select: { id: true, agentId: true, agentWalletId: true },
    })
    console.log(`[API] User has ${allUserPolicies.length} policies:`)
    allUserPolicies.forEach(p => {
      console.log(`[API]   - Policy ${p.id.slice(0, 8)}... | Agent: ${p.agentId} | Wallet: ${p.agentWalletId?.slice(0, 10)}...`)
    })

    // Verify policy belongs to user
    const policy = await db.policy.findFirst({
      where: {
        id: policyId,
        userId: user.id,
      },
    })

    if (!policy) {
      console.log(`[API] ❌ Policy ${policyId} not found for user ${user.id}`)
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    console.log(`[API] Found policy:`)
    console.log(`[API]   Policy ID: ${policy.id}`)
    console.log(`[API]   Agent ID: ${policy.agentId}`)
    console.log(`[API]   Wallet: ${policy.agentWalletId}`)
    console.log(`[API]   Requested ID: ${policyId}`)
    console.log(`[API]   Match: ${policy.id === policyId ? 'YES ✓' : 'NO ✗'}`)

    if (!policy.agentWalletId) {
      console.log(`[API] Policy ${policyId} has no agentWalletId`)
      return NextResponse.json(
        { error: 'Agent wallet not created yet' },
        { status: 400 }
      )
    }

    // CRITICAL: Verify policy ID matches
    if (policy.id !== policyId) {
      console.error(`[API] ❌ CRITICAL: Policy ID mismatch!`)
      console.error(`[API] Expected: ${policyId}`)
      console.error(`[API] Got: ${policy.id}`)
      console.error(`[API] This should never happen with findFirst query!`)
      return NextResponse.json(
        { 
          error: 'Policy ID mismatch',
          message: `Expected policy ${policyId} but got ${policy.id}`,
          requestedId: policyId,
          actualId: policy.id,
        },
        { status: 500 }
      )
    }

    // Get token balances
    const balances = await getTokenBalances({
      address: policy.agentWalletId,
    })

    console.log(`[API] Found ${balances.length} token balances`)
    console.log(`[API] Balances:`, balances.map(b => `${b.symbol}: ${b.amount}`).join(', '))

    return NextResponse.json({
      success: true,
      balances,
      walletAddress: policy.agentWalletId,
    })
  } catch (error: unknown) {
    console.error('Error fetching balances:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Failed to fetch balances',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

