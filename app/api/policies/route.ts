import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { createAgentWallet } from '@/lib/cdp'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const policies = await db.policy.findMany({
      where: { userId: user.id },
      include: {
        actionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(policies)
  } catch (error) {
    console.error('Error fetching policies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      agentId,
      dailyBudgetUsd,
      allowedTokens,
      allowedProtocols,
      allowedActions,
      expiryHours,
    } = body

    // Validate required fields
    if (
      !agentId ||
      !dailyBudgetUsd ||
      !allowedTokens ||
      !allowedProtocols ||
      !allowedActions ||
      !expiryHours
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + parseInt(expiryHours))

    // Create policy
    const policy = await db.policy.create({
      data: {
        userId: user.id,
        agentId,
        dailyBudgetUsd: parseFloat(dailyBudgetUsd),
        allowedTokens: JSON.stringify(allowedTokens),
        allowedProtocols: JSON.stringify(allowedProtocols),
        allowedActions: JSON.stringify(allowedActions),
        expiresAt,
      },
    })

    // Create CDP Server Wallet for this agent/policy
    try {
      const agentWallet = await createAgentWallet(
        `agent-${agentId}-${policy.id}`
      )
      
      // Update policy with agent wallet ID
      const updatedPolicy = await db.policy.update({
        where: { id: policy.id },
        data: { agentWalletId: agentWallet.id },
      })

      return NextResponse.json(updatedPolicy, { status: 201 })
    } catch (walletError) {
      console.error('Error creating agent wallet:', walletError)
      // Policy was created but wallet creation failed
      // In production, you might want to delete the policy or handle this differently
      return NextResponse.json(
        {
          error: 'Policy created but failed to create agent wallet',
          policy,
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Error creating policy:', error)
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    )
  }
}

