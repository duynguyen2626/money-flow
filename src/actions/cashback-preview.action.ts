'use server';

import { simulateCashback } from '@/services/cashback.service';

export type CashbackPreviewResult = {
    success: boolean;
    rate?: number;
    estimatedReward?: number;
    metadata?: any;
    isCapped?: boolean;
    error?: string;
};

export async function previewCashbackAction(
    accountId: string,
    amount: number,
    categoryId?: string,
    occurredAt?: string
): Promise<CashbackPreviewResult> {
    try {
        const result = await simulateCashback({
            accountId,
            amount,
            categoryId,
            occurredAt
        });

        return {
            success: true,
            rate: result.rate,
            estimatedReward: result.estimatedReward,
            metadata: result.metadata,
            isCapped: result.isCapped
        };
    } catch (error) {
        console.error('Error previewing cashback:', error);
        return {
            success: false,
            error: 'Failed to simulate cashback'
        };
    }
}
