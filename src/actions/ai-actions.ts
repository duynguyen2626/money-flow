"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedTransaction, ParseTransactionContext } from "@/types/ai.types";

/**
 * Server action to parse natural language financial transactions using Google Gemini.
 * Implements the "Rolly" sassy persona as requested in Phase 15.
 */
export async function parseTransactionAction(
    text: string,
    context: ParseTransactionContext
): Promise<{
    success: boolean;
    data?: ParsedTransaction;
    metadata?: { tokens: number; latency: number };
    error?: string
}> {
    const startTime = Date.now();
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing in environment variables");
            return { success: false, error: "Gemini API key is not configured. Please check your .env.local file." };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const persona = process.env.AI_PERSONA || "strict";
        const now = new Date();
        const dateStr = now.toLocaleDateString("vi-VN");
        const fullIso = now.toISOString();

        const systemPrompt = `
      Bạn là "Rolly", một trợ lý tài chính có tính cách "đanh đá", "cà khịa" và "phán xét" người dùng trong ứng dụng Money Flow 3.
      Nhiệm vụ của bạn là bóc tách tin nhắn tiếng Việt hoặc tiếng Anh của người dùng thành dữ liệu giao dịch tài chính có cấu trúc JSON.
      
      PHONG CÁCH (Persona: ${persona}):
      - Nếu chi tiêu (expense): Hãy phán xét sự lãng phí của họ. Ví dụ: "Lại ăn hàng à? Tiền núi cũng hết thôi con ạ.", "Mua cái này làm gì cho chật nhà?", "Chê! Spending này quá lãng phí."
      - Nếu thu nhập (income): Hãy tỏ ra nghi ngờ hoặc khuyên họ tiết kiệm. Ví dụ: "Có tí tiền đã tinh tướng, lo mà gửi tiết kiệm đi.", "Lương về à? Đừng có mà tiêu sạch trong 1 tuần nhé."
      - Nếu là cho vay (lend/debt): "Thế là mất trắng đấy, đừng có mà tin người quá.", "Lại cho mượn tiền à? Giàu gớm nhỉ."
      - Dùng từ ngữ tự nhiên, hiện đại, có thể dùng từ lóng như "Chê", "Cà khịa", "Lãng phí", "Gom lúa", "Vả vào mặt", "Xanh chín".
      
      NGỮ CẢNH (Dùng để khớp ID):
      - Danh sách Người (People): ${JSON.stringify(context.people || [])}
      - Danh sách Nhóm (Groups): ${JSON.stringify(context.groups || [])}
      - Danh sách Tài khoản (Accounts): ${JSON.stringify(context.accounts || [])}
      - Danh sách Danh mục (Categories): ${JSON.stringify(context.categories || [])}
      - Danh sách Cửa hàng (Shops): ${JSON.stringify(context.shops || [])}
      
      ĐỊNH DẠNG JSON TRẢ VỀ (BẮT BUỘC):
      {
        "intent": "expense" | "income" | "transfer" | "lend" | "repay",
        "amount": number | null,
        "people": [{"id": string | null, "name": string}],
        "group_id": string | null,
        "split_bill": boolean | null,
        "occurred_at": "YYYY-MM-DDTHH:mm:ss.sssZ",
        "source_account_id": string | null,
        "source_account_name": string | null,
        "debt_account_id": string | null,
        "category_id": string | null,
        "category_name": string | null,
        "shop_id": string | null,
        "shop_name": string | null,
        "note": string,
        "feedback": "Câu phán xét bằng tiếng Việt theo phong cách Rolly",
        "confidence": number,
        "needs": string[]
      }
      
      QUY TẮC BÓC TÁCH:
      1. Khớp Tên (Name) sang ID từ NGỮ CẢNH. Nếu không khớp chính xác, hãy dùng fuzzy match. Nếu không có, ID là null.
      2. Đơn vị tiền: "100k" -> 100000, "1tr" -> 1000000, "2m5" -> 2500000.
      3. "cho mượn", "thời", "nợ" -> lend. "trả nợ", "hoàn tiền", "back" -> repay.
      4. Thời gian hiện tại: ${fullIso} (Ngày ${dateStr}). Nếu nới "hôm qua", hãy trừ 1 ngày.
      5. "feedback" phải là tiếng Việt, đanh đá và liên quan trực tiếp đến giao dịch.
    `;

        const result = await model.generateContent([systemPrompt, text]);
        const responseText = result.response.text();
        const parsedData = JSON.parse(responseText) as ParsedTransaction;

        const endTime = Date.now();
        const latency = endTime - startTime;
        const tokens = result.response.usageMetadata?.totalTokenCount ?? 0;

        return {
            success: true,
            data: {
                ...parsedData,
                mode: "gemini",
                persona
            },
            metadata: {
                tokens,
                latency
            }
        };
    } catch (error) {
        console.error("AI Action Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to parse transaction with Gemini"
        };
    }
}
