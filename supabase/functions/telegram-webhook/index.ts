import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
    try {
        // 1. Verify Request
        if (req.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        const payload = await req.json();
        console.log("[Telegram Webhook] Received payload:", JSON.stringify(payload));

        const message = payload.message || payload.edited_message;
        if (!message || !message.text) {
            return new Response("OK"); // Ignore non-text messages
        }

        const chatId = message.chat.id;
        const text = message.text;
        const fromId = message.from.id.toString();

        // 2. Call Next.js Server Action / API
        // We can't call Server Actions directly from Edge Functions easily (unless they are exposed as APIs)
        // So we'll call a dedicated API route in our Next.js app or use a shared service.
        // For simplicity, we'll try to reach the Next.js API route.

        const APP_URL = Deno.env.get("APP_URL") || "https://money-flow-3.vercel.app";
        console.log(`[Telegram Webhook] Forwarding to: ${APP_URL}/api/bot/webhook`);

        const response = await fetch(`${APP_URL}/api/bot/webhook`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": Deno.env.get("BOT_WEBHOOK_KEY") || "", // Security
            },
            body: JSON.stringify({
                platform: "telegram",
                platformUserId: fromId,
                text: text,
            }),
        });

        console.log(`[Telegram Webhook] App response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Telegram Webhook] App error:`, errorText);
            return new Response(JSON.stringify({ error: "App returned error", details: errorText }), { status: 500 });
        }

        const result = await response.json();

        // 3. Reply to Telegram
        if (result.replies && result.replies.length > 0 && TELEGRAM_BOT_TOKEN) {
            for (const replyText of result.replies) {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: replyText,
                        parse_mode: "Markdown",
                        // If the reply includes a "Deep Link", we can add an Inline Keyboard
                        reply_markup: result.buttons ? { inline_keyboard: [result.buttons] } : undefined
                    }),
                });
            }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        console.error("[Telegram Webhook] Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});
