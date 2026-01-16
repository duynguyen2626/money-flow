"use client";

import React, { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionFormV2 } from "./TransactionFormV2";
import { Account, Category, Person, Shop, Installment } from "@/types/moneyflow.types";

interface TransactionSlideProps {
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops?: Shop[];
    installments?: Installment[];
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function TransactionSlide({
    accounts,
    categories,
    people,
    shops,
    installments,
    defaultOpen = false,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
}: TransactionSlideProps) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen : setInternalOpen;

    const handleOpenChange = (newOpen: boolean) => {
        if (setOpen) setOpen(newOpen);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            {!isControlled && (
                <SheetTrigger asChild>
                    <Button size="icon" className="h-10 w-10 rounded-full shadow-lg">
                        <Plus className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent
                side="right"
                className="w-[100vw] sm:max-w-[700px] p-0 flex flex-col h-full bg-white dark:bg-black border-l dark:border-zinc-800"
            >
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>New Transaction</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    {open && (
                        <TransactionFormV2
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            shops={shops}
                            installments={installments}
                            onSuccess={() => handleOpenChange(false)}
                            onCancel={() => handleOpenChange(false)}
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
