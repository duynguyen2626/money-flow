import { NextRequest, NextResponse } from "next/server";
import { handleBotMessage } from "@/lib/bot/bot-handler";
import { BotPlatform } from "@/lib/bot/bot-storage";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { platform, platformUserId, text } = body;

        // Security check (Optional but recommended)
        const apiKey = req.headers.get("x-api-key");
        if (process.env.BOT_WEBHOOK_KEY && apiKey !== process.env.BOT_WEBHOOK_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!platform || !platformUserId || !text) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Call our existing bot handler
        const result = await handleBotMessage({
            platform: platform as BotPlatform,
            platformUserId,
            text,
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("[Bot API Webhook] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
