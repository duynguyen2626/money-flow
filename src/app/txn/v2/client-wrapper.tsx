"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2";
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";

type TestPageClientProps = {
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];
};

export function TestPageClient({ accounts, categories, people, shops }: TestPageClientProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="p-8 space-y-8 max-w-2xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">Transaction Slide V2 Test Lab 🧪</h1>
                <p className="text-muted-foreground">
                    Isolated environment for testing new transaction components.
                </p>
            </div>

            <div className="p-6 border rounded-xl bg-white shadow-sm space-y-4">
                <h2 className="font-semibold">Actions</h2>
                <div className="flex gap-4">
                    <Button onClick={() => setIsOpen(true)} variant="default">
                        Open Slide V2
                    </Button>
                </div>
                <div className="text-xs text-slate-400">
                    Status: {isOpen ? "Open" : "Closed"}
                </div>
            </div>

            <TransactionSlideV2
                open={isOpen}
                onOpenChange={setIsOpen}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={() => {
                    console.log("Transaction Created!");
                    setIsOpen(false);
                }}
            />

            <div className="mt-8 p-4 bg-slate-100 rounded text-xs font-mono">
                <pre>{JSON.stringify({ accountCount: accounts.length, shopCount: shops.length }, null, 2)}</pre>
            </div>
        </div>
    );
}
