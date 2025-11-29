import React from 'react';

interface BadgeProps {
  value: string | null | undefined;
  variant?: 'default' | 'cycle' | 'status' | 'tag';
  formula?: string; // Cho hiện công thức nhỏ ở dưới (dùng cho cashback)
}

export const TableCellBadge: React.FC<BadgeProps> = ({ value, variant = 'default', formula }) => {
  const getColorClass = () => {
    const val = value?.toUpperCase() || '';

    // Tag variants (BATCH_AUTO, NOV25, etc.)
    if (variant === 'tag') {
      if (val.startsWith('BATCH')) return 'bg-blue-100 text-blue-800';
      if (val.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2}$/))
        return 'bg-purple-100 text-purple-800';
      return 'bg-gray-100 text-gray-800';
    }

    // Status variants
    if (variant === 'status') {
      if (val === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
      if (val === 'COMPLETED') return 'bg-blue-100 text-blue-800';
      if (val === 'PENDING' || val === 'WAITING REFUND' || val === 'WAITING_REFUND') return 'bg-yellow-100 text-yellow-800';
      if (val === 'REFUNDED') return 'bg-cyan-100 text-cyan-800';
      if (val === 'VOID') return 'bg-gray-100 text-gray-800 line-through opacity-60';
      if (val === 'PARTIAL') return 'bg-yellow-100 text-yellow-800';
      return 'bg-gray-100 text-gray-800';
    }

    // Cycle variants
    if (variant === 'cycle') {
      return 'bg-indigo-100 text-indigo-800';
    }

    return 'bg-gray-100 text-gray-800';
  };

  const displayValue = value || '-';

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium w-fit whitespace-nowrap ${getColorClass()}`}>
        {displayValue}
      </span>
      {formula && <span className="text-xs text-gray-500">{formula}</span>}
    </div>
  );
};
