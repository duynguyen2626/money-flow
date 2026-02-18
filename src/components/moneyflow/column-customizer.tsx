"use client";

import React, { useState, useMemo } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    GripVertical,
    Lock,
    RotateCcw,
    Search,
    Calendar,
    ShoppingBag,
    LayoutGrid,
    Wallet,
    Sigma,
    Undo2,
    Zap,
    Hash,
    Settings2,
    Gift,
    Users2,
    TrendingUp,
    Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ColumnKey = string;

interface ColumnItem {
    id: ColumnKey;
    label: string;
    frozen?: boolean; // Cannot move or hide
}

interface ColumnCustomizerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: ColumnItem[]; // All columns in current order
    visibleColumns: Record<ColumnKey, boolean>;
    onVisibilityChange: (key: ColumnKey, visible: boolean) => void;
    onOrderChange: (newOrder: ColumnKey[]) => void;
    widths: Record<ColumnKey, number>;
    onWidthChange: (key: ColumnKey, width: number) => void;
    onReset?: () => void;
}

const getColumnIcon = (key: string) => {
    switch (key) {
        case 'date': return <Calendar className="h-4 w-4" />;
        case 'shop': return <ShoppingBag className="h-4 w-4" />;
        case 'category': return <LayoutGrid className="h-4 w-4" />;
        case 'account': return <Wallet className="h-4 w-4" />;
        case 'amount': return <Sigma className="h-4 w-4" />;
        case 'total_back': return <Undo2 className="h-4 w-4" />;
        case 'final_price': return <Zap className="h-4 w-4" />;
        case 'tag': return <Tag className="h-4 w-4" />;
        case 'id': return <Hash className="h-4 w-4" />;
        case 'actions': return <Settings2 className="h-4 w-4" />;
        case 'actual_cashback': return <Gift className="h-4 w-4" />;
        case 'est_share': return <Users2 className="h-4 w-4" />;
        case 'net_profit': return <TrendingUp className="h-4 w-4" />;
        default: return <Settings2 className="h-4 w-4" />;
    }
}

function SortableItem({
    id,
    label,
    visible,
    frozen,
    width,
    isHighlighted,
    onToggle,
    onWidthChange
}: {
    id: string,
    label: string,
    visible: boolean,
    frozen?: boolean,
    width: number,
    isHighlighted?: boolean,
    onToggle: (checked: boolean) => void,
    onWidthChange: (width: number) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled: frozen });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : "auto",
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center justify-between p-3 bg-card border rounded-md mb-2 transition-colors",
                isDragging && "shadow-lg bg-accent",
                isHighlighted && "bg-yellow-400/20 border-yellow-400/50 ring-1 ring-yellow-400/30"
            )}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {frozen ? (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                    <div {...attributes} {...listeners} className="cursor-grab hover:text-primary active:cursor-grabbing shrink-0 touch-none">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                )}
                <div className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded bg-muted/50 text-muted-foreground shrink-0",
                    isHighlighted && "bg-yellow-400/30 text-yellow-700"
                )}>
                    {getColumnIcon(id)}
                </div>
                <span className={cn(
                    "font-medium text-sm truncate mr-2",
                    isHighlighted && "bg-yellow-200 text-yellow-900 rounded px-1"
                )}>{label}</span>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                    <span className="text-xs text-muted-foreground">px</span>
                    <input
                        type="number"
                        className="w-12 h-6 text-xs bg-transparent border-none focus:outline-none text-right"
                        value={width}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) onWidthChange(val);
                        }}
                    />
                </div>

                <Switch
                    checked={visible}
                    onCheckedChange={onToggle}
                    disabled={frozen}
                />
            </div>
        </div>
    );
}

export function ColumnCustomizer({
    open,
    onOpenChange,
    columns,
    visibleColumns,
    onVisibilityChange,
    onOrderChange,
    widths,
    onWidthChange,
    onReset
}: ColumnCustomizerProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = columns.findIndex((col) => col.id === active.id);
            const newIndex = columns.findIndex((col) => col.id === over.id);

            const newOrder = arrayMove(columns, oldIndex, newIndex).map(c => c.id);
            onOrderChange(newOrder);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0">
                <div className="p-6 border-b">
                    <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <SheetTitle>Customize Columns</SheetTitle>
                        {onReset && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onReset}
                                className="h-8 gap-1.5"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span className="text-xs">Reset Default</span>
                            </Button>
                        )}
                    </SheetHeader>

                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search columns to highlight..."
                            className="pl-9 h-10 bg-muted/30 focus-visible:ring-1"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="space-y-4">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={columns.map((c) => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {columns.map((col) => {
                                    const isHighlighted = searchQuery !== "" && col.label.toLowerCase().includes(searchQuery.toLowerCase());
                                    return (
                                        <SortableItem
                                            key={col.id}
                                            id={col.id}
                                            label={col.label}
                                            visible={visibleColumns[col.id]}
                                            frozen={col.frozen}
                                            width={widths[col.id] || 100}
                                            isHighlighted={isHighlighted}
                                            onToggle={(checked) => onVisibilityChange(col.id, checked)}
                                            onWidthChange={(w) => onWidthChange(col.id, w)}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
