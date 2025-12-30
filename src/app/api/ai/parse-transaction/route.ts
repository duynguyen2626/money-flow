import { NextResponse } from "next/server";
import type { ParseTransactionRequest } from "@/types/ai.types";
import { parseTransaction } from "@/lib/ai/parse-transaction";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ParseTransactionRequest;
    const text = payload?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const result = await parseTransaction(text, payload?.context);
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("[parse-transaction] Failed:", error);
    const fallback = await parseTransaction("", undefined);
    return NextResponse.json({ result: fallback }, { status: 200 });
  }
}
