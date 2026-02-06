"use server";

import { getAccounts } from "@/services/account.service";
import { createClient } from "@/lib/supabase/server";

export type AIReminder = {
    id: string;
    type: 'due_date' | 'debt' | 'cashback';
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    days_remaining: number;
    account_id?: string;
};

export async function getAccountRemindersAction(): Promise<{
    success: boolean;
    data: AIReminder[];
}> {
    try {
        const accounts = await getAccounts();
        const now = new Date();
        const reminders: AIReminder[] = [];

        for (const account of accounts) {
            // Check Credit Card Due Dates
            if (account.type === 'credit_card' && account.stats?.due_date) {
                const dueDate = new Date(account.stats.due_date);
                const timeDiff = dueDate.getTime() - now.getTime();
                const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                const debt = account.current_balance || 0;

                if (debt > 0 && daysRemaining <= 5 && daysRemaining >= 0) {
                    let severity: AIReminder['severity'] = 'medium';
                    let title = `Sắp đến hạn thanh toán: ${account.name}`;
                    let message = `Thẻ **${account.name}** cần thanh toán **${debt.toLocaleString()}đ** trong ${daysRemaining} ngày tới.`;

                    if (daysRemaining === 0) {
                        severity = 'critical';
                        title = `HÔM NAY LÀ HẠN CUỐI: ${account.name}`;
                        message = `🚨 **HẠN CUỐI HÔM NAY!** Bạn cần thanh toán **${debt.toLocaleString()}đ** cho thẻ **${account.name}** ngay lập tức để tránh phí phạt.`;
                    } else if (daysRemaining === 1) {
                        severity = 'high';
                        title = `Hạn thanh toán ngày mai: ${account.name}`;
                        message = `⚠️ **Ngày mai** là hạn cuối! Đừng quên thanh toán **${debt.toLocaleString()}đ** cho thẻ **${account.name}** nhé.`;
                    }

                    reminders.push({
                        id: `due-${account.id}-${daysRemaining}`,
                        type: 'due_date',
                        title,
                        message,
                        severity,
                        days_remaining: daysRemaining,
                        account_id: account.id
                    });
                }
            }
        }

        // Sort reminders by severity and days remaining
        const severityMap = { critical: 4, high: 3, medium: 2, low: 1 };
        reminders.sort((a, b) => {
            if (severityMap[b.severity] !== severityMap[a.severity]) {
                return severityMap[b.severity] - severityMap[a.severity];
            }
            return a.days_remaining - b.days_remaining;
        });

        return {
            success: true,
            data: reminders
        };
    } catch (error) {
        console.error("[getAccountRemindersAction] Error:", error);
        return { success: false, data: [] };
    }
}
