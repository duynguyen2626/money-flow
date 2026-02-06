"use client";

import { useEffect, useState } from "react";
import { QuickAddChatV2 } from "./quick-add-chat-v2";
import { createClient } from "@/lib/supabase/client";
import type { Account, Category, Person, Shop } from "@/types/moneyflow.types";

export function GlobalAI() {
    const [data, setData] = useState<{
        accounts: Account[];
        categories: Category[];
        people: Person[];
        shops: Shop[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient();

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
        />
    );
}
