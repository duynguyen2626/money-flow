import type { ParsedTransaction, ParseTransactionContext } from "@/types/ai.types";
import type { AIProviderInterface, AIResponse } from "../types";

/**
 * Fallback parser using simple regex patterns
 * No AI required - instant parsing for common patterns
 */
export class FallbackParser implements AIProviderInterface {
    name = "fallback" as const;

    isAvailable(): boolean {
        return true; // Always available
    }

    async parse(text: string, context: ParseTransactionContext): Promise<AIResponse> {
        const startTime = Date.now();

        try {
            const result = this.simpleParse(text, context);

            return {
                success: true,
                data: {
                    ...result,
                    needs: (result as any).needs || [],
                    confidence: (result as any).confidence || 0.5,
                    mode: "fallback",
                    persona: "strict",
                    feedback: "Tôi đã parse bằng regex đơn giản. Có thể chưa chính xác 100% đâu nhé! 🤖"
                } as ParsedTransaction,
                metadata: {
                    provider: "fallback",
                    tokens: 0,
                    latency: Date.now() - startTime,
                    model: "regex"
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Fallback parsing failed"
            };
        }
    }

    private simpleParse(text: string, context: ParseTransactionContext): Partial<ParsedTransaction> {
        const normalized = text.toLowerCase().trim();
        const refinementKeywords = ["sửa", "sưa", "đổi", "thay", "cập nhật", "nâng", "hạ", "không phải", "sai rồi"];
        const isRefinement = refinementKeywords.some(k => normalized.includes(k)) ||
            (context.previousData && normalized.length < 30);
        const prev = context.previousData;

        // Extract amount (support formats: 50k, 50000, 50,000)
        let amount = this.extractAmount(normalized);
        if (amount === null && isRefinement && prev) {
            amount = prev.amount || null;
        }

        // Detect intent
        let intent = this.detectIntent(normalized);
        if (isRefinement && prev && (!intent || normalized.length < 20)) {
            intent = prev.intent || intent;
        }

        // Extract date
        let occurredAt = new Date().toISOString();
        if (normalized.includes("hôm qua")) {
            const date = new Date();
            date.setDate(date.getDate() - 1);
            occurredAt = date.toISOString();
        } else if (normalized.includes("hôm kia")) {
            const date = new Date();
            date.setDate(date.getDate() - 2);
            occurredAt = date.toISOString();
        } else if (isRefinement && prev) {
            occurredAt = prev.occurred_at || occurredAt;
        }

        // Extract account keyword
        const accountKeyword = this.extractAccountKeyword(normalized);
        const matchedAccount = accountKeyword
            ? context.accounts?.find(a => a.name.toLowerCase().includes(accountKeyword))
            : null;

        // Extract category keyword
        const categoryKeyword = this.extractCategoryKeyword(normalized);
        const matchedCategory = categoryKeyword
            ? context.categories?.find(c => c.name.toLowerCase().includes(categoryKeyword))
            : null;

        // Detect person if on people_detail page
        let peopleRefs = isRefinement ? (prev?.people || []) : [];
        if (!isRefinement && context.context_page === "people_detail" && context.current_person_id) {
            const currentPerson = context.people?.find(p => p.id === context.current_person_id);
            if (currentPerson && !peopleRefs.some(p => p.id === currentPerson.id)) {
                peopleRefs.push({ id: currentPerson.id, name: currentPerson.name });
            }
            // Auto-intent to lend if it was an expense
            if (intent === "expense" || !intent) {
                intent = "lend";
            }
        }

        return {
            intent: intent || (isRefinement ? prev?.intent : "expense") || "expense",
            amount: amount,
            note: isRefinement ? (prev?.note || "") : text,
            source_account_id: matchedAccount?.id || (isRefinement ? prev?.source_account_id : null) || null,
            source_account_name: matchedAccount?.name || (isRefinement ? prev?.source_account_name : null) || accountKeyword || null,
            category_id: matchedCategory?.id || (isRefinement ? prev?.category_id : null) || null,
            category_name: matchedCategory?.name || (isRefinement ? prev?.category_name : null) || categoryKeyword || null,
            people: peopleRefs,
            occurred_at: occurredAt,
            split_bill: isRefinement ? prev?.split_bill : null,
            shop_id: isRefinement ? prev?.shop_id : null,
            shop_name: isRefinement ? prev?.shop_name : null,
            group_id: isRefinement ? prev?.group_id : null,
            group_name: isRefinement ? prev?.group_name : null,
            debt_account_id: isRefinement ? prev?.debt_account_id : null,
            debt_account_name: isRefinement ? prev?.debt_account_name : null,
            cashback_share_percent: isRefinement ? prev?.cashback_share_percent : null,
            cashback_share_fixed: isRefinement ? prev?.cashback_share_fixed : null
        };
    }

    private extractAmount(text: string): number | null {
        // Match patterns: 50k, 50000, 50,000, 50.000
        const patterns = [
            /(\d+(?:[.,]\d+)?)\s*k/i,  // 50k, 50.5k
            /(\d+(?:[.,]\d{3})*)/,      // 50000, 50,000, 50.000
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let value = match[1].replace(/[.,]/g, '');
                if (text.match(/k/i)) {
                    value = (parseFloat(value) * 1000).toString();
                }
                return parseFloat(value);
            }
        }

        return null;
    }

    private detectIntent(text: string): ParsedTransaction["intent"] {
        if (/(thu|nhận|lương|thưởng|income)/i.test(text)) return "income";
        if (/(chuyển|transfer)/i.test(text)) return "transfer";
        if (/(cho.*vay|lend)/i.test(text)) return "lend";
        if (/(trả.*nợ|repay)/i.test(text)) return "repay";
        return "expense"; // Default
    }

    private extractAccountKeyword(text: string): string | null {
        const accountPatterns = [
            /(?:thẻ|tài khoản|tk|account)\s+([a-zà-ỹ0-9\s]+)/i,
            /([a-z]+)\s*(?:visa|master|card)/i,
        ];

        for (const pattern of accountPatterns) {
            const match = text.match(pattern);
            if (match) return match[1].trim();
        }

        return null;
    }

    private extractCategoryKeyword(text: string): string | null {
        const categoryKeywords = [
            'ăn', 'uống', 'cafe', 'cà phê', 'shopping', 'mua sắm',
            'di chuyển', 'grab', 'xe', 'giải trí', 'phim', 'game'
        ];

        for (const keyword of categoryKeywords) {
            if (text.includes(keyword)) return keyword;
        }

        return null;
    }

    private extractPeopleKeywords(text: string): string[] {
        // Simple: extract capitalized words (likely names)
        const matches = text.match(/\b[A-ZÀ-Ỹ][a-zà-ỹ]+\b/g);
        return matches || [];
    }
}
