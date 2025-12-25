
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Category, TransactionWithDetails } from "@/types/moneyflow.types"
import { MobileRecordRow } from "@/components/app/mobile/MobileRecordRow"
import { transactionToMobileRecordRow } from "@/components/moneyflow/mappers/transactionToMobileRecordRow"

// Props Interface
interface MobileTransactionRowProps {
    txn: TransactionWithDetails;
    categories: Category[];
    isSelected: boolean;
    onSelect: (id: string, checked: boolean) => void;
    onRowClick?: (txn: TransactionWithDetails) => void;
    colSpan: number;
    formatters: {
        currency: (val: number) => string;
    };
}

export function MobileTransactionRow({
    txn,
    categories,
    isSelected,
    onSelect,
    onRowClick,
    colSpan,
    formatters
}: MobileTransactionRowProps) {
    const recordProps = transactionToMobileRecordRow({
        txn,
        categories,
        formatCurrency: formatters.currency,
    })

    return (
        <TableRow
            className={cn(
                "border-b border-slate-200 transition-colors text-base relative",
                isSelected ? "bg-blue-50" : "bg-white"
            )}
            onClick={() => onRowClick && onRowClick(txn)}
        >
            <TableCell className="p-0 align-top" colSpan={colSpan}>
                <MobileRecordRow
                    {...recordProps}
                    checkbox={{
                        checked: isSelected,
                        onChange: (checked) => onSelect(txn.id, checked),
                        ariaLabel: "Select transaction",
                    }}
                    className="px-3 py-3 w-full max-w-[calc(100vw-2rem)] sm:max-w-full"
                />
            </TableCell>
        </TableRow>
    );
}
