"use client";

import { Account, Category } from "@/types/moneyflow.types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AccountMccCellProps = {
    account: Account;
    categories?: Category[];
};

export function AccountMccCell({ account, categories }: AccountMccCellProps) {
    // Get MCC codes from categories associated with this account
    // For now, we'll show placeholder since MCC mapping requires transaction aggregation
    // In future, this could aggregate from account's transaction categories
    
    const mccCodes: string[] = [];

    // TODO: Aggregate from transactions - requires service layer support
    // For now, return placeholder
    
    if (mccCodes.length === 0) {
        return <span className="text-slate-300 text-xs">—</span>;
    }

    // Display up to 2 MCC codes
    const displayCodes = mccCodes.slice(0, 2);
    const hasMore = mccCodes.length > 2;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                        {displayCodes.map((code, idx) => (
                            <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                            >
                                {code}
                            </span>
                        ))}
                        {hasMore && (
                            <span className="text-[10px] text-slate-400 font-medium">
                                +{mccCodes.length - 2}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                    <div className="text-xs">
                        <div className="font-bold mb-1">MCC Codes:</div>
                        <div className="flex flex-wrap gap-1">
                            {mccCodes.map((code, idx) => (
                                <span key={idx} className="px-1 py-0.5 bg-slate-700 rounded text-white">
                                    {code}
                                </span>
                            ))}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
