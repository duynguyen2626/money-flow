'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

import { CashbackCard as CashbackCardComponent } from '@/components/moneyflow/cashback-card'
import type { CashbackCard } from '@/types/cashback.types'

type CashbackClientListProps = {
    cards: CashbackCard[]
}

export function CashbackClientList({ cards }: CashbackClientListProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredCards = useMemo(() => {
        if (!searchQuery.trim()) return cards
        const query = searchQuery.toLowerCase()
        return cards.filter(card => card.accountName.toLowerCase().includes(query))
    }, [cards, searchQuery])

    const minSpendCards = filteredCards.filter(c => typeof c.minSpend === 'number' && c.minSpend > 0)
    const directCards = filteredCards.filter(c => !c.minSpend || c.minSpend === 0)

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search cards..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                </div>
                <span className="text-sm text-slate-500">
                    {filteredCards.length} of {cards.length} cards
                </span>
            </div>

            {filteredCards.length === 0 && (
                <div className="rounded-lg border border-dashed bg-white p-10 text-center text-slate-500">
                    <p className="text-lg font-semibold">No cards match your search</p>
                    <p className="text-sm text-slate-400">
                        Try a different search term.
                    </p>
                </div>
            )}

            {directCards.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-lg">⚡</span>
                        <h2 className="text-lg font-semibold">Direct Cashback</h2>
                        <span className="text-xs text-slate-400 font-normal">(No minimum spend required)</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                        {directCards.map(card => (
                            <CashbackCardComponent key={card.accountId} card={card} />
                        ))}
                    </div>
                </div>
            )}

            {minSpendCards.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-lg">📊</span>
                        <h2 className="text-lg font-semibold">Tiered / Min Spend</h2>
                        <span className="text-xs text-slate-400 font-normal">(Requires minimum spend)</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                        {minSpendCards.map(card => (
                            <CashbackCardComponent key={card.accountId} card={card} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
