import { getPersonDetails, getDebtByTags } from '@/services/debt.service';
import { getAccounts, getAccountTransactions } from '@/services/account.service';
import { AddTransactionDialog } from '@/components/moneyflow/add-transaction-dialog';
import { DebtCycleFilter } from '@/components/moneyflow/debt-cycle-filter';
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions';
import { TagFilterProvider } from '@/context/tag-filter-context';
import { SheetSyncControls } from '@/components/people/sheet-sync-controls';
import { getCategories } from '@/services/category.service';
import { getPeople } from '@/services/people.service';
import { getShops } from '@/services/shop.service';
import { notFound } from 'next/navigation';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
    return currencyFormatter.format(value);
}

export default async function PeopleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (!id) {
        notFound();
    }

    const [person, debtCycles, transactions, accounts, categories, people, shops] = await Promise.all([
        getPersonDetails(id),
        getDebtByTags(id),
        getAccountTransactions(id, 100),
        getAccounts(),
        getCategories(),
        getPeople(),
        getShops(),
    ]);

    if (!person) {
        notFound();
    }

    const totalBalance = person.current_balance;
    const balanceColor = totalBalance > 0 ? 'text-green-600' : 'text-red-600';
    const balanceText = totalBalance > 0 ? 'Ho no minh' : 'Minh no ho';

    return (
        <TagFilterProvider>
            <div className="space-y-6">
                <section className="space-y-5 bg-white shadow rounded-lg p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            {person.avatar_url ? (
                                <img src={person.avatar_url} alt={person.name} className="h-16 w-16 object-contain" />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600">
                                    {person.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold">{person.name}</h1>
                                <p className="text-sm text-gray-500">{balanceText}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 sm:items-end">
                            <p className={`text-3xl font-bold ${balanceColor}`}>{formatCurrency(totalBalance)}</p>
                            <AddTransactionDialog
                                accounts={accounts}
                                categories={categories}
                                people={people}
                                shops={shops}
                                buttonText="Tat toan / Tra no"
                                defaultType={totalBalance > 0 ? 'repayment' : 'debt'}
                                defaultPersonId={id}
                                defaultAmount={Math.abs(totalBalance)}
                                buttonClassName="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-5">
                        <div className="mb-4">
                            <SheetSyncControls personId={person.owner_id ?? null} sheetLink={person.sheet_link} />
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold">Ky no (Debt Cycles)</h2>
                        </div>
                        <DebtCycleFilter
                            allCycles={debtCycles}
                            debtAccount={person}
                            accounts={accounts}
                            categories={categories}
                            people={people}
                            displayedCycles={debtCycles}
                            isExpanded
                            shops={shops}
                        />
                    </div>
                </section>

                <section className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between border-b pb-3">
                        <h2 className="text-lg font-semibold">Lich su giao dich</h2>
                        <span className="text-sm text-slate-500">{transactions.length} giao dich</span>
                    </div>
                    <div className="mt-4">
                        <FilterableTransactions transactions={transactions} />
                    </div>
                </section>
            </div>
        </TagFilterProvider>
    );
}
