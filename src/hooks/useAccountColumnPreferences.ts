import { useState, useEffect } from 'react';

export type AccountColumnKey =
    | 'account'
    | 'limit'
    | 'spent'
    | 'due'
    | 'balance'
    | 'cashback_advanced'
    | 'action';

export interface AccountColumnConfig {
    key: AccountColumnKey;
    label: string;
    defaultWidth: number;
    minWidth?: number;
    frozen?: boolean;
}

const defaultAccountColumns: AccountColumnConfig[] = [
    { key: 'account', label: 'Account', defaultWidth: 250, minWidth: 200, frozen: true },
    { key: 'limit', label: 'Limit', defaultWidth: 120, minWidth: 100 },
    { key: 'spent', label: 'Spent', defaultWidth: 220, minWidth: 180 },
    { key: 'due', label: 'Due', defaultWidth: 140, minWidth: 120 },
    { key: 'balance', label: 'Balance', defaultWidth: 180, minWidth: 150 },
    { key: 'cashback_advanced', label: 'Advanced Cashback', defaultWidth: 160, minWidth: 140 },
    { key: 'action', label: 'Actions', defaultWidth: 120, minWidth: 100, frozen: true },
];

export function useAccountColumnPreferences() {
    const [columnOrder, setColumnOrder] = useState<AccountColumnKey[]>(() =>
        defaultAccountColumns.map(c => c.key)
    );

    const [visibleColumns, setVisibleColumns] = useState<Record<AccountColumnKey, boolean>>({
        account: true,
        limit: true,
        spent: true,
        due: true,
        balance: true,
        cashback_advanced: true,
        action: true,
    });

    const [columnWidths, setColumnWidths] = useState<Record<AccountColumnKey, number>>(() => {
        const map = {} as Record<AccountColumnKey, number>;
        defaultAccountColumns.forEach(col => {
            map[col.key] = col.defaultWidth;
        });
        return map;
    });

    // Persistence
    useEffect(() => {
        try {
            const savedOrder = localStorage.getItem('mf_v3_account_col_order');
            const savedVis = localStorage.getItem('mf_v3_account_col_vis');
            const savedWidths = localStorage.getItem('mf_v3_account_col_width');

            if (savedOrder) setColumnOrder(JSON.parse(savedOrder));
            if (savedVis) setVisibleColumns(JSON.parse(savedVis));
            if (savedWidths) setColumnWidths(JSON.parse(savedWidths));
        } catch (e) {
            console.error("Failed to load account column settings", e);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('mf_v3_account_col_order', JSON.stringify(columnOrder));
    }, [columnOrder]);

    useEffect(() => {
        localStorage.setItem('mf_v3_account_col_vis', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        localStorage.setItem('mf_v3_account_col_width', JSON.stringify(columnWidths));
    }, [columnWidths]);

    const toggleColumn = (key: AccountColumnKey, visible: boolean) => {
        setVisibleColumns(prev => ({ ...prev, [key]: visible }));
    };

    const reorderColumns = (newOrder: AccountColumnKey[]) => {
        setColumnOrder(newOrder);
    };

    const resetPreferences = () => {
        setColumnOrder(defaultAccountColumns.map(c => c.key));
        setVisibleColumns({
            account: true,
            limit: true,
            spent: true,
            due: true,
            balance: true,
            cashback_advanced: true,
            action: true,
        });
        const map = {} as Record<AccountColumnKey, number>;
        defaultAccountColumns.forEach(col => {
            map[col.key] = col.defaultWidth;
        });
        setColumnWidths(map);
    };

    const getVisibleColumns = () => {
        return columnOrder
            .filter(key => visibleColumns[key])
            .map(key => defaultAccountColumns.find(c => c.key === key)!);
    };

    return {
        columns: defaultAccountColumns,
        columnOrder,
        visibleColumns,
        columnWidths,
        toggleColumn,
        reorderColumns,
        setColumnWidths,
        resetPreferences,
        getVisibleColumns,
    };
}
