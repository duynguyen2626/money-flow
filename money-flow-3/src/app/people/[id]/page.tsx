export default async function PeopleDetailPage({ params }: PageProps) {
    const { id } = await params;  // Await params để lấy giá trị id

    if (!id) {
        notFound();
    }

    const [person, debtCycles, transactions, accounts] = await Promise.all([
        getPersonDetails(id),
        getDebtByTags(id),
        getAccountTransactions(id, 100), // Fetching more transactions for a detailed view
        getAccounts(),
    ]);

    // Thêm log để debug
    console.log('Person:', person);
    console.log('Debt Cycles:', JSON.stringify(debtCycles, null, 2));
    console.log('Transactions:', transactions);

    if (!person) {
        notFound();
    }

    const totalBalance = person.current_balance;
    const balanceColor = totalBalance > 0 ? 'text-green-600' : 'text-red-600';
    const balanceText = totalBalance > 0 ? 'Họ nợ mình' : 'Mình nợ họ';

    return (
        <TagFilterProvider>
            <div className="space-y-6">
                {/* Profile Header */}
                <section className="bg-white shadow rounded-lg p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600">
                            {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{person.name}</h1>
                            <p className="text-sm text-gray-500">{balanceText}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-3xl font-bold ${balanceColor}`}>{formatCurrency(totalBalance)}</p>
                        <SettleDebtButton debtAccount={person} accounts={accounts} />
                    </div>
                </section>

                {/* Debt Cycles - 修改位置并添加折叠功能 */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Kỳ nợ (Debt Cycles)</h2>
                    </div>
                    
                    <DebtCycleFilter allCycles={debtCycles} />
                </section>

                {/* Transaction History */}
                <section className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between border-b pb-3">
                        <h2 className="text-lg font-semibold">Lịch sử giao dịch</h2>
                        <span className="text-sm text-slate-500">{transactions.length} giao dịch</span>
                    </div>
                    <div className="mt-4">
                        <FilterableTransactions transactions={transactions} />
                    </div>
                </section>
            </div>
        </TagFilterProvider>
    );
}