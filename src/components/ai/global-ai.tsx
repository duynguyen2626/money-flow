"use client";

import { useEffect, useState, useMemo } from "react";
import { QuickAddChatV2 } from "./quick-add-chat-v2";
import { createClient } from "@/lib/supabase/client";
import type { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { usePathname } from "next/navigation";
import { getAccountRemindersAction, AIReminder } from "@/actions/ai-reminder-actions";

export function GlobalAI() {
    const pathname = usePathname();
    const [data, setData] = useState<{
        accounts: Account[];
        categories: Category[];
        people: Person[];
        shops: Shop[];
    } | null>(null);
    const [reminders, setReminders] = useState<AIReminder[]>([]);
    const [loading, setLoading] = useState(true);

    // Context Detection
    const contextPage = useMemo(() => {
        if (!pathname) return undefined;
        if (pathname.startsWith('/people/')) {
            const id = pathname.split('/')[2];
            if (id && id !== 'details') return 'people_detail';
            return 'people';
        }
        if (pathname.startsWith('/people')) return 'people';
        if (pathname.startsWith('/accounts')) return 'accounts';
        if (pathname.startsWith('/transactions')) return 'transactions';
        if (pathname.startsWith('/batch')) return 'batch';
        return undefined;
    }, [pathname]);

    const currentPersonId = useMemo(() => {
        if (!pathname || !pathname.startsWith('/people/')) return undefined;
        const id = pathname.split('/')[2];
        return id && id !== 'details' ? id : undefined;
    }, [pathname]);

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient();

            // Fetch Base Data
            const [
                { data: accounts },
                { data: categories },
                { data: people },
                { data: shops }
            ] = await Promise.all([
                supabase.from("accounts").select("*").order("name"),
                supabase.from("categories").select("*").order("name"),
                supabase.from("people").select("*").order("name"),
                supabase.from("shops").select("*").order("name")
            ]);

            setData({
                accounts: (accounts || []) as any,
                categories: (categories || []) as any,
                people: (people || []) as any,
                shops: (shops || []) as any
            });

            // Fetch AI Reminders (Due Dates)
            const reminderRes = await getAccountRemindersAction();
            if (reminderRes.success) {
                setReminders(reminderRes.data);
            }

            setLoading(false);
        }

        fetchData();
    }, []);

    if (loading || !data) return null;

    return (
        <QuickAddChatV2
            accounts={data.accounts}
            categories={data.categories}
            people={data.people}
            shops={data.shops}
            variant="floating"
            contextPage={contextPage as any}
            currentPersonId={currentPersonId}
            reminders={reminders}
        />
    );
}
