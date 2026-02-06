"use server";

import { createClient } from "@/lib/supabase/server";

export async function learnPatternAction(input: string, data: {
    entity_type: 'account' | 'category' | 'shop';
    entity_id: string;
    entity_name: string;
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Extract keywords from input (simple tokenization)
    const keywords = input.toLowerCase()
        .replace(/[0-9kđ]/g, '') // remove amounts
        .split(' ')
        .filter(w => w.length > 2);

    // Save mapping for each keyword
    for (const keyword of keywords) {
        // Upsert logic: increase frequency if exists
        const { error } = await supabase.rpc('upsert_ai_pattern', {
            p_user_id: user.id,
            p_keyword: keyword,
            p_entity_type: data.entity_type,
            p_entity_id: data.entity_id,
            p_entity_name: data.entity_name
        });

        if (error && error.code !== 'PGRST202') {
            console.error("Error saving pattern:", error);
        }
    }

    return { success: true };
}

export async function getLearnedPatternsAction() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('ai_learned_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('frequency', { ascending: false })
        .limit(50);

    if (error) return [];
    return data;
}
