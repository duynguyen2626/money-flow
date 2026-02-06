"use server";

import { getAIRouter } from "@/lib/ai-v2/ai-router";
import type { ParseTransactionContext, ParsedTransaction } from "@/types/ai.types";

/**
 * Server Action: Parse transaction using multi-provider AI
 * Automatically tries: Groq → Gemini → Fallback
 */
export async function parseTransactionV2Action(
    text: string,
    context: ParseTransactionContext
): Promise<{
    success: boolean;
    data?: ParsedTransaction;
    metadata?: { provider: string; tokens: number; latency: number; model?: string };
    error?: string;
}> {
    try {
        const router = getAIRouter();
        const response = await router.parse(text, context);

        if (!response.success) {
            return {
                success: false,
                error: response.error || "Parsing failed"
            };
        }

        return {
            success: true,
            data: response.data,
            metadata: response.metadata
        };
    } catch (error: any) {
        console.error("[parseTransactionV2Action] Error:", error);
        return {
            success: false,
            error: error.message || "Unknown error occurred"
        };
    }
}

/**
 * Get AI provider status (for monitoring dashboard)
 */
export async function getAIProviderStatusAction() {
    try {
        const router = getAIRouter();
        return {
            success: true,
            data: router.getProviderStatus()
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}
