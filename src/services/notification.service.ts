"use server";

/**
 * Service to handle external notifications (Telegram, Email, etc.)
 */
export async function sendTelegramNotification(message: string) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        console.warn("[NotificationService] Telegram credentials not configured.");
        return { success: false, error: "Missing config" };
    }

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        const data = await response.json();
        return { success: data.ok, data };
    } catch (error: any) {
        console.error("[NotificationService] Telegram Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Logic to be run by a cron job or scheduled task
 */
export async function runDailyReminderCheck() {
    const { getAccountRemindersAction } = await import("@/actions/ai-reminder-actions");
    const { success, data: reminders } = await getAccountRemindersAction();

    if (!success || reminders.length === 0) return;

    // Filter for high priority or critical reminders to send externally
    const criticalReminders = reminders.filter(r => r.severity === 'critical' || r.severity === 'high');

    if (criticalReminders.length > 0) {
        let msg = "🔔 *MONEY FLOW REMINDER*\n\n";
        criticalReminders.forEach(r => {
            msg += `• ${r.message}\n`;
        });

        await sendTelegramNotification(msg);
    }
}
