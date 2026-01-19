import React from 'react';
import { Person } from "@/types/moneyflow.types";
import { Badge } from "@/components/ui/badge";

interface PeopleRowDetailsProps {
    person: Person;
    isExpanded: boolean;
}

export function PeopleRowDetailsV2({ person, isExpanded }: PeopleRowDetailsProps) {
    if (!isExpanded) return null;

    const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);

    return (
        <div className="p-3 bg-muted/30 border-t animate-in fade-in duration-200">
            <div className="flex gap-6">
                {/* Left: Sheet Link & Subscriptions */}
                <div className="w-64 flex-shrink-0 space-y-3 pr-6 border-r border-slate-200">
                    {person.sheet_link && (
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Sheet Link</p>
                            <a href={person.sheet_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs font-medium">
                                Open Sheet &rarr;
                            </a>
                        </div>
                    )}

                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">Subscriptions</p>
                        {person.subscription_details && person.subscription_details.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {person.subscription_details.map((sub, idx) => (
                                    <div key={`${sub.id}-${idx}`} className="flex items-center gap-1.5 text-xs bg-slate-50 p-1 rounded border border-slate-100">
                                        {sub.image_url ? (
                                            <img
                                                src={sub.image_url}
                                                alt={sub.name}
                                                className="w-4 h-4 rounded-full object-cover ring-1 ring-slate-200"
                                            />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-500">
                                                {sub.name[0]}
                                            </div>
                                        )}
                                        <span className="font-medium text-slate-700 flex-1 text-xs">{sub.name}</span>
                                        <Badge variant="secondary" className="h-4 px-1 min-w-[18px] justify-center bg-indigo-100 text-indigo-700 font-bold border-none text-[9px]">
                                            x{sub.slots}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No subscriptions</p>
                        )}
                    </div>
                </div>

                {/* Right: Financial Breakdown */}
                <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Financial Breakdown</p>
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {/* Current Cycle */}
                        <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 flex items-center gap-1">
                                Current
                                {person.current_cycle_label && <span className="text-blue-600 bg-blue-50 px-1 rounded text-[8px]">{person.current_cycle_label}</span>}
                            </p>
                            <p className="text-sm font-bold text-slate-700">
                                {formatMoney(person.current_cycle_debt || 0)}
                            </p>
                        </div>
                        {/* Previous */}
                        <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Previous Debt</p>
                            <p className="text-sm font-bold text-slate-700">
                                {formatMoney(person.outstanding_debt || 0)}
                            </p>
                        </div>
                        {/* Total */}
                        <div className="border-l pl-3 border-slate-200">
                            <p className="text-[9px] uppercase font-bold text-rose-600 mb-0.5">Total Outstanding</p>
                            <p className="text-base font-black text-rose-700">
                                {formatMoney((person.current_cycle_debt || 0) + (person.outstanding_debt || 0))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
