"use client";

import { useState, useEffect } from "react";
import { X, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, type SelectItem } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { SplitBillParticipant, VoucherDistributionMode } from "../types";

export type { SplitBillParticipant, VoucherDistributionMode };

type SplitBillSectionProps = {
    participants: SplitBillParticipant[];
    totalAmount: number;
    onParticipantsChange: (participants: SplitBillParticipant[]) => void;
    onRemove: (personId: string) => void;
    error?: string | null;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => numberFormatter.format(value);

const parseAmount = (value: string): number => {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export function SplitBillSection({
    participants = [],
    totalAmount,
    onParticipantsChange,
    onRemove,
    error,
}: SplitBillSectionProps) {
    const [totalVoucher, setTotalVoucher] = useState(0);
    const [voucherMode, setVoucherMode] = useState<VoucherDistributionMode>("equal");
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<SplitBillParticipant | null>(null);
    const [settingsForm, setSettingsForm] = useState({
        advanceAmount: "",
        paidBy: "",
        note: "",
    });

    // Validated participants array to avoid crashes
    const safeParticipants = Array.isArray(participants) ? participants : [];

    // Auto-distribute voucher when mode or total changes
    useEffect(() => {
        if (totalVoucher > 0 && safeParticipants.length > 0) {
            const updated = distributeVoucher(totalVoucher, voucherMode, safeParticipants);
            onParticipantsChange(updated);
        } else if (totalVoucher === 0) {
            // Clear vouchers
            const updated = safeParticipants.map(p => ({
                ...p,
                voucherAmount: 0,
                finalShare: p.shareBefore,
            }));
            if (updated.length > 0) onParticipantsChange(updated);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalVoucher, voucherMode]);

    const distributeVoucher = (
        voucher: number,
        mode: VoucherDistributionMode,
        parts: SplitBillParticipant[]
    ): SplitBillParticipant[] => {
        if (mode === "equal") {
            const count = parts.length;
            const voucherEach = Math.floor(voucher / count);
            const remainder = voucher - voucherEach * count;

            return parts.map((p, i) => {
                const vAmount = i === 0 ? voucherEach + remainder : voucherEach;
                return {
                    ...p,
                    voucherAmount: vAmount,
                    finalShare: p.shareBefore - vAmount,
                };
            });
        } else {
            // Proportional
            const totalBefore = parts.reduce((sum, p) => sum + p.shareBefore, 0);
            if (totalBefore === 0) return parts;

            let distributed = 0;
            return parts.map((p, i) => {
                const ratio = p.shareBefore / totalBefore;
                const vAmount =
                    i === parts.length - 1
                        ? voucher - distributed
                        : Math.floor(voucher * ratio);

                distributed += vAmount;

                return {
                    ...p,
                    voucherAmount: vAmount,
                    finalShare: p.shareBefore - vAmount,
                };
            });
        }
    };

    const handleShareBeforeChange = (personId: string, value: number) => {
        const updated = safeParticipants.map((p) =>
            p.personId === personId
                ? { ...p, shareBefore: value, finalShare: value - p.voucherAmount }
                : p
        );
        onParticipantsChange(updated);

        // Re-distribute voucher if in proportional mode
        if (totalVoucher > 0 && voucherMode === "proportional") {
            const redistributed = distributeVoucher(totalVoucher, voucherMode, updated);
            onParticipantsChange(redistributed);
        }
    };

    const handleAutoSplitEqual = () => {
        const count = safeParticipants.length;
        if (count === 0) return;

        const shareEach = Math.floor(totalAmount / count);
        const remainder = totalAmount - shareEach * count;

        const updated = safeParticipants.map((p, i) => ({
            ...p,
            shareBefore: i === 0 ? shareEach + remainder : shareEach,
            finalShare: (i === 0 ? shareEach + remainder : shareEach) - p.voucherAmount,
        }));

        onParticipantsChange(updated);

        // Re-distribute voucher
        if (totalVoucher > 0) {
            const redistributed = distributeVoucher(totalVoucher, voucherMode, updated);
            onParticipantsChange(redistributed);
        }
    };

    const openSettings = (participant: SplitBillParticipant) => {
        setSelectedParticipant(participant);
        setSettingsForm({
            advanceAmount: participant.advanceAmount ? participant.advanceAmount.toString() : "",
            paidBy: participant.paidBy || "Me (Mine)",
            note: participant.note || "",
        });
        setSettingsModalOpen(true);
    };

    const closeSettings = () => {
        setSettingsModalOpen(false);
        setSelectedParticipant(null);
    };

    const saveSettings = () => {
        if (!selectedParticipant) return;

        const updated = safeParticipants.map((p) =>
            p.personId === selectedParticipant.personId
                ? {
                    ...p,
                    advanceAmount: parseAmount(settingsForm.advanceAmount),
                    paidBy: settingsForm.paidBy || "Me (Mine)",
                    note: settingsForm.note,
                }
                : p
        );

        onParticipantsChange(updated);
        closeSettings();
    };

    const summary = {
        totalBefore: safeParticipants.reduce((sum, p) => sum + p.shareBefore, 0),
        totalVoucher: safeParticipants.reduce((sum, p) => sum + p.voucherAmount, 0),
        totalAdvance: safeParticipants.reduce((sum, p) => sum + (p.advanceAmount || 0), 0),
        totalFinal: safeParticipants.reduce((sum, p) => sum + p.finalShare, 0),
    };
    summary.netAmount = summary.totalFinal - summary.totalAdvance;

    if (safeParticipants.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Add at least one participant to split the bill.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Voucher Settings */}
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-amber-900 block mb-1">
                            🎁 Total Voucher
                        </label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            value={totalVoucher > 0 ? formatCurrency(totalVoucher) : ""}
                            onChange={(e) => setTotalVoucher(parseAmount(e.target.value))}
                            placeholder="0"
                            className="bg-white"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-amber-900 block mb-1">
                            Distribution Mode
                        </label>
                        <Select
                            items={[
                                { value: "equal", label: "⚡ Equal (Default)" },
                                { value: "proportional", label: "📊 Proportional" }
                            ]}
                            value={voucherMode}
                            onValueChange={(v) => setVoucherMode((v || "equal") as VoucherDistributionMode)}
                            className="bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold">Person</th>
                                <th className="px-3 py-2 text-right font-semibold">Share Before</th>
                                <th className="px-3 py-2 text-right font-semibold">Voucher</th>
                                <th className="px-3 py-2 text-right font-semibold">Final Share</th>
                                <th className="px-3 py-2 text-center font-semibold">Advance</th>
                                <th className="px-3 py-2 text-center" aria-label="Actions" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {safeParticipants.map((row) => (
                                <tr key={row.personId} className="bg-white hover:bg-slate-50">
                                    <td className="px-3 py-2 text-slate-800 font-medium">{row.name}</td>
                                    <td className="px-3 py-2">
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            value={formatCurrency(row.shareBefore)}
                                            onChange={(e) =>
                                                handleShareBeforeChange(row.personId, parseAmount(e.target.value))
                                            }
                                            className="h-9 text-right tabular-nums"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-amber-600 font-medium">
                                        -{formatCurrency(row.voucherAmount)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums font-bold">
                                        {formatCurrency(row.finalShare)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {row.advanceAmount && row.advanceAmount > 0 ? (
                                            <button
                                                onClick={() => openSettings(row)}
                                                className="text-xs font-mono text-emerald-600 hover:underline"
                                            >
                                                {formatCurrency(row.advanceAmount)}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => openSettings(row)}
                                                className="text-slate-400 hover:text-slate-600 text-sm"
                                            >
                                                -
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => openSettings(row)}
                                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600"
                                                title="Settings"
                                            >
                                                <Settings className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onRemove(row.personId)}
                                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-600"
                                                title="Remove"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
                {safeParticipants.map((row) => (
                    <div
                        key={row.personId}
                        className="bg-white rounded-lg border border-slate-200 p-3 space-y-2"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-800">{row.name}</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => openSettings(row)}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-400"
                                >
                                    <Settings className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onRemove(row.personId)}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-400"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <div className="text-xs text-slate-500">Share Before</div>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatCurrency(row.shareBefore)}
                                    onChange={(e) =>
                                        handleShareBeforeChange(row.personId, parseAmount(e.target.value))
                                    }
                                    className="h-8 text-right tabular-nums mt-1"
                                />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Voucher</div>
                                <div className="font-mono text-amber-600 mt-1 h-8 flex items-center justify-end">
                                    -{formatCurrency(row.voucherAmount)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Final Share</div>
                                <div className="font-mono font-bold mt-1">{formatCurrency(row.finalShare)}</div>
                            </div>
                            {row.advanceAmount && row.advanceAmount > 0 && (
                                <div>
                                    <div className="text-xs text-slate-500">Advance</div>
                                    <button
                                        onClick={() => openSettings(row)}
                                        className="font-mono text-emerald-600 hover:underline mt-1"
                                    >
                                        {formatCurrency(row.advanceAmount)}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 rounded-lg p-3 text-sm border border-slate-200">
                <div>
                    <div className="text-slate-600 text-xs">Before</div>
                    <div className="font-mono font-bold">{formatCurrency(summary.totalBefore)}</div>
                </div>

                <div>
                    <div className="text-slate-600 text-xs">Voucher</div>
                    <div className="font-mono font-bold text-amber-600">
                        -{formatCurrency(summary.totalVoucher)}
                    </div>
                </div>

                <div>
                    <div className="text-slate-600 text-xs">Final</div>
                    <div className="font-mono font-bold">{formatCurrency(summary.totalFinal)}</div>
                </div>

                <div>
                    <div className="text-slate-600 text-xs">Advance</div>
                    <div className="font-mono font-bold text-emerald-600">
                        -{formatCurrency(summary.totalAdvance)}
                    </div>
                </div>

                <div>
                    <div className="text-slate-600 text-xs font-semibold">Net</div>
                    <div className="font-mono font-bold text-lg text-indigo-600">
                        {formatCurrency(summary.netAmount)}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleAutoSplitEqual}>
                    ⚡ Auto Split Equal
                </Button>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            {/* Settings Modal */}
            <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Settings - {selectedParticipant?.name}</DialogTitle>
                        <DialogDescription>
                            Configure advanced options for this participant
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Advance Payment */}
                        <div>
                            <label className="text-sm font-medium flex items-center gap-2">
                                💰 Advance Payment
                                <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                            </label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                value={settingsForm.advanceAmount}
                                onChange={(e) =>
                                    setSettingsForm({ ...settingsForm, advanceAmount: e.target.value })
                                }
                                placeholder="0"
                                className="mt-1"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Amount paid in advance by this person
                            </p>
                        </div>

                        {/* Paid By */}
                        <div>
                            <label className="text-sm font-medium">💳 Paid By</label>
                            <Input
                                value={settingsForm.paidBy}
                                onChange={(e) => setSettingsForm({ ...settingsForm, paidBy: e.target.value })}
                                placeholder="Me (Mine)"
                                className="mt-1"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Who actually paid for this person's share
                            </p>
                        </div>

                        {/* Note */}
                        <div>
                            <label className="text-sm font-medium flex items-center gap-2">
                                📝 Note
                                <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                            </label>
                            <Textarea
                                value={settingsForm.note}
                                onChange={(e) => setSettingsForm({ ...settingsForm, note: e.target.value })}
                                placeholder="Additional notes..."
                                rows={2}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={closeSettings}>
                                Cancel
                            </Button>
                            <Button onClick={saveSettings}>Save Settings</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
