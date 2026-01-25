import {
  getActiveInstallments,
  getCompletedInstallments,
  getPendingInstallmentTransactions,
} from "@/services/installment.service";
import { getAccounts } from "@/services/account.service";
import { getCategories } from "@/services/category.service";
import { getPeople } from "@/services/people.service";
import { getShops } from "@/services/shop.service";
import { InstallmentStats } from "@/components/installments/installment-stats";
import { InstallmentTable } from "@/components/installments/installment-table";
import { PendingInstallmentTable } from "@/components/installments/pending-installment-table";
import { Plus, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { CreateInstallmentDialog } from "@/components/installments/create-installment-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Installment Plans | Money Flow',
}

interface PageProps {
  searchParams: Promise<{ highlight?: string; tab?: string }>;
}

export default async function InstallmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const highlightTxnId = params.highlight ?? null;

  const [
    activeInstallments,
    completedInstallments,
    pendingTransactions,
    accounts,
    categories,
    people,
    shops,
  ] = await Promise.all([
    getActiveInstallments(),
    getCompletedInstallments(),
    getPendingInstallmentTransactions(),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Installment Plans
            </h2>
            <p className="text-muted-foreground">
              Manage your active installment plans and track progress.
            </p>
          </div>
          <CreateInstallmentDialog />
        </div>

        <InstallmentStats installments={activeInstallments} />

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending Setup
              {pendingTransactions && pendingTransactions.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {pendingTransactions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              <Clock className="h-4 w-4" />
              Active Plans
              {activeInstallments && activeInstallments.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {activeInstallments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="done" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="rounded-md border bg-amber-50/50 p-4 text-sm text-amber-800">
              <p className="font-medium">Pending Setup</p>
              <p>
                These transactions were marked as installments but haven&apos;t been
                set up yet. Click &quot;Setup Plan&quot; to configure terms.
              </p>
            </div>
            <PendingInstallmentTable
              transactions={pendingTransactions as any[]}
            />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <InstallmentTable
              installments={activeInstallments}
              highlightTxnId={highlightTxnId}
              accounts={accounts}
              categories={categories}
              people={people}
              shops={shops}
            />
          </TabsContent>

          <TabsContent value="done" className="space-y-4">
            <InstallmentTable
              installments={completedInstallments}
              highlightTxnId={highlightTxnId}
              accounts={accounts}
              categories={categories}
              people={people}
              shops={shops}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
