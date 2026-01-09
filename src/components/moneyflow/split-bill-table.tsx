"use client";

import { useState } from "react";
import { X, Plus, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type SplitBillParticipant = {
  personId: string;
  name: string;
  amount: number;
  paidBy: string;
  note: string;
  paidBefore?: number;
  linkedTransactionId?: string; // New: ID of the child transaction if it exists
};

type SplitBillTableProps = {
  participants: SplitBillParticipant[];
  totalAmount: number;
  onAmountChange: (personId: string, amount: number) => void;
  onPaidByChange: (personId: string, paidBy: string) => void;
  onNoteChange: (personId: string, note: string) => void;
  onPaidBeforeChange: (personId: string, paidBefore: number) => void;
  onRemove: (personId: string) => void;
  allowPaidBefore?: boolean;
  error?: string | null;
  onEditTransaction?: (transactionId: string) => void; // New: Callback to edit child
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const parseAmount = (value: string) => {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

export function SplitBillTable({
  participants,
  totalAmount,
  onAmountChange,
  onPaidByChange,
  onNoteChange,
  onPaidBeforeChange,
  onRemove,
  allowPaidBefore = true,
  error,
  onEditTransaction,
}: SplitBillTableProps) {
  const [paidBeforeModal, setPaidBeforeModal] = useState<{
    personId: string;
    name: string;
    value: number;
  } | null>(null);
  const [paidBeforeInput, setPaidBeforeInput] = useState("");

  const openPaidBefore = (participant: SplitBillParticipant) => {
    setPaidBeforeModal({
      personId: participant.personId,
      name: participant.name,
      value: participant.paidBefore ?? 0,
    });
    setPaidBeforeInput(
      participant.paidBefore ? participant.paidBefore.toString() : "",
    );
  };

  const closePaidBefore = () => {
    setPaidBeforeModal(null);
    setPaidBeforeInput("");
  };

  const savePaidBefore = () => {
    if (!paidBeforeModal) return;
    const amount = parseAmount(paidBeforeInput);
    onPaidBeforeChange(paidBeforeModal.personId, amount);
    closePaidBefore();
  };

  const splitTotal = participants.reduce((sum, row) => sum + (row.amount || 0), 0);

  if (participants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Add at least one participant to split the bill.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Person</th>
              <th className="px-3 py-2 text-left font-semibold">Share</th>
              <th className="px-3 py-2 text-left font-semibold">Paid by</th>
              <th className="px-3 py-2 text-left font-semibold">Note</th>
              <th className="px-3 py-2" aria-label="Remove" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {participants.map((row) => (
              <tr key={row.personId} className="bg-white">
                <td className="px-3 py-2 text-slate-800">
                  <div className="flex items-center gap-2">
                    {row.name}
                    {row.linkedTransactionId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTransaction?.(row.linkedTransactionId!);
                        }}
                        className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 ring-1 ring-inset ring-blue-700/10"
                      >
                        Edit <ExternalLink className="ml-1 h-3 w-3" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.amount.toString()}
                    onChange={(event) =>
                      onAmountChange(row.personId, parseAmount(event.target.value))
                    }
                    inputMode="decimal"
                    className="h-9"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.paidBy}
                    onChange={(event) =>
                      onPaidByChange(row.personId, event.target.value)
                    }
                    placeholder="Me"
                    className="h-9"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={row.note}
                      onChange={(event) =>
                        onNoteChange(row.personId, event.target.value)
                      }
                      placeholder="Optional"
                      className="h-9"
                    />
                    {allowPaidBefore ? (
                      <button
                        type="button"
                        onClick={() => openPaidBefore(row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                        aria-label={`Paid before for ${row.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  {allowPaidBefore && row.paidBefore && row.paidBefore > 0 ? (
                    <p className="mt-1 text-[11px] text-slate-500 normal-nums">
                      Paid before: {numberFormatter.format(row.paidBefore)}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(row.personId)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label={`Remove ${row.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {participants.map((row) => (
          <div
            key={row.personId}
            className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                {row.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(row.personId)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={`Remove ${row.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Share</label>
              <Input
                value={row.amount.toString()}
                onChange={(event) =>
                  onAmountChange(row.personId, parseAmount(event.target.value))
                }
                inputMode="decimal"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Paid by</label>
              <Input
                value={row.paidBy}
                onChange={(event) =>
                  onPaidByChange(row.personId, event.target.value)
                }
                placeholder="Me"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Note</label>
              <div className="flex items-center gap-2">
                <Input
                  value={row.note}
                  onChange={(event) =>
                    onNoteChange(row.personId, event.target.value)
                  }
                  placeholder="Optional"
                  className="h-9"
                />
                {allowPaidBefore ? (
                  <button
                    type="button"
                    onClick={() => openPaidBefore(row)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                    aria-label={`Paid before for ${row.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {allowPaidBefore && row.paidBefore && row.paidBefore > 0 ? (
                <p className="text-[11px] text-slate-500 normal-nums">
                  Paid before: {numberFormatter.format(row.paidBefore)}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="normal-nums">Split total: {numberFormatter.format(splitTotal)}</span>
        <span className="normal-nums">Amount: {numberFormatter.format(totalAmount)}</span>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {allowPaidBefore ? (
        <Dialog
          open={Boolean(paidBeforeModal)}
          onOpenChange={(open) => !open && closePaidBefore()}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                Paid before {paidBeforeModal?.name ?? ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={paidBeforeInput}
                onChange={(event) => setPaidBeforeInput(event.target.value)}
                inputMode="decimal"
                placeholder="0"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closePaidBefore}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePaidBefore}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Save
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
