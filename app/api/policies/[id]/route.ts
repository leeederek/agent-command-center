import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
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
    console.log(`[API] Fetching policy ${policyId} for user ${user.id}`)

    // First check if policy exists at all
    const policyExists = await db.policy.findUnique({
      where: { id: policyId },
      select: { id: true, userId: true },
    })

    if (!policyExists) {
      console.log(`[API] Policy ${policyId} does not exist in database`)
      return NextResponse.json(
        { error: 'Policy not found', policyId },
        { status: 404 }
      )
    }

    if (policyExists.userId !== user.id) {
      console.log(`[API] Policy ${policyId} belongs to different user. Policy userId: ${policyExists.userId}, Current userId: ${user.id}`)
      return NextResponse.json(
        { error: 'Policy not found or access denied', policyId },
        { status: 404 }
      )
    }

    const policy = await db.policy.findFirst({
      where: {
        id: policyId,
        userId: user.id,
      },
    })

    if (!policy) {
      console.log(`[API] Policy ${policyId} not found for user ${user.id}`)
      return NextResponse.json(
        { error: 'Policy not found', policyId },
        { status: 404 }
      )
    }

    return NextResponse.json(policy)
  } catch (error) {
    console.error('Error fetching policy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete policy (cascade will delete related logs)
    await db.policy.delete({
      where: { id: policyId },
    })

    return NextResponse.json({ success: true, message: 'Policy deleted successfully' })
  } catch (error) {
    console.error('Error deleting policy:', error)
    return NextResponse.json(
      { error: 'Failed to delete policy', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Update policy
    const updatedPolicy = await db.policy.update({
      where: { id: policyId },
      data: {
        agentId,
        dailyBudgetUsd: parseFloat(dailyBudgetUsd),
        allowedTokens: JSON.stringify(allowedTokens),
        allowedProtocols: JSON.stringify(allowedProtocols),
        allowedActions: JSON.stringify(allowedActions),
        expiresAt,
      },
    })

    return NextResponse.json(updatedPolicy)
  } catch (error) {
    console.error('Error updating policy:', error)
    return NextResponse.json(
      { error: 'Failed to update policy', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

