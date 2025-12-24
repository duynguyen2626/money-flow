
import {
    Clock,
    Wallet,
    ShoppingBasket,
    RefreshCcw,
    Ban,
    CheckCircle2,
    FileText
} from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TransactionWithDetails } from "@/types/moneyflow.types";
import { Category, Account } from "@/types/moneyflow.types";
import { CustomTooltip } from "@/components/ui/custom-tooltip";
import Link from "next/link";

// Props Interface
interface MobileTransactionRowProps {
    txn: TransactionWithDetails;
    accounts: Account[];
    categories: Category[];
    isSelected: boolean;
    isExcelMode: boolean;
    onSelect: (id: string, checked: boolean) => void;
    onRowClick?: (txn: TransactionWithDetails) => void;
    formatters: {
        currency: (val: number) => string;
    };
    helpers: {
        parseCashbackConfig: (config: any) => any;
        getCashbackCycleRange: (config: any, date: Date) => any;
    };
}

export function MobileTransactionRow({
    txn,
    categories,
    isSelected,
    onSelect,
    onRowClick,
    formatters
}: MobileTransactionRowProps) {
    // Helper to resolve entity (Account/Person)
    const resolveEntity = () => {
        // ... logic from UnifiedTransactionTable for entity resolution ...
        // Simplified for mobile: Just show Source -> Target or Account
        const sourceName = txn.source_name || txn.account_name || 'Unknown';
        const sourceImage = txn.source_image;

        // Logic to determine main icon (Shop or Account)
        const displayImage = txn.shop_image_url || txn.source_image;
        const displayName = txn.shop_name || txn.note || sourceName;

        return { displayImage, displayName };
    };

    const { displayImage, displayName } = resolveEntity();

    // --- Status Logic (Polite Copy) ---
    let statusIndicator = null;
    let statusTooltip = "";

    // Polyfill effectiveStatus as txn.status
    const effectiveStatus = txn.status;
    const isVoided = effectiveStatus === 'void';
    const meta = (txn.metadata as any) || {};
    const isRefundConfirmation = meta?.is_refund_confirmation === true;
    const metaRefundStatus = meta?.refund_status;

    const statusBadgeStyle = "flex items-center justify-center rounded-full p-0.5 w-3.5 h-3.5 transition-colors border";

    if (isVoided) {
        statusIndicator = <Ban className="h-3 w-3 text-slate-400" />;
        statusTooltip = "Voided";
    } else if (effectiveStatus === 'pending') {
        statusIndicator = (
            <div className={cn(statusBadgeStyle, "bg-amber-100 border-amber-300 text-amber-700")}>
                <Clock className="h-2.5 w-2.5" />
            </div>
        );
        statusTooltip = "Pending Refund";
    } else if (effectiveStatus === 'waiting_refund' || metaRefundStatus === 'waiting_refund') {
        statusIndicator = (
            <div className={cn(statusBadgeStyle, "bg-amber-100 border-amber-300 text-amber-700")}>
                <Clock className="h-2.5 w-2.5" />
            </div>
        );
        statusTooltip = "Waiting Refund";
    } else if (effectiveStatus === 'completed' || effectiveStatus === 'refunded' || metaRefundStatus === 'refunded') {
        statusIndicator = (
            <div className={cn(statusBadgeStyle, "bg-emerald-100 border-emerald-300 text-emerald-700")}>
                <CheckCircle2 className="h-2.5 w-2.5" />
            </div>
        );
        statusTooltip = "Refund Processed";
    } else if (isRefundConfirmation && effectiveStatus === 'posted') {
        statusIndicator = (
            <div className={cn(statusBadgeStyle, "bg-emerald-100 border-emerald-300 text-emerald-700")}>
                <CheckCircle2 className="h-2.5 w-2.5" />
            </div>
        );
        statusTooltip = "Money Received";
    } else if (meta?.has_refund_request && !metaRefundStatus) {
        statusIndicator = (
            <div className={cn(statusBadgeStyle, "bg-blue-100 border-blue-300 text-blue-700")}>
                <FileText className="h-2.5 w-2.5" />
            </div>
        );
        statusTooltip = "Refund Requested";
    }

    const date = new Date(txn.occurred_at);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Amount Logic
    const visualType = (txn as any).displayType ?? txn.type;
    const isRepayment = txn.type === 'repayment';
    const amountClass =
        visualType === "income" || isRepayment
            ? "text-emerald-700"
            : visualType === "expense"
                ? "text-red-500"
                : "text-slate-600";

    const amountVal = Math.abs(typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount);

    return (
        <TableRow
            className={cn(
                "border-b border-slate-200 transition-colors text-base relative",
                isSelected ? "bg-blue-50" : "bg-white"
            )}
            onClick={() => onRowClick && onRowClick(txn)}
        >
            {/* Render Mobile Cells (Grid Layout inside a single cell or multiple cells matching header?) */}
            {/* Assuming table header exists, we must render cells. 
            Mobile Columns: Checkbox/Date, Note/Shop, Category, Amount 
        */}

            {/* Cell 1: Date & Selection */}
            <TableCell className="p-2 align-top w-[50px]">
                <div className="flex flex-col items-center gap-2">
                    <input
                        type="checkbox"
                        className="rounded border-slate-300 h-4 w-4"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onSelect(txn.id, e.target.checked)}
                    />
                    <div className="flex items-center justify-center px-1 py-0.5 rounded-md border bg-white border-slate-200 min-w-[36px]">
                        <span className="font-bold text-xs leading-none">{dateStr}</span>
                    </div>
                </div>
            </TableCell>

            {/* Cell 2: Note / Shop / Details */}
            <TableCell className="p-2 align-top">
                <div className="flex flex-col gap-1">
                    {/* Note Top Line */}
                    <div className="flex items-center gap-2">
                        {/* Icon */}
                        {displayImage ? (
                            <img src={displayImage} alt="" className="h-8 w-8 object-contain rounded-none" />
                        ) : (
                            <div className="h-8 w-8 bg-slate-100 flex items-center justify-center rounded-none text-slate-400">
                                <Wallet className="h-4 w-4" />
                            </div>
                        )}

                        <span className="font-bold text-sm text-slate-700 line-clamp-2">{displayName}</span>
                    </div>

                    {/* Updated Note Column with Category */}
                    <div className="flex flex-col w-full">
                        <div className="flex items-start justify-between gap-1 w-full">
                            <span className="font-bold text-sm text-slate-700 line-clamp-2 leading-tight">{displayName}</span>
                            {(txn.is_installment || txn.installment_plan_id) && (
                                <span className="bg-amber-100 text-amber-700 text-[9px] px-1 rounded border border-amber-200 shrink-0 ml-1 h-fit">Inst</span>
                            )}
                        </div>

                        {/* Category & Refund Status Line */}
                        <div className="flex items-center gap-2 mt-0.5">
                            {/* Category Badge */}
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                                {categories.find(c => c.id === txn.category_id)?.name || txn.category_name}
                            </span>

                            {/* Short Refund Info if exists */}
                            {statusIndicator && (
                                <span className="flex items-center gap-0.5" title={statusTooltip}>
                                    {statusIndicator}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </TableCell>

            {/* Cell 3: Hidden (We merged Category into Cell 2) */}
            <TableCell className="hidden p-0 m-0"></TableCell>

            {/* Cell 4: Amount */}
            <TableCell className="p-2 align-top text-right pr-2">
                <div className="flex flex-col items-end">
                    <span className={cn("font-bold text-sm", amountClass)}>
                        {formatters.currency(amountVal)}
                    </span>
                    {/* Cashback info */}
                </div>
            </TableCell>
        </TableRow>
    );
}
