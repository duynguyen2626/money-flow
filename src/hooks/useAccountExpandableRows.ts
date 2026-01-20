import { useState, useCallback } from 'react';

export function useAccountExpandableRows() {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = useCallback((rowId: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(rowId)) {
                next.delete(rowId);
            } else {
                next.add(rowId);
            }
            return next;
        });
    }, []);

    const isExpanded = useCallback((rowId: string) => {
        return expandedRows.has(rowId);
    }, [expandedRows]);

    const collapseAll = useCallback(() => {
        setExpandedRows(new Set());
    }, []);

    const expandAll = useCallback((rowIds: string[]) => {
        setExpandedRows(new Set(rowIds));
    }, []);

    return {
        expandedRows,
        toggleRow,
        isExpanded,
        collapseAll,
        expandAll,
    };
}
