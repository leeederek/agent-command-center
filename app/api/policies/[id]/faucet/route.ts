import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { requestFaucet } from '@/lib/cdp'
import { CDP_NETWORK } from '@/lib/cdp'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const policyId = resolvedParams.id
    const body = await request.json()

    // Verify policy belongs to user
    const policy = await db.policy.findFirst({
      where: {
        id: policyId,
        userId: user.id,
      },
    })

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    if (!policy.agentWalletId) {
      return NextResponse.json(
        { error: 'Agent wallet not created yet' },
        { status: 400 }
      )
    }

    const { token = 'eth' } = body

    // Request faucet funds
    const result = await requestFaucet({
      address: policy.agentWalletId,
      network: (CDP_NETWORK as 'base-sepolia' | 'ethereum-sepolia') || 'base-sepolia',
      token: token.toLowerCase() as 'eth' | 'usdc' | 'eurc' | 'cbbtc',
    })

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      message: `Faucet request successful. Transaction: ${result.transactionHash}`,
    })
  } catch (error: unknown) {
    console.error('Error requesting faucet:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Failed to request faucet',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

