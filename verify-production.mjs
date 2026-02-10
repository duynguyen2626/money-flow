import fetch from 'node-fetch';

const APP_URL = "https://money-flow-3.vercel.app"; // Using the URL appearing in previous context
const WEBHOOK_KEY = "mf3_webhook_secret_key_2026";

async function testProduction() {
    console.log(`[Test] Pinging Vercel Production: ${APP_URL}/api/bot/webhook`);

    try {
        const res = await fetch(`${APP_URL}/api/bot/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': WEBHOOK_KEY
            },
            body: JSON.stringify({
                platform: 'telegram',
                platformUserId: '123456789', // Fake ID
                text: 'ping'
            })
        });

        console.log(`[Test] Status Code: ${res.status}`);
        const text = await res.text();
        console.log(`[Test] Response Body: ${text.slice(0, 500)}`);

        if (res.ok) {
            console.log("✅ Vercel API is responding correctly!");
            console.log("👉 If this passes, the issue is likely in Supabase Secrets (APP_URL or TELEGRAM_BOT_TOKEN).");
        } else {
            console.log("❌ Vercel API returned an error.");
            console.log("👉 Check Vercel Logs and Environment Variables (BOT_WEBHOOK_KEY).");
        }

    } catch (error) {
        console.error("[Test] Network Error:", error.message);
    }
}

testProduction();
