
import { getInstallmentById } from "@/services/installment.service";
import { loadTransactions } from "@/services/transaction.service";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { UnifiedTransactionTable } from "@/components/moneyflow/unified-transaction-table";
import { ArrowLeft, Calendar, CreditCard, PiggyBank, Receipt } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TransactionWithDetails } from "@/types/moneyflow.types";

export default async function InstallmentDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let installment;
    let transactions: TransactionWithDetails[] = [];

    try {
        installment = await getInstallmentById(id);
        if (!installment) {
            redirect("/installments");
        }
        transactions = await loadTransactions({ installmentPlanId: id });
    } catch (e) {
        // If redirect happens in getInstallmentById catch block or if fetch fails
        // Actually redirect throws internal error to navigate, so we should separate logic
        // But getInstallmentById helper might not throw redirect.
        // Let's assume catch is for errors.
        console.error(e);
        // If we can't get installment, we can't show page. Redirect is safe only if not rendered yet?
        // Server component: redirect works.
    }

    // Explicit check again
    if (!installment) {
        redirect("/installments");
    }

    return (
        <div className="container py-6 space-y-6 max-w-7xl">
            {/* Header & Back Link */}
            <div className="flex items-center gap-4">
                <Link
                    href="/installments"
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {installment.name}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Installment Plan</span>
                        <span>•</span>
                        <span className="font-mono">{id.split("-")[0]}</span>
                    </div>
                </div>
                <div className="ml-auto">
                    <Badge variant={installment.status === 'active' ? 'default' : 'secondary'} className="uppercase">
                        {installment.status}
                    </Badge>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5" /> Total Amount
                    </span>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(installment.total_amount)}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                        <PiggyBank className="w-3.5 h-3.5" /> Remaining
                    </span>
                    <div className="text-2xl font-bold text-rose-600">{formatCurrency(installment.remaining_amount)}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Monthly Pay
                    </span>
                    <div className="text-2xl font-bold text-slate-700">{formatCurrency(installment.monthly_amount)}</div>
                    <div className="text-xs text-slate-400">Next Due: {installment.next_due_date ? format(new Date(installment.next_due_date), "dd/MM/yyyy") : "N/A"}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Term
                    </span>
                    <div className="text-2xl font-bold text-slate-700">{installment.term_months} Months</div>
                    <div className="text-xs text-slate-400">Started: {format(new Date(installment.start_date), "dd/MM/yyyy")}</div>
                </div>
            </div>

            {/* Transaction History Table */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-slate-500" />
                    Repayment History
                </h3>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <UnifiedTransactionTable
                        data={transactions}
                    />
                </div>
            </div>
        </div>
    );
}
