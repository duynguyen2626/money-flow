// src/components/transaction/TransactionRow.tsx

import React from 'react';
import { TransactionWithDetails, Account, Category, Person, Shop } from '@/types/moneyflow.types';
import { TableCell, TableRow } from '@/components/ui/table';
import { ColumnKey } from '@/components/app/table/transactionColumns';
import { ExpandIcon } from './ui/ExpandIcon';
import { TransactionRowDetails } from './TransactionRowDetails';
import { cn } from '@/lib/utils';
import { parseMetadata } from '@/lib/transaction-mapper';

interface TransactionRowProps {
    txn: TransactionWithDetails;
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];
    isSelected: boolean;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    visibleColumns: Record<ColumnKey, boolean>;
    columnOrder: ColumnKey[];
    isExcelMode: boolean;
    fontSize: number;
    contextId?: string;
    context?: 'account' | 'person' | 'general';
    renderCell: (txn: TransactionWithDetails, key: ColumnKey) => React.ReactNode;
    statusOverrides: Record<string, string>;
    onMouseDown: (id: string, key: ColumnKey, e: React.MouseEvent) => void;
    onMouseEnter: (id: string, key: ColumnKey) => void;
    columnWidths: Record<string, number>;
    isExcelRowSelected?: boolean;
}

export function TransactionRow({
    txn,
    accounts,
    categories,
    people,
    shops,
    isSelected,
    isExpanded,
    onToggleExpand,
    visibleColumns,
    columnOrder,
    isExcelMode,
    fontSize,
    contextId,
    context,
    renderCell,
    statusOverrides,
    onMouseDown,
    onMouseEnter,
    columnWidths,
    isExcelRowSelected,
}: TransactionRowProps) {
    const effectiveStatus = statusOverrides[txn.id] ?? txn.status;
    const isVoided = effectiveStatus === 'void';

    const metadata = parseMetadata(txn.metadata);

    // Row Background Logic
    let rowBgColor = "bg-white";
    if (isVoided) {
        rowBgColor = "opacity-60 bg-gray-50 scale-[0.99] border-dashed grayscale";
    } else {
        if (txn.is_installment || txn.installment_plan_id) rowBgColor = "bg-amber-50";
        else if ((metadata?.refund_sequence as number) > 0) rowBgColor = "bg-purple-50";
        else if (txn.type === 'repayment') rowBgColor = "bg-slate-50";
        else if (effectiveStatus === 'pending' || effectiveStatus === 'waiting_refund') rowBgColor = "bg-emerald-50/50";
    }

    const columnsCount = columnOrder.filter(k => visibleColumns[k]).length + 1; // +1 for expand column

    return (
        <>
            <TableRow
                className={cn(
                    "transition-colors text-base border-b border-slate-200",
                    rowBgColor,
                    !isExcelMode && "hover:bg-slate-50/50",
                    isSelected && "bg-blue-50/50"
                )}
                onClick={() => onToggleExpand(txn.id)}
            >
                {/* Expand Column */}
                <TableCell
                    className="w-10 p-0 text-center border-r border-slate-200 sticky left-0 bg-inherit z-10"
                >
                    <ExpandIcon
                        isExpanded={isExpanded}
                        onClick={() => onToggleExpand(txn.id)}
                    />
                </TableCell>

                {/* Dynamic Columns */}
                {columnOrder.map((key) => {
                    if (!visibleColumns[key]) return null;

                    const allowOverflow = key === "date";
                    const stickyStyle: React.CSSProperties = {
                        width: columnWidths[key],
                        maxWidth: key === 'account' ? 'none' : columnWidths[key],
                        overflow: allowOverflow ? 'visible' : 'hidden',
                        whiteSpace: allowOverflow ? 'nowrap' : 'nowrap'
                    };

                    return (
                        <TableCell
                            key={`${txn.id}-${key}`}
                            onMouseDown={(e) => onMouseDown(txn.id, key, e)}
                            onMouseEnter={() => onMouseEnter(txn.id, key)}
                            className={cn(
                                `border-r border-slate-200 truncate`,
                                key === "date" && "p-1 relative overflow-visible",
                                isExcelMode && "select-none cursor-crosshair active:cursor-crosshair",
                                isExcelMode && isExcelRowSelected && key === 'amount' && "bg-blue-100 ring-2 ring-inset ring-blue-500 z-10"
                            )}
                            style={stickyStyle}
                        >
                            {renderCell(txn, key)}
                        </TableCell>
                    );
                })}
            </TableRow>

            {/* Details Row */}
            {isExpanded && (
                <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                    <TableCell colSpan={columnsCount} className="p-0 border-none">
                        <TransactionRowDetails transaction={txn} />
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
