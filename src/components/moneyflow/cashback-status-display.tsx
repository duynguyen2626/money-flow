import { formatCurrency } from "@/lib/account-utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type CashbackStatusDisplayProps = {
    earned: number;
    cap?: number | null;
    currentSpend: number;
    minSpend?: number | null;
    needToSpend: number;
    remaining?: number | null;
    variant?: "card" | "header"; // 'card' is compact (for AccountCard), 'header' is for AccountStatsHeader
};

export function CashbackStatusDisplay({
    earned,
    cap,
    currentSpend,
    minSpend,
    needToSpend,
    remaining,
    variant = "card",
}: CashbackStatusDisplayProps) {
    // Logic for display
    const isTargetMet = needToSpend <= 0;

    // Calculate Potential Cashback (approximate)
    // If min spend not met, potential is what they WOULD have earned if they met it (assuming current rate holds??) 
    // OR just showing "Earned so far" as potential?
    // User req: "Potential: {formatted_potential} (to show user what they could get)"
    // Usually this means if they hit the target, they unlock the earned amount.
    // So 'Potential' = 'earned' (which is currently locked).
    const potential = earned;

    if (variant === "card") {
        // Compact version for AccountCard
        // Note: AccountCard logic was:
        // Line 1: Remains: {remaining} (or Need warning icon)
        // Line 2: Need {amount} more (Red/Pulse) OR Target Met (Green)

        // We can return null here if we want AccountCard to manage its own layout, 
        // OR we can try to fit everything. 
        // Given AccountCard has a specific 2-line layout with icons, let's provide helper sub-components or just a block.
        // However, to reuse completely, let's output the standard block.

        // Actually, AccountCard splits this info.
        // Let's stick to the Requirements: "Condition 1 (Min Spend NOT Met): Badge... Sub-text..."
        // This sounds more like the Header implementation. 
        // For Card, maybe we just use this component for the text parts?
        // Let's implement for HEADER mainly first, as that is the primary broken part.
        // But designed to be usable in Card if we refactor card to use it.
        return null; // Placeholder if not strictly used in Card yet
    }

    // HEADER VARIANT (AccountStatsHeader)
    if (!isTargetMet && minSpend && minSpend > 0) {
        // Condition 1: Min Spend NOT Met
        return (
            <div className="flex flex-col h-full justify-center">
                {/* Badge Section */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700 animate-pulse">
                        <AlertCircle className="h-3 w-3" />
                        Need to spend: {formatCurrency(needToSpend)}
                    </span>
                </div>

                {/* Sub-text Section */}
                <div className="flex items-baseline justify-between text-xs text-slate-500">
                    <span>Potential:</span>
                    <span className="font-bold text-slate-700">{formatCurrency(potential)}</span>
                </div>

                {/* Progress bar logic could be added here if needed, but requirements focus on Badge/Text */}
            </div>
        );
    }

    // Condition 2: Min Spend Met (or no min spend)
    return (
        <div className="flex flex-col h-full justify-center">
            {/* Badge Section */}
            <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Target Met
                </span>
            </div>

            {/* Sub-text Section */}
            <div className="flex items-baseline justify-between text-xs text-slate-500">
                <span>Remains:</span>
                <span className="font-bold text-slate-700">
                    {remaining !== undefined && remaining !== null ? formatCurrency(remaining) : "Unlimited"}
                </span>
            </div>
        </div>
    );
}
