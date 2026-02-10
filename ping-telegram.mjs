
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = "775386481"; // Taken from your screenshot

async function ping() {
    console.log("🚀 Pinging Telegram Bot...");
    console.log("Token:", TOKEN ? "✅ Found" : "❌ Missing");

    if (!TOKEN) return;

    try {
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: "🔔 **Hello World!** Cầu nối Telegram đã thông suốt. 🚀",
                parse_mode: "Markdown"
            }),
        });

        const result = await response.json();
        if (result.ok) {
            console.log("✅ Message sent to Telegram successfully!");
        } else {
            console.log("❌ Failed to send message:", result.description);
        }
    } catch (err) {
        console.error("❌ Network Error:", err.message);
    }
}

ping();
