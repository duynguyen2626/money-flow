"use client"

import React from "react";
// This file contains a backup of the legacy cashback configuration UI and logic
// extracted from AccountSlideV2.tsx before the Phase 16 Reboot.

/*
Relevant State captured:
    const [isCashbackEnabled, setIsCashbackEnabled] = useState(false);
    const [cbType, setCbType] = useState<'none' | 'simple' | 'tiered'>('none');
    const [cycleType, setCycleType] = useState<CashbackProgram['cycleType']>('calendar_month');
    const [statementDay, setStatementDay] = useState<number | null>(null);
    const [dueDate, setDueDate] = useState<number | null>(null);
    const [minSpendTarget, setMinSpendTarget] = useState<number | undefined>(undefined);
    const [defaultRate, setDefaultRate] = useState<number>(0);
    const [isAdvancedCashback, setIsAdvancedCashback] = useState(false);
    const [levels, setLevels] = useState<LevelState[]>([]);
    const [isCategoryRestricted, setIsCategoryRestricted] = useState(false);
    const [restrictedCategoryIds, setRestrictedCategoryIds] = useState<string[]>([]);
    const [maxCashback, setMaxCashback] = useState<number | undefined>(undefined);
*/

export function LegacyCashbackUI({
    isCashbackEnabled,
    setIsCashbackEnabled,
    cbType,
    setCbType,
    isAdvancedCashback,
    setIsAdvancedCashback,
    cycleType,
    setCycleType,
    minSpendTarget,
    setMinSpendTarget,
    defaultRate,
    setDefaultRate,
    maxCashback,
    setMaxCashback,
    isCategoryRestricted,
    setIsCategoryRestricted,
    restrictedCategoryIds,
    setRestrictedCategoryIds,
    levels,
    setLevels,
    categories,
    activeCategoryCallback,
    setActiveCategoryCallback,
    setIsCategoryDialogOpen
}: any) {
    return (
        <div className="pt-4 border-t border-slate-200">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-1.5 rounded-full">
                            {/* <Coins className="h-3.5 w-3.5 text-amber-600" /> */}
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">Chính sách Hoàn tiền</h3>
                        {/* <Switch
                            checked={isCashbackEnabled}
                            onCheckedChange={(checked) => {
                                setIsCashbackEnabled(checked);
                                if (checked && cbType === 'none') setCbType('simple');
                            }}
                            className="scale-75"
                        /> */}
                    </div>
                    {/* ... Rest of the toggle UI ... */}
                </div>

                {isCashbackEnabled && (
                    <div className="flex flex-col">
                        {/* Simple Mode Inputs... */}
                        {/* Advanced Mode (Levels)... */}
                    </div>
                )}
            </div>
        </div>
    );
}
