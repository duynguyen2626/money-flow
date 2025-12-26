
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
        <div
            className={cn(
                "border border-slate-200 rounded-lg transition-colors text-base relative overflow-hidden shadow-sm",
                isSelected ? "bg-blue-50 border-blue-200" : "bg-white",
                "active:scale-[0.99] transition-transform duration-100"
            )}
            onClick={() => onRowClick && onRowClick(txn)}
        >
            <MobileRecordRow
                {...recordProps}
                checkbox={{
                    checked: isSelected,
                    onChange: (checked) => onSelect(txn.id, checked),
                    ariaLabel: "Select transaction",
                }}
                className="px-3 py-3 w-full"
            />
        </div>
    );
}
