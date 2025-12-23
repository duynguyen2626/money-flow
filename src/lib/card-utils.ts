import { Account } from "@/types/moneyflow.types"
import { getCreditCardUsage } from "@/lib/account-balance"

// Helper types for the state
export type CardActionState = {
    section: 'action_required' | 'credit_card' | 'other'
    badges: {
        due: { days: number, date: string } | null
        spend: boolean
        standalone: boolean
        pendingBatch: boolean
    }
    priorities: {
        daysUntilDue: number
        missingSpend: number
        sortOrder: number // Derived sort score for consistent ordering
    }
    dueText: string | null
    spendText: string | null
}

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function getCardActionState(account: Account, hasPendingBatch: boolean = false): CardActionState {
    // Defaults
    const result: CardActionState = {
        section: 'other',
        badges: { due: null, spend: false, standalone: false, pendingBatch: false },
        priorities: { daysUntilDue: 999, missingSpend: 0, sortOrder: 0 },
        dueText: null,
        spendText: null,
    }

    // 1. Identify Account Type
    if (['bank', 'ewallet', 'cash'].includes(account.type)) {
        result.section = 'other' // Payment
        result.badges.pendingBatch = hasPendingBatch
        if (hasPendingBatch) {
            result.section = 'action_required'
            result.priorities.sortOrder = 11000 // Tier 3: Pending Batch
        }
        return result
    }
    if (['savings', 'investment', 'asset'].includes(account.type)) {
        result.section = 'other' // Savings
        result.badges.pendingBatch = hasPendingBatch
        if (hasPendingBatch) {
            result.section = 'action_required'
            result.priorities.sortOrder = 11000 // Tier 3: Pending Batch
        }
        return result
    }
    if (account.type === 'debt') {
        result.section = 'other' // Debt
        result.badges.pendingBatch = hasPendingBatch
        if (hasPendingBatch) {
            result.section = 'action_required'
            result.priorities.sortOrder = 11000 // Tier 3: Pending Batch
        }
        return result
    }

    // 2. Logic for Credit Cards
    if (account.type === 'credit_card') {
        const stats = account.stats
        const limit = account.credit_limit ?? 0
        const usage = getCreditCardUsage(account)
        const debt = usage.used

        // --- Time State ---
        const daysUntilDue = getDaysUntilDueFromStats(stats)
        result.priorities.daysUntilDue = daysUntilDue

        const isDueSoon = daysUntilDue <= 35 && debt > 0 // Show for next month cycle too
        result.dueText = isDueSoon && stats?.due_date_display ? `Due: ${stats.due_date_display}` : null
        result.badges.due = isDueSoon ? {
            days: daysUntilDue,
            date: stats?.due_date_display || 'Due Soon'
        } : null

        // --- Spend State ---
        const minSpend = stats?.min_spend ?? 0
        const missing = stats?.missing_for_min ?? 0
        const needsSpendMore = minSpend > 0 && missing > 0

        result.priorities.missingSpend = missing
        result.spendText = needsSpendMore ? `Need: ${numberFormatter.format(missing)}` : null
        result.badges.spend = needsSpendMore

        // --- Pending Batch State ---
        result.badges.pendingBatch = hasPendingBatch

        // --- Sectioning Decision ---
        // Rule: Action Required if (Due Soon) OR (Needs Spend More) OR (Has Pending Batch)
        if (isDueSoon || needsSpendMore || hasPendingBatch) {
            result.section = 'action_required'

            // Calculate Sort Order for Action Required
            // Logic: Due Soon cards first (Tier 1), then Need Spend (Tier 2), then Pending Batch (Tier 3)
            // We use a "Sort Score" where smaller is better (appearing first)

            let score = 0

            if (isDueSoon) {
                // Tier 1: Range 0 - 1000: Due soon priority
                // Days 0 -> Score 0
                // Days 10 -> Score 10 
                score = Math.max(0, daysUntilDue)
            } else if (needsSpendMore) {
                // Tier 2: Range 2000-10000: Spend priority
                // We want Higher Missing Spend to appear first.
                // Let's map Missing Spend inversely.
                // missing 10M -> score 2000
                // missing 1M -> score 3000
                // Max missing reasonable ~ 100M
                score = 10000 - Math.min(8000, (missing / 1000))
            } else if (hasPendingBatch) {
                // Tier 3: Range 11000+: Pending Batch priority
                score = 11000
            }

            result.priorities.sortOrder = score

        } else {
            result.section = 'credit_card'
            result.priorities.sortOrder = daysUntilDue // Standard sort by due date
        }

        // --- Standalone Badge Logic ---
        // Show if NOT Action Required (implicit, but sometimes nice to show explicit card type?)
        // Actually the requirement is "Fix the Standalone badge: Show only for Credit Card types".
        // Previously logic was "!showParentBadge && !showChildBadge && isCreditCard"
        // We assume the caller handles parent/child checks, but for 'standalone' specifically:
        // It implies it's a credit card that is NOT Action Required? Or just a credit card? 
        // The previous code showed it for ALL credit cards that weren't parent/child.
        // Let's keep that logic in the view, here we just flag it as appropriate.
        // However, we can prep the flag.

        // Check both parent_account_id column and relationships for consistency
        const isChild = !!account.parent_account_id || !!account.relationships?.parent_info
        const isParent = (account.relationships?.child_count ?? 0) > 0 || account.relationships?.is_parent

        result.badges.standalone = !isParent && !isChild
    }

    return result
}

function getDaysUntilDueFromStats(stats: any): number {
    if (!stats?.due_date_display) return 999

    const now = new Date()
    const currentYear = now.getFullYear()
    let dueDate: Date | null = null

    // Try parsing "MMM DD" format (e.g., "Dec 15")
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const mmmDdMatch = stats.due_date_display.match(/^([A-Za-z]{3})\s+(\d{1,2})$/)

    if (mmmDdMatch) {
        const monthName = mmmDdMatch[1]
        const day = parseInt(mmmDdMatch[2])
        const monthIndex = monthNames.indexOf(monthName)

        if (monthIndex !== -1) {
            dueDate = new Date(currentYear, monthIndex, day)
        }
    } else {
        // Try parsing "DD-MM" format (e.g., "15-12")
        const parts = stats.due_date_display.split('-')
        if (parts.length === 2) {
            const day = parseInt(parts[0])
            const month = parseInt(parts[1])
            dueDate = new Date(currentYear, month - 1, day)
        }
    }

    if (!dueDate) return 999

    // If due date is in the past (more than 1 day ago), assume it's next year's cycle
    if (dueDate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        dueDate.setFullYear(currentYear + 1)
    }

    const diffTime = dueDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
