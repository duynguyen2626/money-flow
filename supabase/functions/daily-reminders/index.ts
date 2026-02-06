import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Fetch accounts
        const { data: accounts, error } = await supabase
            .from("accounts")
            .select("id, name, type, current_balance, cashback_config")
            .eq("type", "credit_card");

        if (error) throw error;

        const now = new Date();
        const reminders = [];

        for (const acc of (accounts || [])) {
            const config = acc.cashback_config;
            if (!config) continue;

            // Extract due day (handle legacy and MF5.3 program format)
            const dueDay = config.program?.dueDate || config.dueDate || config.payment_due_day || config.paymentDueDay;
            if (!dueDay) continue;

            // Calculate upcoming due date
            let targetMonth = now.getMonth();
            const targetYear = now.getFullYear();
            if (now.getDate() > dueDay) {
                targetMonth += 1;
            }

            const dueDate = new Date(targetYear, targetMonth, dueDay);
            const diffTime = dueDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const debt = Math.abs(acc.current_balance || 0);

            if (debt > 0 && diffDays <= 5 && diffDays >= 0) {
                let msg = "";
                if (diffDays === 0) {
                    msg = `🚨 *HẠN CUỐI HÔM NAY!* Bạn cần thanh toán *${debt.toLocaleString()}đ* cho thẻ *${acc.name}* ngay lập tức.`;
                } else if (diffDays === 1) {
                    msg = `⚠️ *Ngày mai* là hạn cuối! Đừng quên thanh toán *${debt.toLocaleString()}đ* cho thẻ *${acc.name}*.`;
                } else {
                    msg = `🔔 Thẻ *${acc.name}* sắp đến hạn (${diffDays} ngày nữa). Số tiền: *${debt.toLocaleString()}đ*.`;
                }
                reminders.push(msg);
            }
        }

        // 2. Send to Telegram
        if (reminders.length > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const fullMessage = "🔔 *MONEY FLOW REMINDERS*\n\n" + reminders.join("\n");

            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: fullMessage,
                    parse_mode: "Markdown",
                }),
            });

            const teleResult = await res.json();
            return new Response(JSON.stringify({ success: true, teleResult }), { headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true, message: "No reminders to send" }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});
