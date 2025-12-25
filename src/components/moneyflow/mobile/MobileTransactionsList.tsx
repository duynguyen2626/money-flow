
import { Table, TableBody } from "@/components/ui/table"
import { Category, TransactionWithDetails } from "@/types/moneyflow.types"
import { MobileTransactionRow } from "../mobile-transaction-row"

// Used by UnifiedTransactionTable to render mobile list view
// Maps transactions to MobileTransactionRow
interface MobileTransactionsListProps {
    transactions: TransactionWithDetails[]
    categories: Category[]
    selectedTxnIds: Set<string>
    onSelectTxn: (id: string, selected: boolean) => void
    onRowClick?: (txn: TransactionWithDetails) => void
    formatters: {
        currency: (val: number) => string
        date: (date: string | number | Date) => string
    }
}

export function MobileTransactionsList({
    transactions,
    categories,
    selectedTxnIds,
    onSelectTxn,
    onRowClick,
    formatters,
}: MobileTransactionsListProps) {
    if (!transactions.length) {
        return (
            <div className="p-4 text-center text-slate-500 text-sm">
                No transactions found
            </div>
        )
    }

    return (
        <div className="block md:hidden">
            <Table>
                <TableBody>
                    {transactions.map((txn) => (
                        <MobileTransactionRow
                            key={txn.id}
                            txn={txn}
                            categories={categories}
                            isSelected={selectedTxnIds.has(txn.id)}
                            onSelect={onSelectTxn}
                            onRowClick={onRowClick}
                            colSpan={1}
                            formatters={formatters}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
