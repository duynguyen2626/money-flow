"use client"

import React, { useState, useMemo } from 'react';
import { Person, Account } from "@/types/moneyflow.types";
import { usePeopleColumnPreferences, PeopleColumnKey } from "@/hooks/usePeopleColumnPreferences";
import { usePeopleExpandableRows } from "@/hooks/usePeopleExpandableRows";
import { PeopleRowV2 } from "./people-row-v2";
import { PeopleGroupHeader } from "./people-group-header";
import { ColumnCustomizer } from "@/components/moneyflow/column-customizer";
import { Settings2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PeopleTableProps {
    people: Person[];
    accounts?: Account[];
    onEdit: (person: Person) => void;
    onLend: (person: Person) => void;
    onRepay: (person: Person) => void;
    onSync?: (personId: string) => void;
}

export function PeopleTableV2({ people, accounts = [], onEdit, onLend, onRepay, onSync }: PeopleTableProps) {
    const {
        columns,
        columnOrder,
        visibleColumns,
        columnWidths,
        toggleColumn,
        reorderColumns,
        setColumnWidths,
        resetPreferences,
        getVisibleColumns,
    } = usePeopleColumnPreferences();

    const {
        isExpanded,
        toggleRow,
        clearAll,
    } = usePeopleExpandableRows();

    const [isCustomizeOpen, setCustomizeOpen] = useState(false);
    // Track expanded groups. Default true? We'll assume yes or handle init.
    // Using a Set string of accountIds.
    // Initial state: we can't easily know all IDs on first render without effect or lazy init.
    // We'll use "all" logic or just default to expanding logic.
    // Simpler: Allow checking if group is explicitly CLOSED. So default OPEN.
    const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());

    const visibleCols = getVisibleColumns();

    // Transform defaultPeopleColumns to match ColumnCustomizer's expected format (id instead of key)
    const customizerColumns = columnOrder.map(key => {
        const col = columns.find(c => c.key === key);
        return {
            id: key,
            label: col?.label || key,
            frozen: col?.frozen,
        };
    });

    // Grouping Logic - BY STATUS (Outstanding/Settled), not by account
    const groupedPeople = useMemo(() => {
        const groups: Record<string, {
            id: string,
            name: string,
            image?: string | null,
            members: Person[],
            totalDebt: number,
            currentCycleDebt: number
        }> = {};

        people.forEach(person => {
            const totalDebt = (person.current_cycle_debt || 0) + (person.outstanding_debt || 0);
            const statusId = totalDebt > 0 ? 'outstanding' : 'settled';

            if (!groups[statusId]) {
                groups[statusId] = {
                    id: statusId,
                    name: statusId === 'outstanding' ? 'Outstanding' : 'Settled',
                    image: null,
                    members: [],
                    totalDebt: 0,
                    currentCycleDebt: 0
                };
            }

            groups[statusId].members.push(person);
            groups[statusId].totalDebt += totalDebt;
            groups[statusId].currentCycleDebt += (person.current_cycle_debt || 0);
        });

        // Sort: Outstanding first, then Settled
        return Object.values(groups).sort((a, b) => {
            if (a.id === 'outstanding') return -1;
            if (b.id === 'outstanding') return 1;
            return 0;
        });
    }, [people]);

    const toggleGroup = (groupId: string) => {
        setClosedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    return (
        <div className="rounded-md border bg-card overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-140px)]">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 z-30 bg-slate-50 text-xs uppercase font-bold text-muted-foreground border-b shadow-sm">
                        <tr>
                            <th className="sticky left-0 z-40 bg-slate-50 w-10 px-2 py-3 text-center border-r border-slate-200">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-400 hover:text-slate-900"
                                    onClick={() => clearAll()}
                                    title="Collapse All"
                                >
                                    <Minimize2 className="h-3.5 w-3.5" />
                                </Button>
                            </th>
                            {visibleCols.map((col, idx) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        "px-4 py-3 whitespace-nowrap group",
                                        idx < visibleCols.length - 1 ? 'border-r border-slate-200' : '',
                                        col.key === 'current_debt' && "bg-amber-100/50 text-amber-900",
                                        col.key === 'balance' && "bg-blue-100/50 text-blue-900",
                                        col.key === 'name' && "sticky left-10 z-40 bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span>{col.label}</span>
                                        {col.key === 'action' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-50 hover:opacity-100"
                                                onClick={() => setCustomizeOpen(true)}
                                            >
                                                <Settings2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y relative">
                        {people.length === 0 ? (
                            <tr>
                                <td colSpan={visibleCols.length + 1} className="p-8 text-center text-muted-foreground">
                                    No members found.
                                </td>
                            </tr>
                        ) : (
                            groupedPeople.map((group) => {
                                const isGroupExpanded = !closedGroups.has(group.id);
                                return (
                                    <React.Fragment key={group.id}>
                                        <PeopleGroupHeader
                                            accountId={group.id}
                                            accountName={group.name}
                                            accountImage={group.image}
                                            memberCount={group.members.length}
                                            totalDebt={group.totalDebt}
                                            currentCycleDebt={group.currentCycleDebt}
                                            colSpan={visibleCols.length + 1}
                                            isExpanded={isGroupExpanded}
                                            onToggle={() => toggleGroup(group.id)}
                                        />
                                        {isGroupExpanded && group.members.map((person) => (
                                            <PeopleRowV2
                                                key={person.id}
                                                person={person}
                                                visibleColumns={visibleCols}
                                                isExpanded={isExpanded(person.id)}
                                                onToggleExpand={toggleRow}
                                                onEdit={onEdit}
                                                onLend={onLend}
                                                onRepay={onRepay}
                                                onSync={onSync}
                                            />
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ColumnCustomizer
                open={isCustomizeOpen}
                onOpenChange={setCustomizeOpen}
                columns={customizerColumns}
                visibleColumns={visibleColumns}
                onVisibilityChange={(key, visible) => toggleColumn(key as PeopleColumnKey, visible)}
                onOrderChange={(newOrder) => reorderColumns(newOrder as PeopleColumnKey[])}
                widths={columnWidths}
                onWidthChange={(key, width) => setColumnWidths(prev => ({ ...prev, [key]: width as number }))}
                onReset={resetPreferences}
            />
        </div>
    );
}
