"use client";

import { useState } from "react";
import { TransactionSlideV2 } from "./transaction-slide-v2";
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { SingleTransactionFormValues } from "./types";
import { useRouter } from "next/navigation";

interface TransactionTriggerProps {
    children: React.ReactNode;
    initialData?: Partial<SingleTransactionFormValues>;
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];
    onSuccess?: () => void;
}

export function TransactionTrigger({
    children,
    initialData,
    accounts,
    categories,
    people,
    shops,
    onSuccess
}: TransactionTriggerProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleSuccess = () => {
        setOpen(false);
        router.refresh();
        onSuccess?.();
    };

    return (
        <>
            <div onClick={() => setOpen(true)} className="contents">
                {children}
            </div>
            <TransactionSlideV2
                open={open}
                onOpenChange={setOpen}
                initialData={initialData}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={handleSuccess}
            />
        </>
    );
}
