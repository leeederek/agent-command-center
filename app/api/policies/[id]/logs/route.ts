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

    const logs = await db.agentActionLog.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

