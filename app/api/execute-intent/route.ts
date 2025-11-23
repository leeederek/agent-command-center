import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { executeSwap } from '@/lib/cdp'
import { ActionStatus } from '@prisma/client'

interface ExecuteIntentRequest {
  policyId: string
  agentId: string
  source?: string
  action: string
  amountUsd: number
  protocol: string
  tokenIn: string
  tokenOut: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteIntentRequest = await request.json()
    const {
      policyId,
      agentId,
      source = 'local-demo',
      action,
      amountUsd,
      protocol,
      tokenIn,
      tokenOut,
    } = body

    // Load policy
    const policy = await db.policy.findUnique({
      where: { id: policyId },
    })

    if (!policy) {
      const log = await db.agentActionLog.create({
        data: {
          policyId,
          agentId,
          status: ActionStatus.BLOCKED,
          summary: `Action blocked: Policy not found`,
          reason: `Policy with ID ${policyId} does not exist`,
          rawRequest: JSON.stringify(body),
          source,
        },
      })

      return NextResponse.json(
        { allowed: false, reason: 'Policy not found', logId: log.id },
        { status: 403 }
      )
    }

    // Validation checks
    const validationErrors: string[] = []

    // 1. Verify agentId matches
    if (policy.agentId !== agentId) {
      validationErrors.push(
        `Agent ID mismatch: expected ${policy.agentId}, got ${agentId}`
      )
    }

    // 2. Check expiry
    if (new Date() >= policy.expiresAt) {
      validationErrors.push(`Policy expired at ${policy.expiresAt}`)
    }

    // 3. Calculate daily budget remaining
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setUTCHours(23, 59, 59, 999)

    // Calculate daily budget spent from rawRequest JSON
    // Note: In production, consider adding amountUsd field to AgentActionLog model for better performance
    // In production, add amountUsd field to AgentActionLog model
    const todayLogs = await db.agentActionLog.findMany({
      where: {
        policyId: policy.id,
        status: ActionStatus.ALLOWED,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    let totalSpentToday = 0
    for (const log of todayLogs) {
      try {
        const requestData = JSON.parse(log.rawRequest) as ExecuteIntentRequest
        totalSpentToday += requestData.amountUsd || 0
      } catch {
        // Ignore parse errors
      }
    }

    const remainingBudget = policy.dailyBudgetUsd - totalSpentToday
    if (amountUsd > remainingBudget) {
      validationErrors.push(
        `Insufficient daily budget: requested ${amountUsd}, remaining ${remainingBudget.toFixed(2)}`
      )
    }

    // 4. Validate protocol
    const allowedProtocols = JSON.parse(policy.allowedProtocols) as string[]
    if (!allowedProtocols.includes(protocol)) {
      validationErrors.push(
        `Protocol not allowed: ${protocol}. Allowed: ${allowedProtocols.join(', ')}`
      )
    }

    // 5. Validate action
    const allowedActions = JSON.parse(policy.allowedActions) as string[]
    if (!allowedActions.includes(action)) {
      validationErrors.push(
        `Action not allowed: ${action}. Allowed: ${allowedActions.join(', ')}`
      )
    }

    // 6. Validate tokens
    const allowedTokens = JSON.parse(policy.allowedTokens) as string[]
    if (!allowedTokens.includes(tokenIn)) {
      validationErrors.push(
        `Token not allowed: ${tokenIn}. Allowed: ${allowedTokens.join(', ')}`
      )
    }
    if (!allowedTokens.includes(tokenOut)) {
      validationErrors.push(
        `Token not allowed: ${tokenOut}. Allowed: ${allowedTokens.join(', ')}`
      )
    }

    // If validation failed, log and return 403
    if (validationErrors.length > 0) {
      const log = await db.agentActionLog.create({
        data: {
          policyId: policy.id,
          agentId,
          status: ActionStatus.BLOCKED,
          summary: `Action blocked: ${validationErrors[0]}`,
          reason: validationErrors.join('; '),
          rawRequest: JSON.stringify(body),
          source,
        },
      })

      return NextResponse.json(
        {
          allowed: false,
          reason: validationErrors.join('; '),
          logId: log.id,
        },
        { status: 403 }
      )
    }

    // All validations passed - execute the trade
    if (!policy.agentWalletId) {
      const log = await db.agentActionLog.create({
        data: {
          policyId: policy.id,
          agentId,
          status: ActionStatus.BLOCKED,
          summary: 'Action blocked: Agent wallet not configured',
          reason: 'Policy does not have an associated agent wallet',
          rawRequest: JSON.stringify(body),
          source,
        },
      })

      return NextResponse.json(
        {
          allowed: false,
          reason: 'Agent wallet not configured',
          logId: log.id,
        },
        { status: 403 }
      )
    }

    try {
      // Execute swap via CDP Trade API
      const txResult = await executeSwap({
        walletId: policy.agentWalletId,
        fromAsset: tokenIn,
        toAsset: tokenOut,
        amountUsd: amountUsd,
      })

      // Log successful action
      const log = await db.agentActionLog.create({
        data: {
          policyId: policy.id,
          agentId,
          status: ActionStatus.ALLOWED,
          summary: `Swap executed: ${amountUsd} USD ${tokenIn} → ${tokenOut}`,
          reason: 'All validation checks passed',
          rawRequest: JSON.stringify(body),
          source,
        },
      })

      return NextResponse.json({
        allowed: true,
        txId: txResult.txId || 'pending',
        logId: log.id,
      })
    } catch (tradeError: unknown) {
      // Trade execution failed
      const errorMessage = tradeError instanceof Error ? tradeError.message : 'Unknown error'
      const log = await db.agentActionLog.create({
        data: {
          policyId: policy.id,
          agentId,
          status: ActionStatus.BLOCKED,
          summary: 'Action blocked: Trade execution failed',
          reason: `CDP Trade API error: ${errorMessage}`,
          rawRequest: JSON.stringify(body),
          source,
        },
      })

      return NextResponse.json(
        {
          allowed: false,
          reason: `Trade execution failed: ${errorMessage}`,
          logId: log.id,
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Error executing intent:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to execute intent', message: errorMessage },
      { status: 500 }
    )
  }
}

