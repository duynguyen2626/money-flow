'use client'

import { useState } from 'react'
import { useTagFilter } from '@/context/tag-filter-context'
import type { DebtByTagAggregatedResult } from '@/services/debt.service'

type DebtCycle = DebtByTagAggregatedResult

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
    return numberFormatter.format(value)
}

function DebtCycleCard({
    cycle,
}: {
    cycle: DebtCycle;
}) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const isSettled = cycle.status === 'settled'
    const amountColor = isSettled
        ? 'text-emerald-700'
        : cycle.netBalance >= 0
            ? 'text-emerald-700'
            : 'text-red-600'
    const tagLabel = cycle.tag === 'UNTAGGED' ? 'No tag' : cycle.tag
    const badgeLabel = cycle.tag === 'UNTAGGED' ? '-' : cycle.tag

    const toggleTagFilter = () => {
        setSelectedTag(cycle.tag === selectedTag ? null : cycle.tag)
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedTag(cycle.tag === selectedTag ? null : cycle.tag)}
            onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleTagFilter()
                }
            }}
            className={`w-full rounded-lg border p-3 shadow-sm transition ${
                isSettled ? 'bg-slate-50' : 'bg-white'
            } cursor-pointer`}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="flex items-center gap-2"
                        onClick={event => {
                            event.stopPropagation()
                            setSelectedTag(cycle.tag === selectedTag ? null : cycle.tag)
                        }}
                    >
                        <span
                            className={`flex h-8 w-8 items-center justify-center rounded-md border bg-slate-50 text-[10px] font-semibold tracking-tight uppercase ${isSettled ? 'border-gray-200 text-gray-500' : 'border-slate-300 text-slate-700'}`}
                            title={tagLabel}
                        >
                            {badgeLabel}
                        </span>
                        <span className={`text-xs font-semibold ${cycle.tag === 'UNTAGGED' ? 'text-gray-500' : 'text-slate-700'}`}>
                            {tagLabel}
                        </span>
                    </button>
                </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
                <p className={`text-2xl font-bold ${amountColor}`}>
                    {formatCurrency(cycle.netBalance)}
                </p>
                <span
                    className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        isSettled
                            ? 'bg-gray-200 text-gray-600'
                            : cycle.netBalance > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                    }`}
                >
                    {isSettled ? 'Settled' : cycle.netBalance > 0 ? 'They owe me' : 'I owe them'}
                </span>
                <p className="text-[11px] text-gray-600">
                    <span>Principal: {formatCurrency(Math.abs(cycle.originalPrincipal))}</span>
                    <span className="mx-1 text-slate-400">|</span>
                    <span className="text-amber-600">Cashback: {formatCurrency(Math.abs(cycle.totalBack ?? 0))}</span>
                </p>
            </div>
        </div>
    )
}

export function DebtCycleFilter({ 
    allCycles 
}: {
    allCycles: DebtCycle[]
}) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const [activeTab, setActiveTab] = useState<'all' | 'tagged' | 'untagged'>('all')
    const [isExpanded, setIsExpanded] = useState(true) // 新增状态用于控制展开/折叠
    
    // Phân loại debt cycles
    const taggedCycles = allCycles.filter(cycle => cycle.tag !== 'UNTAGGED' && cycle.tag)
    const untaggedCycles = allCycles.filter(cycle => !cycle.tag || cycle.tag === 'UNTAGGED')
    
    // Xác định cycles để hiển thị dựa trên tab đang chọn
    let displayedCycles = allCycles
    if (activeTab === 'tagged') {
        displayedCycles = taggedCycles
    } else if (activeTab === 'untagged') {
        displayedCycles = untaggedCycles
    }
    
    // Nếu có tag được chọn, chỉ hiển thị tag đó
    if (selectedTag) {
        displayedCycles = displayedCycles.filter(cycle => cycle.tag === selectedTag)
    }

    const clearTagSelection = () => {
        setSelectedTag(null)
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            activeTab === 'all'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                            setActiveTab('all')
                            clearTagSelection()
                        }}
                    >
                        Tất cả ({allCycles.length})
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            activeTab === 'tagged'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                            setActiveTab('tagged')
                            clearTagSelection()
                        }}
                    >
                        Kỳ nợ tồn tại ({taggedCycles.length})
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            activeTab === 'untagged'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                            setActiveTab('untagged')
                            clearTagSelection()
                        }}
                    >
                        Kỳ nợ không tồn tại (No Tag) ({untaggedCycles.length})
                    </button>
                </div>
                
                {selectedTag && (
                    <button
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                        onClick={clearTagSelection}
                    >
                        Đang xem: {selectedTag} (Click để xem tất cả)
                    </button>
                )}
            </div>
            
            {/* 新增折叠/展开按钮 */}
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold">Kỳ nợ</h3>
                <button
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                </button>
            </div>
            
            {/* 使用CSS控制显示/隐藏 */}
            <div className={`transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
                {displayedCycles && displayedCycles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedCycles.map((cycle) => (
                            <DebtCycleCard 
                                key={cycle.tag} 
                                cycle={cycle} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 px-4 bg-white rounded-lg shadow">
                        <p className="text-gray-500">Không có kỳ nợ nào được ghi nhận.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
