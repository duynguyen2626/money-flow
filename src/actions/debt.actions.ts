"use server";

import { getDebtByTags } from "@/services/debt.service";
import type { DebtByTagAggregatedResult } from "@/services/debt-calculation";
import { revalidatePath } from "next/cache";

export async function getDebtByTagsAction(personId: string): Promise<DebtByTagAggregatedResult[]> {
    try {
        const result = await getDebtByTags(personId);
        return result;
    } catch (error) {
        console.error("Failed to fetch debt tags:", error);
        return [];
    }
}
