'use client'

import { useState } from 'react'
import { useTagFilter } from '@/context/tag-filter-context'

interface DebtCycle {
    tag: string
    balance: number
    status: string
    last_activity: string
}

function DebtCycleCard({ cycle }: { cycle: DebtCycle }) {
    const { selectedTag, setSelectedTag } = useTagFilter()
    const isSettled = cycle.status === 'settled'
    const balanceColor = cycle.balance > 0 ? 'text-green-600' : 'text-red-600'

    return (
        <div className={`p-4 rounded-lg shadow-sm border ${isSettled ? 'bg-gray-50' : 'bg-white'}`}>
            <h3 
                className={`font-semibold cursor-pointer hover:underline ${cycle.tag === 'UNTAGGED' ? 'text-gray-500' : 'text-blue-600'}`}
                onClick={() => setSelectedTag(cycle.tag === selectedTag ? null : cycle.tag)}
            >
                {cycle.tag === 'UNTAGGED' ? 'Không có tag' : cycle.tag}
            </h3>
            <p className={`text-xl font-bold ${isSettled ? 'text-gray-400' : balanceColor}`}>
                {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                    maximumFractionDigits: 0
                }).format(cycle.balance)}
            </p>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${isSettled ? 'bg-gray-200 text-gray-600' : (cycle.balance > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}`}>
                {isSettled ? 'Đã xong' : (cycle.balance > 0 ? 'Họ nợ mình' : 'Mình nợ họ')}
            </span>
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
    const [isExpanded, setIsExpanded] = useState(false)
    
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

    // Toggle expand/collapse
    const toggleExpand = () => {
        setIsExpanded(!isExpanded)
    }

    return (
        <div className="space-y-4">
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
                
                {selectedTag && (
                    <button
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                        onClick={clearTagSelection}
                    >
                        Đang xem: {selectedTag} (Click để xem tất cả)
                    </button>
                )}
                
                <button
                    className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
                    onClick={toggleExpand}
                >
                    {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                </button>
            </div>
            
            {isExpanded && (
                <>
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
                </>
            )}
        </div>
    )
}