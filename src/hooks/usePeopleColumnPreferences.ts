import { useState, useEffect } from 'react';

export type PeopleColumnKey = 'name' | 'active_subs' | 'debt_tag' | 'current_debt' | 'base_lend' | 'cashback' | 'net_lend' | 'balance' | 'action';

export interface PeopleColumnConfig {
    key: PeopleColumnKey;
    label: string;
    defaultWidth: number;
    minWidth?: number;
    frozen?: boolean;
}

const defaultPeopleColumns: PeopleColumnConfig[] = [
    { key: 'name', label: 'Name', defaultWidth: 250, minWidth: 200, frozen: true },
    { key: 'active_subs', label: 'Active Subs', defaultWidth: 180, minWidth: 150 },
    { key: 'debt_tag', label: 'Debt Tag', defaultWidth: 120, minWidth: 100 },
    { key: 'current_debt', label: 'Current Debt', defaultWidth: 140, minWidth: 120 },
    { key: 'base_lend', label: 'Entire Base', defaultWidth: 140, minWidth: 120 },
    { key: 'cashback', label: 'Entire Repaid', defaultWidth: 140, minWidth: 120 },
    { key: 'net_lend', label: 'Current', defaultWidth: 140, minWidth: 120 },
    { key: 'balance', label: 'Remains', defaultWidth: 150, minWidth: 120 },
    { key: 'action', label: 'Actions', defaultWidth: 100, minWidth: 80, frozen: true },
];

export function usePeopleColumnPreferences() {
    const [columnOrder, setColumnOrder] = useState<PeopleColumnKey[]>(() =>
        defaultPeopleColumns.map(c => c.key)
    );

    const [visibleColumns, setVisibleColumns] = useState<Record<PeopleColumnKey, boolean>>({
        name: true,
        active_subs: true,
        debt_tag: true,
        current_debt: true,
        base_lend: true,
        cashback: true,
        net_lend: true,
        balance: true,
        action: true,
    });

    const [columnWidths, setColumnWidths] = useState<Record<PeopleColumnKey, number>>(() => {
        const map = {} as Record<PeopleColumnKey, number>;
        defaultPeopleColumns.forEach(col => {
            map[col.key] = col.defaultWidth;
        });
        return map;
    });

    // Persistence
    useEffect(() => {
        try {
            const savedOrder = localStorage.getItem('mf_v3_people_col_order');
            const savedVis = localStorage.getItem('mf_v3_people_col_vis');
            const savedWidths = localStorage.getItem('mf_v3_people_col_width');

            if (savedOrder) setColumnOrder(JSON.parse(savedOrder));
            if (savedVis) setVisibleColumns(JSON.parse(savedVis));
            if (savedWidths) setColumnWidths(JSON.parse(savedWidths));
        } catch (e) {
            console.error("Failed to load people column settings", e);
        }
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        localStorage.setItem('mf_v3_people_col_order', JSON.stringify(columnOrder));
    }, [columnOrder]);

    useEffect(() => {
        localStorage.setItem('mf_v3_people_col_vis', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        localStorage.setItem('mf_v3_people_col_width', JSON.stringify(columnWidths));
    }, [columnWidths]);

    const toggleColumn = (key: PeopleColumnKey, visible: boolean) => {
        setVisibleColumns(prev => ({ ...prev, [key]: visible }));
    };

    const reorderColumns = (newOrder: PeopleColumnKey[]) => {
        setColumnOrder(newOrder);
    };

    const resetPreferences = () => {
        setColumnOrder(defaultPeopleColumns.map(c => c.key));
        setVisibleColumns({
            name: true,
            active_subs: true,
            debt_tag: true,
            current_debt: true,
            base_lend: true,
            cashback: true,
            net_lend: true,
            balance: true,
            action: true,
        });
        const map = {} as Record<PeopleColumnKey, number>;
        defaultPeopleColumns.forEach(col => {
            map[col.key] = col.defaultWidth;
        });
        setColumnWidths(map);
    };

    const getVisibleColumns = () => {
        return columnOrder
            .filter(key => visibleColumns[key])
            .map(key => defaultPeopleColumns.find(c => c.key === key)!);
    };

    return {
        columns: defaultPeopleColumns,
        columnOrder,
        visibleColumns,
        columnWidths,
        toggleColumn,
        reorderColumns,
        setColumnWidths,
        savePreferences: () => { }, // Auto-saved via effects
        resetPreferences,
        getVisibleColumns,
    };
}
