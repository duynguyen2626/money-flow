import { describe, it, expect } from 'vitest'
import { filterTransactionByType, FilterType } from '../transaction-filters'
import { TransactionWithDetails } from '@/types/moneyflow.types'

// Helper to create mock transactions
const createTxn = (overrides: Partial<TransactionWithDetails>): TransactionWithDetails => ({
    id: 'txn-1',
    amount: 100,
    type: 'expense',
    created_at: '2024-01-01',
    description: 'Test',
    ...overrides
} as any)

describe('filterTransactionByType', () => {
    describe('LEND filter', () => {
        it('should include debt transactions with negative amount', () => {
            const txn = createTxn({ type: 'debt', amount: -50 })
            expect(filterTransactionByType(txn, 'lend')).toBe(true)
        })

        it('should EXCLUDE debt transactions with positive amount', () => {
            const txn = createTxn({ type: 'debt', amount: 50 })
            expect(filterTransactionByType(txn, 'lend')).toBe(false)
        })

        it('should EXCLUDE expense transactions with person (modified logic)', () => {
            // User requested to exclude expenses even if they have person
            const txn = createTxn({ type: 'expense', amount: 50, person_id: 'p1', displayType: 'expense' })
            expect(filterTransactionByType(txn, 'lend')).toBe(false)
        })
    })

    describe('REPAY filter', () => {
        it('should include repayment transactions', () => {
            const txn = createTxn({ type: 'repayment', amount: 50 })
            expect(filterTransactionByType(txn, 'repay')).toBe(true)
        })

        it('should include debt transactions with positive amount', () => {
            const txn = createTxn({ type: 'debt', amount: 50 })
            expect(filterTransactionByType(txn, 'repay')).toBe(true)
        })

        it('should include income transactions with person', () => {
            const txn = createTxn({ type: 'income', amount: 50, person_id: 'p1', displayType: 'income' })
            expect(filterTransactionByType(txn, 'repay')).toBe(true)
        })
    })

    describe('CASHBACK filter', () => {
        it('should include transaction with cashback_share_amount', () => {
            const txn = createTxn({ amount: 100, cashback_share_amount: 5 })
            expect(filterTransactionByType(txn, 'cashback')).toBe(true)
        })

        it('should include transaction with cashback_share_percent', () => {
            const txn = createTxn({ amount: 100, cashback_share_percent: 0.1 }) // 10%
            expect(filterTransactionByType(txn, 'cashback')).toBe(true)
        })

        it('should include income transaction with "cashback" in note', () => {
            const txn = createTxn({ type: 'income', amount: 10, note: 'Credit Card Cashback' })
            expect(filterTransactionByType(txn, 'cashback')).toBe(true)
        })

        it('should include transaction where amount > final_price', () => {
            const txn = createTxn({ amount: 100, final_price: 90 }) // 10 cashback
            expect(filterTransactionByType(txn, 'cashback')).toBe(true)
        })

        it('should EXCLUDE transaction with no cashback', () => {
            const txn = createTxn({ amount: 100 })
            expect(filterTransactionByType(txn, 'cashback')).toBe(false)
        })
    })

    describe('Basic filters', () => {
        it('should match income', () => {
            const txn = createTxn({ type: 'income', displayType: 'income' })
            expect(filterTransactionByType(txn, 'income')).toBe(true)
        })

        it('should match expense', () => {
            const txn = createTxn({ type: 'expense', displayType: 'expense' })
            expect(filterTransactionByType(txn, 'expense')).toBe(true)
        })
    })
})
