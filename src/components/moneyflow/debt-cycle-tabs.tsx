'use client'

import { useState } from 'react'

interface DebtCycle {
    tag: string
    balance: number
    status: string
    last_activity: string
}

export function DebtCycleTabs({ 
    allCycles 
}: {
    allCycles: DebtCycle[]
}) {
    const [activeTab, setActiveTab] = useState<'all' | 'tagged' | 'untagged'>('all')
    
    // Phân loại debt cycles
    const taggedCycles = allCycles.filter(cycle => cycle.tag !== 'UNTAGGED')
    const untaggedCycles = allCycles.filter(cycle => cycle.tag === 'UNTAGGED')
    
    // Xác định cycles để hiển thị dựa trên tab đang chọn
    const displayedCycles = 
        activeTab === 'all' ? allCycles :
        activeTab === 'tagged' ? taggedCycles :
        untaggedCycles

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        activeTab === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setActiveTab('all')}
                >
                    Tất cả ({allCycles.length})
                </button>
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            activeTab === 'tagged'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setActiveTab('tagged')}
                    >
                        Tagged cycles ({taggedCycles.length})
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            activeTab === 'untagged'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setActiveTab('untagged')}
                    >
                        Untagged cycles ({untaggedCycles.length})
                    </button>
            </div>
            
            {displayedCycles && displayedCycles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedCycles.map((cycle) => (
                        <div key={cycle.tag} className="p-4 rounded-lg shadow-sm border bg-white">
                            <h3 className="font-semibold text-gray-800">
                                {cycle.tag === 'UNTAGGED' ? 'No tag' : cycle.tag}
                            </h3>
                            <p className={`text-xl font-bold ${
                                cycle.status === 'settled' 
                                    ? 'text-gray-400' 
                                    : cycle.balance > 0 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                            }`}>
                                {new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                    maximumFractionDigits: 0
                                }).format(cycle.balance)}
                            </p>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                cycle.status === 'settled' 
                                    ? 'bg-gray-200 text-gray-600' 
                                    : cycle.balance > 0 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-red-100 text-red-700'
                            }`}>
                                {cycle.status === 'settled' 
                                    ? 'Settled' 
                                    : cycle.balance > 0 
                                        ? 'They owe me' 
                                        : 'I owe them'}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 px-4 bg-white rounded-lg shadow">
                    <p className="text-gray-500">No debt cycles recorded.</p>
                </div>
            )}
        </div>
    )
}
