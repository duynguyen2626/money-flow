"use client";

import { useEffect, useMemo } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import {
  Landmark,
  CreditCard,
  Wallet,
  Smartphone,
  PiggyBank,
  Pencil,
  Database,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";

import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SingleTransactionFormValues } from "../types";
import { Account, Person } from "@/types/moneyflow.types";
import { Combobox, ComboboxGroup } from "@/components/ui/combobox";

type AccountSelectorProps = {
  accounts: Account[];
  people: Person[];
  onAddNewAccount?: () => void;
  onAddNewPerson?: () => void;
  onEditAccount?: (accountId: string) => void;
};

function getPocketBaseAccountAdminUrl(accountId: string): string {
  const encoded = encodeURIComponent(accountId);
  return `https://api-db.reiwarden.io.vn/_/#/collections?collection=pvl_acc_001&filter=${encoded}&sort=-%40rowid`;
}

function AccountActionBadges({
  accountId,
  onEditAccount,
}: {
  accountId: string | null | undefined;
  onEditAccount?: (accountId: string) => void;
}) {
  if (!accountId) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onEditAccount?.(accountId)}
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-md border px-2.5 h-7 shadow-sm transition-colors",
          "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
        )}
        title="Edit selected account"
        aria-label="Edit selected account"
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold">Edit</span>
      </button>
      <button
        type="button"
        onClick={() => {
          window.open(
            getPocketBaseAccountAdminUrl(accountId),
            "_blank",
            "noopener,noreferrer",
          );
        }}
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-md border px-2.5 h-7 shadow-sm transition-colors",
          "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300",
        )}
        title="Open in PocketBase Admin"
        aria-label="Open in PocketBase Admin"
      >
        <Database className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold">DB</span>
      </button>
    </div>
  );
}

