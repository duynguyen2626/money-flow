import { useState } from 'react';

export function usePeopleExpandableRows() {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const isExpanded = (id: string) => {
        return expandedRows.has(id);
    };

    const clearAll = () => {
        setExpandedRows(new Set());
    };

    return {
        expandedRows,
        toggleRow,
        isExpanded,
        clearAll,
    };
}
