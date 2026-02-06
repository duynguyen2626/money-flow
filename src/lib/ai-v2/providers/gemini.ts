import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedTransaction, ParseTransactionContext } from "@/types/ai.types";
import type { AIProviderInterface, AIResponse } from "../types";

const SYSTEM_PROMPT = `You are a financial transaction parser with a sassy Vietnamese personality (Rolly).

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no explanations.
2. Currency Suffixes (CRITICAL):
   - "k" = 1,000. Examples: "50k" -> 50000, "100k" -> 100000, "1.5k" -> 1500.
   - "tr", "triệu" = 1,000,000. Examples: "1tr" -> 1000000, "2 triệu" -> 2000000.
   - "vạn" = 10,000.
   - If the user says "50", and it's a typical daily expense, assume it's 50,000 if "k" is implied by context, but strictly follow explicit suffixes first.
3. Dates: 
   - ISO 8601 (YYYY-MM-DD).
   - "Hôm qua" = yesterday, "Hôm nay" = today, "Hôm kia" = 2 days ago.
   - Relative to the provided "Current Date".
4. Conversational Refinement (CRITICAL):
   - If "previous_transaction" is provided in context, the current user input is a REFINEMENT.
   - MERGE the user's new request with "previous_transaction".
   - Example 1: User previously said "Ăn trưa 50k", context has amount 50000. Now user says "sửa lại thành ngày hôm qua" -> KEEP amount 50000, change occurred_at to yesterday's date.
   - Example 2: "không phải 50k mà là 100k" -> KEEP categories/accounts, change amount to 100000.
   - NEVER say "Không có thông tin cụ thể" if a "previous_transaction" exists; just apply the change or return the original data if no change is detected.
5. Provide sassy Vietnamese feedback in the "feedback" field.

Response format:
{
  "intent": "income" | "expense" | "transfer" | "lend" | "repay",
  "amount": number,
  "note": string,
  "occurred_at": "YYYY-MM-DD",
  "source_account_id": string | null,
  "source_account_name": string | null,
  "debt_account_id": string | null,
  "debt_account_name": string | null,
  "category_id": string | null,
  "category_name": string | null,
  "shop_id": string | null,
  "shop_name": string | null,
  "people": [{"id": string | null, "name": string}],
  "group_id": string | null,
  "group_name": string | null,
  "split_bill": boolean | null,
  "cashback_share_percent": number | null,
  "cashback_share_fixed": number | null,
  "feedback": "Sassy Vietnamese message"
}`;

export class GeminiProvider implements AIProviderInterface {
    name = "gemini" as const;
    private client: GoogleGenerativeAI | null = null;
    private model = "gemini-1.5-flash";

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.client = new GoogleGenerativeAI(apiKey);
        }
    }

    isAvailable(): boolean {
        return !!this.client;
    }

    async parse(text: string, context: ParseTransactionContext): Promise<AIResponse> {
        if (!this.client) {
            return {
                success: false,
                error: "Gemini API key not configured"
            };
        }

        const startTime = Date.now();

        try {
            const model = this.client.getGenerativeModel({
                model: this.model,
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024,
                    responseMimeType: "application/json"
                }
            });

            const contextPrompt = this.buildContextPrompt(context);
            const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextPrompt}\n\nUser: "${text}"`;

            const result = await model.generateContent(fullPrompt);
            const responseText = result.response.text();
            const parsed = JSON.parse(responseText) as ParsedTransaction;

            const latency = Date.now() - startTime;
            const tokens = result.response.usageMetadata?.totalTokenCount || 0;

            return {
                success: true,
                data: {
                    ...parsed,
                    mode: "gemini",
                    persona: "strict"
                },
                metadata: {
                    provider: "gemini",
                    tokens,
                    latency,
                    model: this.model
                }
            };
        } catch (error: any) {
            // Check if quota exceeded
            const isQuotaError = error.message?.includes("quota") || error.status === 429;

            return {
                success: false,
                error: isQuotaError ? "Gemini quota exceeded" : (error.message || "Gemini parsing failed"),
                metadata: {
                    provider: "gemini",
                    tokens: 0,
                    latency: Date.now() - startTime
                }
            };
        }
    }

    private buildContextPrompt(context: ParseTransactionContext): string {
        const parts: string[] = [];

        parts.push(`Current Date: ${new Date().toISOString().split('T')[0]}`);

        if (context.accounts?.length) {
            parts.push(`Accounts: ${context.accounts.map(a => `${a.name} (${a.id})`).join(", ")}`);
        }
        if (context.people?.length) {
            parts.push(`People: ${context.people.map(p => `${p.name} (${p.id})`).join(", ")}`);
        }
        if (context.categories?.length) {
            parts.push(`Categories: ${context.categories.map(c => `${c.name} (${c.id})`).join(", ")}`);
        }
        if (context.shops?.length) {
            parts.push(`Shops: ${context.shops.map(s => `${s.name} (${s.id})`).join(", ")}`);
        }
        if (context.previousData) {
            parts.push(`previous_transaction: ${JSON.stringify(context.previousData)}`);
        }

        return parts.join("\n");
    }
}
