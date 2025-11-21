import { getPersonDetails, getDebtByTags } from '@/services/debt.service';
import { getAccounts, getAccountTransactions } from '@/services/account.service';
import { getCategories } from '@/services/category.service';
import { getPersonWithSubs } from '@/services/people.service';
import { getSubscriptions } from '@/services/subscription.service';
import { SettleDebtButton } from '@/components/moneyflow/settle-debt-button';
import { DebtCycleFilter } from '@/components/moneyflow/debt-cycle-filter';
import { FilterableTransactions } from '@/components/moneyflow/filterable-transactions';
import { TagFilterProvider } from '@/context/tag-filter-context';
import { EditPersonDialog } from '@/components/people/edit-person-dialog';
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

    const [
        person,
        debtCycles,
        transactions,
        accounts,
        categories,
        personProfile,
        subscriptions,
    ] = await Promise.all([
        getPersonDetails(id),
        getDebtByTags(id),
        getAccountTransactions(id, 100),
        getAccounts(),
        getCategories(),
        getPersonWithSubs(id),
        getSubscriptions(),
    ]);

    if (!person) {
        notFound();
    }

    const totalBalance = person.current_balance;
    const balanceColor = totalBalance > 0 ? 'text-green-600' : 'text-red-600';
    const balanceText = totalBalance > 0 ? 'Ho no minh' : 'Minh no ho';
    const sidebarPeople = personProfile ? [personProfile] : [];

    return (
        <TagFilterProvider>
            <div className="space-y-6">
                <section className="space-y-5 bg-white shadow rounded-lg p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600">
                                {person.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{person.name}</h1>
                                <p className="text-sm text-gray-500">{balanceText}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 sm:items-end">
                            <p className={`text-3xl font-bold ${balanceColor}`}>{formatCurrency(totalBalance)}</p>
                            <div className="flex flex-wrap justify-end gap-2">
                                {personProfile && (
                                    <EditPersonDialog person={personProfile} subscriptions={subscriptions} />
                                )}
                                <SettleDebtButton debtAccount={person} accounts={accounts} />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold">Ky no (Debt Cycles)</h2>
                        </div>
                        <DebtCycleFilter allCycles={debtCycles} debtAccount={person} accounts={accounts} categories={categories} people={sidebarPeople} />
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
