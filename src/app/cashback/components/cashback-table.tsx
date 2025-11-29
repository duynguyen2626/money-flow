'use client';

import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { TableCellBadge } from '@/components/moneyflow/table-cell-badge';
import { useRouter } from 'next/navigation';

export interface Cashback {
  id: string;
  cardName: string;
  cycle: string;
  totalSpend: number;
  bankBackRate: number;
  bankBackAmount: number;
  peopleBackRate: number;
  peopleBackAmount: number;
  profit: number;
  status: string;
}

interface CashbackTableProps {
  data: Cashback[];
  onRowClick?: (id: string) => void;
}

export const CashbackTable: React.FC<CashbackTableProps> = ({ data, onRowClick }) => {
  const router = useRouter();

  const columns: ColumnDef<Cashback>[] = [
    {
      accessorKey: 'cardName',
      header: 'Card',
      size: 150,
      cell: ({ row }) => (
        <div className="font-medium text-slate-700">{row.original.cardName}</div>
      ),
    },
    {
      accessorKey: 'cycle',
      header: 'Cycle',
      size: 130,
      cell: ({ row }) => (
        <TableCellBadge value={row.original.cycle} variant="cycle" />
      ),
    },
    {
      accessorKey: 'totalSpend',
      header: 'Total Spend',
      size: 140,
      cell: ({ row }) => (
        <span className="font-medium text-slate-700">
          {row.original.totalSpend.toLocaleString()} đ
        </span>
      ),
    },
    {
      accessorKey: 'bankBackAmount',
      header: 'Initial Back',
      size: 150,
      cell: ({ row }) => {
        const formula = `${(row.original.bankBackRate).toFixed(1)}% × ${row.original.totalSpend.toLocaleString()}`;
        return (
          <TableCellBadge
            value={row.original.bankBackAmount.toLocaleString()}
            variant="tag"
            formula={formula}
          />
        );
      },
    },
    {
      accessorKey: 'peopleBackRate',
      header: 'People Back',
      size: 140,
      cell: ({ row }) => {
        // Calculate amount if needed, but we display amount in badge and rate in formula?
        // Prompt code: value={peopleAmount}, formula={rate% * spend}
        const peopleAmount = row.original.peopleBackAmount;
        const formula = `${row.original.peopleBackRate.toFixed(1)}% × ${row.original.totalSpend.toLocaleString()}`;
        return (
          <TableCellBadge
            value={peopleAmount.toLocaleString()}
            variant="tag"
            formula={formula}
          />
        );
      },
    },
    {
      accessorKey: 'profit',
      header: 'Profit',
      size: 130,
      cell: ({ row }) => {
        const profitRate = row.original.bankBackRate - row.original.peopleBackRate;
        const formula = `${row.original.bankBackRate.toFixed(1)}% - ${row.original.peopleBackRate.toFixed(1)}% = ${profitRate.toFixed(1)}%`;
        const isPositive = row.original.profit >= 0;
        return (
          <div className="flex flex-col gap-0.5">
             <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium w-fit whitespace-nowrap ${isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {row.original.profit.toLocaleString()}
             </span>
             <span className="text-xs text-gray-500">{formula}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      cell: ({ row }) => (
        <TableCellBadge value={row.original.status} variant="status" />
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick ? onRowClick(row.original.id) : router.push(`/cashback/${row.original.id}`)}
              className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap"
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
             <tr>
               <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-500">
                 No cashback cycles found.
               </td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
