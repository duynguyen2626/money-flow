"use client";

import { Installment } from "@/services/installment.service";
import { Copy, CheckCheck, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";

import { InstallmentDetailsDialog } from "./installment-details-dialog";
import { AddTransactionDialog } from "@/components/moneyflow/add-transaction-dialog";
import Link from "next/link";

interface InstallmentTableProps {
  installments: Installment[];
  highlightTxnId?: string | null;
  accounts?: Account[];
  categories?: Category[];
  people?: Person[];
  shops?: Shop[];
}

export function InstallmentTable({
  installments,
  highlightTxnId,
  accounts = [],
  categories = [],
  people = [],
  shops = [],
}: InstallmentTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(
    highlightTxnId ?? null,
  );

  // Clear highlight after 5 seconds for visual feedback
  const [paymentDialogState, setPaymentDialogState] = useState<{
    isOpen: boolean;
    installment: Installment | null;
    mode: "self" | "person";
  }>({
    isOpen: false,
    installment: null,
    mode: "self",
  });

  const handlePay = (inst: Installment, mode: "self" | "person") => {
    setPaymentDialogState({
      isOpen: true,
      installment: inst,
      mode,
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Original Txn</TableHead>
            <TableHead>Plan Name</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>People</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Monthly</TableHead>
            <TableHead>Next Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No active installments.
              </TableCell>
            </TableRow>
          ) : (
            installments.map((inst) => {
              const progress =
                ((inst.total_amount - inst.remaining_amount) /
                  inst.total_amount) *
                100;
              const isHighlighted =
                highlightedId && inst.original_transaction_id === highlightedId;
              return (
                <TableRow
                  key={inst.id}
                  className={cn(
                    isHighlighted &&
                    "bg-amber-100 animate-pulse ring-2 ring-amber-400",
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {inst.original_transaction_id ? (
                        <>
                          <span
                            className="font-mono text-xs text-muted-foreground"
                            title={inst.original_transaction_id}
                          >
                            {inst.original_transaction_id.slice(0, 8) + "..."}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(
                                inst.original_transaction_id!,
                              );
                              setCopiedId(inst.original_transaction_id!);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy ID"
                          >
                            {copiedId === inst.original_transaction_id ? (
                              <CheckCheck className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/installments/${inst.id}`} className="hover:text-blue-600 hover:underline">
                      {inst.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(inst.total_amount)} total
                    </div>
                  </TableCell>
                  <TableCell>
                    {inst.original_transaction?.account?.name || "-"}
                  </TableCell>
                  <TableCell>
                    {inst.original_transaction?.person?.name || "-"}
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(inst.monthly_amount)}</TableCell>
                  <TableCell>
                    {inst.next_due_date
                      ? format(new Date(inst.next_due_date), "dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inst.status === "active" ? "default" : "secondary"
                      }
                    >
                      {inst.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 items-center">
                      <Link
                        href={`/installments/${inst.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-slate-500 hover:text-blue-600")}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {inst.status === "active" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[10px] px-2"
                            onClick={() => handlePay(inst, "self")}
                          >
                            Pay (Self)
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[10px] px-2"
                            onClick={() => handlePay(inst, "person")}
                          >
                            Pay (Person)
                          </Button>
                        </>
                      )}
                      <InstallmentDetailsDialog
                        installment={inst}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Open menu</span>
                            <Copy className="h-4 w-4 rotate-90" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {paymentDialogState.installment && (
        <AddTransactionDialog
          isOpen={paymentDialogState.isOpen}
          onOpenChange={(open) =>
            setPaymentDialogState((prev) => ({ ...prev, isOpen: open }))
          }
          accounts={accounts}
          categories={categories}
          people={people}
          shops={shops}
          installments={installments}
          defaultType={
            paymentDialogState.mode === "person" ? "repayment" : "expense"
          }
          initialValues={{
            installment_plan_id: paymentDialogState.installment.id,
            amount: paymentDialogState.installment.monthly_amount,
            note: (() => {
              const inst = paymentDialogState.installment;
              const start = new Date(inst.start_date);
              const now = new Date();
              const diffMonths =
                (now.getFullYear() - start.getFullYear()) * 12 +
                (now.getMonth() - start.getMonth()) +
                1;
              const monthNum = Math.min(
                Math.max(1, diffMonths),
                inst.term_months,
              );
              return `${inst.name} (Month ${monthNum}/${inst.term_months})`;
            })(),
            person_id:
              paymentDialogState.mode === "person"
                ? (paymentDialogState.installment as any).original_transaction
                  ?.person_id
                : undefined,
          }}
        />
      )}
    </div>
  );
}
