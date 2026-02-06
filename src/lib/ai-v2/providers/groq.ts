import Groq from "groq-sdk";
import type { ParsedTransaction, ParseTransactionContext } from "@/types/ai.types";
import type { AIProviderInterface, AIResponse } from "../types";

const SYSTEM_PROMPT = `You are a financial transaction parser. Parse the user's natural language input into structured transaction data.

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
5. Page Context Rules (CRITICAL):
   - If "context_page" is "people_detail", and the user provides an expense (e.g., "Shopee 50k"), automatically set intent to "lend" and associate it with the "current_person_id" provided.
   - If "context_page" is "people", prioritize identifying a person from the input. If no person is mentioned, provide feedback asking who it was for.
6. Provide sassy Vietnamese feedback in the "feedback" field.

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
  "feedback": "Sassy Vietnamese message here"
}`;

export class GroqProvider implements AIProviderInterface {
    name = "groq" as const;
    private client: Groq | null = null;
    private model = "llama-3.3-70b-versatile"; // Fast & accurate

    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (apiKey) {
            this.client = new Groq({ apiKey });
        }
    }

    isAvailable(): boolean {
        return !!this.client;
    }

    async parse(text: string, context: ParseTransactionContext): Promise<AIResponse> {
        if (!this.client) {
            return {
                success: false,
                error: "Groq API key not configured"
            };
        }

        const startTime = Date.now();

        try {
            // Build context prompt
            const contextPrompt = this.buildContextPrompt(context);
            const fullPrompt = `${contextPrompt}\n\nUser input: "${text}"`;

            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: fullPrompt }
                ],
                temperature: 0.3,
                max_tokens: 1024,
                response_format: { type: "json_object" }
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error("Empty response from Groq");
            }

            const parsed = JSON.parse(responseText) as ParsedTransaction;
            const latency = Date.now() - startTime;

            return {
                success: true,
                data: {
                    ...parsed,
                    mode: "groq",
                    persona: "strict"
                },
                metadata: {
                    provider: "groq",
                    tokens: completion.usage?.total_tokens || 0,
                    latency,
                    model: this.model
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Groq parsing failed",
                metadata: {
                    provider: "groq",
                    tokens: 0,
                    latency: Date.now() - startTime
                }
            };
        }
    }

    private buildContextPrompt(context: ParseTransactionContext): string {
        const parts: string[] = [];

        parts.push(`Current Date: ${new Date().toISOString().split('T')[0]}`);

        if (context.context_page) {
            parts.push(`Context Page: ${context.context_page}`);
        }
        if (context.current_person_id) {
            const person = context.people?.find(p => p.id === context.current_person_id);
            parts.push(`Current Person: ${person?.name || 'Unknown'} (id: ${context.current_person_id})`);
        }

        if (context.accounts?.length) {
            parts.push(`Available accounts: ${context.accounts.map(a => `${a.name} (id: ${a.id})`).join(", ")}`);
        }
        if (context.people?.length) {
            parts.push(`Available people: ${context.people.map(p => `${p.name} (id: ${p.id})`).join(", ")}`);
        }
        if (context.categories?.length) {
            parts.push(`Available categories: ${context.categories.map(c => `${c.name} (id: ${c.id})`).join(", ")}`);
        }
        if (context.shops?.length) {
            parts.push(`Available shops: ${context.shops.map(s => `${s.name} (id: ${s.id})`).join(", ")}`);
        }
        if (context.groups?.length) {
            parts.push(`Available groups: ${context.groups.map(g => `${g.name} (id: ${g.id})`).join(", ")}`);
        }
        if (context.previousData) {
            parts.push(`previous_transaction: ${JSON.stringify(context.previousData)}`);
        }

        return parts.join("\n");
    }
}
