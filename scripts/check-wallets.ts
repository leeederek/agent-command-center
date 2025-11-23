import { db } from '../lib/db'

async function checkWallets() {
  const policies = await db.policy.findMany({
    select: {
      id: true,
      agentId: true,
      agentWalletId: true,
    },
  })

  console.log('\n=== Policy Wallet Check ===\n')
  console.log(`Total policies: ${policies.length}\n`)

  const walletCounts = new Map<string, number>()
  policies.forEach((p) => {
    if (p.agentWalletId) {
      walletCounts.set(p.agentWalletId, (walletCounts.get(p.agentWalletId) || 0) + 1)
    }
  })

  console.log('Wallet address distribution:')
  walletCounts.forEach((count, wallet) => {
    console.log(`  ${wallet}: ${count} policy/policies`)
  })

  console.log('\nPolicies with same wallet:')
  const duplicateWallets = Array.from(walletCounts.entries()).filter(([, count]) => count > 1)
  if (duplicateWallets.length > 0) {
    duplicateWallets.forEach(([wallet, count]) => {
      const policiesWithWallet = policies.filter((p) => p.agentWalletId === wallet)
      console.log(`\n  Wallet ${wallet} is used by ${count} policies:`)
      policiesWithWallet.forEach((p) => {
        console.log(`    - Policy ${p.id} (Agent: ${p.agentId})`)
      })
    })
  } else {
    console.log('  No duplicate wallets found!')
  }

  console.log('\nPolicies without wallets:')
  const noWallet = policies.filter((p) => !p.agentWalletId)
  if (noWallet.length > 0) {
    noWallet.forEach((p) => {
      console.log(`  - Policy ${p.id} (Agent: ${p.agentId})`)
    })
  } else {
    console.log('  All policies have wallets!')
  }

  await db.$disconnect()
}

checkWallets().catch(console.error)

