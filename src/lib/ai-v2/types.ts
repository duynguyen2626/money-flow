import type { ParsedTransaction, ParseTransactionContext } from "@/types/ai.types";

export type AIProvider = "groq" | "gemini" | "openrouter" | "huggingface" | "fallback";

export interface AIProviderConfig {
    name: AIProvider;
    apiKey?: string;
    enabled: boolean;
    priority: number; // Lower = higher priority
    rateLimit: {
        requestsPerDay: number;
        requestsPerMinute: number;
    };
}

export interface AIResponse {
    success: boolean;
    data?: ParsedTransaction;
    metadata?: {
        provider: AIProvider;
        tokens: number;
        latency: number;
        model?: string;
    };
    error?: string;
}

export interface AIProviderInterface {
    name: AIProvider;
    isAvailable(): boolean;
    parse(text: string, context: ParseTransactionContext): Promise<AIResponse>;
}
