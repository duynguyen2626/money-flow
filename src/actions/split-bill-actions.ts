"use server";

import {
    createSplitBill as createSplitBillService,
    updateSplitBill as updateSplitBillService,
    deleteSplitBill as deleteSplitBillService,
    SplitBillInput
} from "@/services/split-bill.service";
import { revalidatePath } from "next/cache";

export async function createSplitBillAction(input: SplitBillInput) {
    try {
        const parentId = await createSplitBillService(input);
        revalidatePath("/transactions");
        revalidatePath("/accounts");
        return { success: true, data: parentId };
    } catch (error: any) {
        console.error("createSplitBillAction error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSplitBillAction(parentId: string, input: SplitBillInput) {
    try {
        await updateSplitBillService(parentId, input);
        revalidatePath("/transactions");
        revalidatePath("/accounts");
        return { success: true };
    } catch (error: any) {
        console.error("updateSplitBillAction error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteSplitBillAction(parentId: string) {
    try {
        await deleteSplitBillService(parentId);
        revalidatePath("/transactions");
        revalidatePath("/accounts");
        return { success: true };
    } catch (error: any) {
        console.error("deleteSplitBillAction error:", error);
        return { success: false, error: error.message };
    }
}
