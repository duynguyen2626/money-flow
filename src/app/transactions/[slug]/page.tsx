import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccounts } from "@/services/account.service";
import { getCategories } from "@/services/category.service";
import { getPeople } from "@/services/people.service";
import { getShops } from "@/services/shop.service";
import { getTransactionById } from "@/services/transaction.service";
import { FilterableTransactions } from "@/components/moneyflow/filterable-transactions";
import { TagFilterProvider } from "@/context/tag-filter-context";
import { QuickAddChat } from "@/components/ai/quick-add-chat";
import { TempTransactionGuard } from "@/components/moneyflow/temp-transaction-guard";
import { AddTransactionDialog } from "@/components/moneyflow/add-transaction-dialog";

export const dynamic = "force-dynamic";

export default async function TempTransactionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug.startsWith("temp-")) {
    return notFound();
  }
  const transactionId = slug.replace(/^temp-/, "");
  if (!transactionId) {
    return notFound();
  }

  const [accounts, categories, people, shops, transaction] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getTransactionById(transactionId, true),
  ]);

  return (
    <TagFilterProvider>
      <TempTransactionGuard />
      <div className="flex h-full overflow-hidden overflow-x-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="h-full w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">
                    Temporary Transaction View
                  </h1>
                  <p className="text-xs text-slate-500">
                    This view is temporary. Refreshing or closing the tab will
                    lose it.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {transaction && (
                    <AddTransactionDialog
                      accounts={accounts}
                      categories={categories}
                      people={people}
                      shops={shops}
                      mode="edit"
                      transactionId={transaction.id}
                      buttonText="Edit"
                      buttonClassName="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                    />
                  )}
                  <Link
                    href="/transactions"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Back to Transactions
                  </Link>
                </div>
              </div>
            </div>
            {transaction ? (
              <FilterableTransactions
                transactions={[transaction]}
                categories={categories}
                accounts={accounts}
                people={people}
                shops={shops}
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Transaction not found. Try submitting again.
              </div>
            )}
          </div>
        </div>
      </div>
      <QuickAddChat
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        variant="floating"
      />
    </TagFilterProvider>
  );
}
