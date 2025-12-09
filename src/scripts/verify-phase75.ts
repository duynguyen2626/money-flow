import { getMinSpendStatus } from '@/lib/cashback'

type Scenario = {
  spends: number[]
  expectedRemaining: number
  expectedMet: boolean
  label: string
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const MIN_SPEND_TARGET = 10_000_000

const scenarios: Scenario[] = [
  {
    label: 'Single spend 3tr',
    spends: [3_000_000],
    expectedRemaining: 7_000_000,
    expectedMet: false,
  },
  {
    label: 'Spend 3tr + 8tr',
    spends: [3_000_000, 8_000_000],
    expectedRemaining: 0,
    expectedMet: true,
  },
]

function runScenario(scenario: Scenario) {
  const totalSpend = scenario.spends.reduce((sum, value) => sum + value, 0)
  const status = getMinSpendStatus(totalSpend, MIN_SPEND_TARGET)

  const matchesRemaining = status.remaining === scenario.expectedRemaining
  const matchesState = status.isTargetMet === scenario.expectedMet
  const passed = matchesRemaining && matchesState

  console.log(`\n[${passed ? 'PASS' : 'FAIL'}] ${scenario.label}`)
  console.log(`  Total spent: ${currencyFormatter.format(status.spent)}`)
  console.log(`  Remaining:  ${currencyFormatter.format(status.remaining)} (expected ${currencyFormatter.format(scenario.expectedRemaining)})`)
  console.log(`  Target met: ${status.isTargetMet} (expected ${scenario.expectedMet})`)

  return passed
}

function main() {
  console.log('Running Phase 75 cashback min-spend checks...')
  let allPassed = true

  for (const scenario of scenarios) {
    const passed = runScenario(scenario)
    if (!passed) {
      allPassed = false
    }
  }

  if (!allPassed) {
    console.error('\n❌ Phase 75 verification failed')
    process.exit(1)
  }

  console.log('\n✅ Phase 75 verification passed for all scenarios')
}

main()
