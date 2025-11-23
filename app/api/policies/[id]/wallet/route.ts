import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { createAgentWallet } from '@/lib/cdp'

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

    if (policy.agentWalletId) {
      // Wallet already exists - return success with existing wallet ID
      return NextResponse.json({
        success: true,
        agentWalletId: policy.agentWalletId,
        message: 'Wallet already exists',
        alreadyExists: true,
      })
    }

    // Create CDP Server Wallet for this agent/policy
    const agentWallet = await createAgentWallet(
      `agent-${policy.agentId}-${policy.id}`
    )

    // Update policy with agent wallet ID
    const updatedPolicy = await db.policy.update({
      where: { id: policy.id },
      data: { agentWalletId: agentWallet.id },
    })

    return NextResponse.json({
      success: true,
      agentWalletId: updatedPolicy.agentWalletId,
      message: 'Wallet created successfully',
    })
  } catch (error: any) {
    console.error('Error creating wallet:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    })
    return NextResponse.json(
      {
        error: 'Failed to create wallet',
        message: error.message || 'Unknown error',
        details: error.cause?.message || error.stack || 'No additional details',
      },
      { status: 500 }
    )
  }
}

