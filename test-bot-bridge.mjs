
const BOT_WEBHOOK_KEY = "mf3_webhook_secret_key_2026";
const API_URL = "http://localhost:3000/api/bot/webhook";

const text = process.argv[2] || "Cafe 50k";

async function testBridge() {
    console.log(`🚀 Sending to Local Bot: "${text}"`);
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": BOT_WEBHOOK_KEY,
            },
            body: JSON.stringify({
                platform: "telegram",
                platformUserId: "775386481", // Your Telegram ID from the screenshot
                text: text
            }),
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Bot Replies:");
        if (data.replies) {
            data.replies.forEach(r => console.log(`- ${r}`));
        } else {
            console.log("No replies:", data);
        }

    } catch (err) {
        console.error("❌ Connection Failed:", err.message);
    }
}

testBridge();
