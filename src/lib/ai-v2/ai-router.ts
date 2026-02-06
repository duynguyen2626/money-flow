import type { ParseTransactionContext } from "@/types/ai.types";
import type { AIResponse, AIProvider } from "./types";
import { GroqProvider } from "./providers/groq";
import { GeminiProvider } from "./providers/gemini";
import { FallbackParser } from "./providers/fallback";

/**
 * AI Router - Smart routing across multiple AI providers
 * Priority: Groq > Gemini > Fallback
 */
export class AIRouter {
    private providers: Map<AIProvider, any>;
    private failureCount: Map<AIProvider, number>;
    private lastFailureTime: Map<AIProvider, number>;

    // Cooldown period after failures (5 minutes)
    private readonly COOLDOWN_MS = 5 * 60 * 1000;
    private readonly MAX_FAILURES_BEFORE_COOLDOWN = 3;

    constructor() {
        this.providers = new Map([
            ["groq", new GroqProvider()],
            ["gemini", new GeminiProvider()],
            ["fallback", new FallbackParser()]
        ]);

        this.failureCount = new Map();
        this.lastFailureTime = new Map();
    }

    /**
     * Parse transaction with automatic provider fallback
     */
    async parse(text: string, context: ParseTransactionContext): Promise<AIResponse> {
        const providerOrder: AIProvider[] = ["groq", "gemini", "fallback"];

        for (const providerName of providerOrder) {
            const provider = this.providers.get(providerName);

            if (!provider) continue;

            // Skip if provider is in cooldown
            if (this.isInCooldown(providerName)) {
                console.log(`[AI Router] ${providerName} is in cooldown, skipping...`);
                continue;
            }

            // Skip if provider is not available
            if (!provider.isAvailable()) {
                console.log(`[AI Router] ${providerName} is not available, skipping...`);
                continue;
            }

            console.log(`[AI Router] Trying ${providerName}...`);

            try {
                const response = await provider.parse(text, context);

                if (response.success) {
                    // Reset failure count on success
                    this.failureCount.set(providerName, 0);
                    console.log(`[AI Router] ✅ ${providerName} succeeded`);
                    return response;
                } else {
                    // Track failure
                    this.recordFailure(providerName);
                    console.log(`[AI Router] ❌ ${providerName} failed: ${response.error}`);
                }
            } catch (error: any) {
                this.recordFailure(providerName);
                console.error(`[AI Router] ❌ ${providerName} error:`, error.message);
            }
        }

        // All providers failed
        return {
            success: false,
            error: "All AI providers failed. Please try again later."
        };
    }

    /**
     * Get current provider status for monitoring
     */
    getProviderStatus() {
        const status: Record<string, any> = {};

        for (const [name, provider] of this.providers.entries()) {
            status[name] = {
                available: provider.isAvailable(),
                failures: this.failureCount.get(name) || 0,
                inCooldown: this.isInCooldown(name),
                cooldownEndsAt: this.getCooldownEndTime(name)
            };
        }

        return status;
    }

    private recordFailure(provider: AIProvider) {
        const count = (this.failureCount.get(provider) || 0) + 1;
        this.failureCount.set(provider, count);

        if (count >= this.MAX_FAILURES_BEFORE_COOLDOWN) {
            this.lastFailureTime.set(provider, Date.now());
            console.log(`[AI Router] ${provider} entered cooldown after ${count} failures`);
        }
    }

    private isInCooldown(provider: AIProvider): boolean {
        const lastFailure = this.lastFailureTime.get(provider);
        if (!lastFailure) return false;

        const elapsed = Date.now() - lastFailure;
        return elapsed < this.COOLDOWN_MS;
    }

    private getCooldownEndTime(provider: AIProvider): number | null {
        const lastFailure = this.lastFailureTime.get(provider);
        if (!lastFailure) return null;

        return lastFailure + this.COOLDOWN_MS;
    }
}

// Singleton instance
let routerInstance: AIRouter | null = null;

export function getAIRouter(): AIRouter {
    if (!routerInstance) {
        routerInstance = new AIRouter();
    }
    return routerInstance;
}