export function AccountSelector({
  accounts,
  people,
  onAddNewAccount,
  onEditAccount,
}: AccountSelectorProps) {
  const form = useFormContext<SingleTransactionFormValues>();
  const type = useWatch({ control: form.control, name: "type" });
  const personId = useWatch({ control: form.control, name: "person_id" });
  const sourceId = useWatch({
    control: form.control,
    name: "source_account_id",
  });
  const targetId = useWatch({
    control: form.control,
    name: "target_account_id",
  });

  const params = useParams();
  const currentAccountId = params?.id as string | undefined;

  const selectedPerson = useMemo(
    () => people.find((p) => p.id === personId),
    [people, personId],
  );

  // Mode detection
  const isSpecialMode = ["transfer", "credit_pay", "invest"].includes(type);

  // Smart Type Inferrer
  useEffect(() => {
    if (isSpecialMode) return;

    if (personId) {
      if (sourceId && !targetId) form.setValue("type", "debt");
      else if (!sourceId && targetId) form.setValue("type", "repayment");
    } else {
      if (sourceId && !targetId) form.setValue("type", "expense");
      else if (!sourceId && targetId) form.setValue("type", "income");
    }
  }, [sourceId, targetId, personId, isSpecialMode, form]);

  // Enforce BẬP BÊNH from Type (inverse logic)
  useEffect(() => {
    if (isSpecialMode) return;

    if (["income", "repayment"].includes(type)) {
      if (sourceId) form.setValue("source_account_id", null);
    } else if (["expense", "debt"].includes(type)) {
      if (targetId) form.setValue("target_account_id", null);
    }
  }, [type, isSpecialMode, sourceId, targetId, form]);

  // Filtering logic for special rules
  const mapAccountToItem = (a: Account) => {
    let typeIcon = null;
    let typeLabel: any = a.type || "Acc";
    let colorClass = "text-slate-500 border-slate-200 bg-slate-50";

    switch (a.type) {
      case "bank":
        typeIcon = <Landmark className="h-2.5 w-2.5" />;
        typeLabel = "Bank";
        colorClass = "text-blue-600 border-blue-200 bg-blue-50";
        break;
      case "credit_card":
        typeIcon = <CreditCard className="h-2.5 w-2.5" />;
        typeLabel = "Credit";
        colorClass = "text-violet-600 border-violet-200 bg-violet-50";
        break;
      case "cash":
        typeIcon = <Wallet className="h-2.5 w-2.5" />;
        typeLabel = "Cash";
        colorClass = "text-emerald-600 border-emerald-200 bg-emerald-50";
        break;
      case "ewallet":
        typeIcon = <Smartphone className="h-2.5 w-2.5" />;
        typeLabel = "Wallet";
        colorClass = "text-orange-600 border-orange-200 bg-orange-50";
        break;
      case "savings":
      case "investment":
        typeIcon = <PiggyBank className="h-2.5 w-2.5" />;
        typeLabel = "Saving";
        colorClass = "text-sky-600 border-sky-200 bg-sky-50";
        break;
      default:
        typeIcon = <Landmark className="h-2.5 w-2.5" />;
        typeLabel = a.type || "Acc";
    }

    return {
      value: a.id,
      label: a.name,
      icon: a.image_url ? (
        <img
          src={a.image_url}
          alt=""
          className="w-5 h-auto max-w-[20px] object-contain rounded-none"
        />
      ) : undefined,
      badge: (
        <div
          className={`flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${colorClass}`}
        >
          {typeIcon}
          <span>{typeLabel}</span>
        </div>
      ),
    };
  };

  const getAccountGroups = (side: "source" | "target"): ComboboxGroup[] => {
    let filtered = accounts;

    if (type === "transfer") {
      if (side === "source" && targetId)
        filtered = accounts.filter((a) => a.id !== targetId);
      if (side === "target" && sourceId)
        filtered = accounts.filter((a) => a.id !== sourceId);
    } else if (type === "credit_pay") {
      if (side === "source")
        filtered = accounts.filter((a) => a.type !== "credit_card");
      else filtered = accounts.filter((a) => a.type === "credit_card");
    }

    const currentAccount = currentAccountId
      ? filtered.find((a) => a.id === currentAccountId)
      : null;
    const creditAccounts = filtered.filter(
      (a) => a.type === "credit_card" && a.id !== currentAccountId,
    );
    const cashAccounts = filtered.filter(
      (a) =>
        a.type !== "credit_card" &&
        a.type !== "debt" &&
        a.id !== currentAccountId,
    );

    return [
      ...(currentAccount
        ? [
            {
              label: "Current Account",
              items: [mapAccountToItem(currentAccount)],
            },
          ]
        : []),
      ...(creditAccounts.length > 0
        ? [
            {
              label: "Credit Cards",
              items: creditAccounts.map(mapAccountToItem),
            },
          ]
        : []),
      { label: "Cash & Banks", items: cashAccounts.map(mapAccountToItem) },
    ];
  };

  const isIncomeFlow = !sourceId && !!targetId;
  const isExpenseFlow = !!sourceId && !targetId;
  const isTransferFlow = isSpecialMode || (!!sourceId && !!targetId);

  // --- Dynamic Placeholder Logic (BẬP BÊNH) ---
  const sourcePlaceholder = useMemo(() => {
    if (targetId && !isSpecialMode) {
      if (personId) return `Payer: ${selectedPerson?.name || "Person"}`;
      return "Receiving Mode (Bank Active)";
    }
    return "Choose Pay With";
  }, [targetId, isSpecialMode, personId, selectedPerson]);

  const targetPlaceholder = useMemo(() => {
    if (sourceId && !isSpecialMode) {
      if (personId) return `Borrower: ${selectedPerson?.name || "Person"}`;
      return "Spending Mode (Bank Active)";
    }
    return "Choose Deposit To";
  }, [sourceId, isSpecialMode, personId, selectedPerson]);

  return (
    <div className="space-y-4 pt-1">
      {/* ACCOUNT FLOW */}
      <div className="grid grid-cols-2 gap-4 items-start relative">
        {/* Visual Connector: The BẬP BÊNH beam */}
        <div className="absolute left-1/2 top-11 -translate-x-1/2 w-8 h-[2px] bg-slate-100 z-0 hidden sm:block" />

        {/* SOURCE */}
        <div className="space-y-1.5 z-10">
          <div className="flex items-center justify-between mb-1">
            <FormLabel
              className={cn(
                "text-[10px] font-black uppercase tracking-wider block transition-colors",
                isIncomeFlow ? "text-slate-200" : "text-rose-500",
              )}
            >
              Pay With (Từ)
            </FormLabel>
            <div className="flex h-7 min-w-[124px] items-center justify-end">
              {!isIncomeFlow && (
                <AccountActionBadges
                  accountId={sourceId || null}
                  onEditAccount={onEditAccount}
                />
              )}
            </div>
          </div>

          <Controller
            control={form.control}
            name="source_account_id"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex items-center gap-1">
                    <Combobox
                      groups={getAccountGroups("source")}
                      value={field.value ?? undefined}
                      onValueChange={(val) => {
                        field.onChange(val || undefined); // Use undefined instead of null to fix lint
                        // BẬP BÊNH logic: Selecting source clears target if standard mode
                        if (val && !isSpecialMode && targetId) {
                          form.setValue("target_account_id", undefined as any);
                        }
                      }}
                      placeholder={sourcePlaceholder}
                      hideTriggerBadge
                      hideClearButton
                      triggerClassName={cn(
                        "h-11 border-slate-200 transition-all duration-300",
                        isIncomeFlow &&
                          "opacity-40 border-dashed bg-slate-50 grayscale",
                        field.value &&
                          "border-rose-100 shadow-sm ring-1 ring-rose-50",
                      )}
                      className="w-full"
                      onAddNew={onAddNewAccount}
                      addLabel="Account"
                    />
                    {field.value && !isIncomeFlow && (
                      <button
                        type="button"
                        onClick={() => field.onChange(undefined)}
                        className="flex h-11 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:text-slate-700"
                        aria-label="Clear source account"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* TARGET */}
        <div className="space-y-1.5 z-10">
          <div className="flex items-center justify-between mb-1">
            <FormLabel
              className={cn(
                "text-[10px] font-black uppercase tracking-wider block transition-colors",
                isExpenseFlow ? "text-slate-200" : "text-emerald-500",
              )}
            >
              Deposit To (Đến)
            </FormLabel>
            <div className="flex h-7 min-w-[124px] items-center justify-end">
              {!isExpenseFlow && (
                <AccountActionBadges
                  accountId={targetId || null}
                  onEditAccount={onEditAccount}
                />
              )}
            </div>
          </div>

          <Controller
            control={form.control}
            name="target_account_id"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex items-center gap-1">
                    <Combobox
                      groups={getAccountGroups("target")}
                      value={field.value ?? undefined}
                      onValueChange={(val) => {
                        field.onChange(val || undefined);
                        // BẬP BÊNH logic: Selecting target clears source if standard mode
                        if (val && !isSpecialMode && sourceId) {
                          form.setValue("source_account_id", undefined as any);
                        }
                      }}
                      placeholder={targetPlaceholder}
                      hideTriggerBadge
                      hideClearButton
                      triggerClassName={cn(
                        "h-11 border-slate-200 transition-all duration-300",
                        isExpenseFlow &&
                          "opacity-40 border-dashed bg-slate-50 grayscale",
                        field.value &&
                          "border-emerald-100 shadow-sm ring-1 ring-emerald-50",
                      )}
                      className="w-full"
                      onAddNew={onAddNewAccount}
                      addLabel="Account"
                    />
                    {field.value && !isExpenseFlow && (
                      <button
                        type="button"
                        onClick={() => field.onChange(undefined)}
                        className="flex h-11 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:text-slate-700"
                        aria-label="Clear target account"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
