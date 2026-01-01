
import { NextResponse } from "next/server";
import { parseBatch } from "@/lib/ai/parse-batch";

export async function POST(request: Request) {
  try {
    const { text, image } = await request.json();

    if (!text && !image) {
      return NextResponse.json({ error: "Missing text or image" }, { status: 400 });
    }

    const result = await parseBatch(text || "", image);
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("[parse-batch] Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
