
'use client'

import { useState, useEffect } from 'react'

interface DebtCycle {
    tag: string
    balance: number
    status: string
    last_activity: string
}

export function DebugDebtCycle({ 
    allCycles 
}: {
    allCycles: DebtCycle[]
}) {
    const [activeTab, setActiveTab] = useState<'all' | 'tagged' | 'untagged'>('all')
    
    // Log dữ liệu nhận được
    useEffect(() => {
        console.log('Received debt cycles:', allCycles);
    }, [allCycles]);
    
    // Phân loại debt cycles
    const taggedCycles = allCycles.filter(cycle => cycle.tag !== 'UNTAGGED' && cycle.tag)
    const untaggedCycles = allCycles.filter(cycle => !cycle.tag || cycle.tag === 'UNTAGGED')
    
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
                    Kỳ nợ tồn tại ({taggedCycles.length})
                </button>
                <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        activeTab === 'untagged'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setActiveTab('untagged')}
                >
                    Kỳ nợ không tồn tại (No Tag) ({untaggedCycles.length})
                </button>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded">
                <h3 className="font-bold">Debug Info:</h3>
                <p>All cycles count: {allCycles.length}</p>
                <p>Tagged cycles count: {taggedCycles.length}</p>
                <p>Untagged cycles count: {untaggedCycles.length}</p>
                <p>Active tab: {activeTab}</p>
            </div>
            
            {displayedCycles && displayedCycles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedCycles.map((cycle) => (
                        <div key={cycle.tag} className="p-4 rounded-lg shadow-sm border bg-white">
                            <h3 className="font-semibold text-gray-800">
                                Tag: {cycle.tag || 'UNTAGGED'}
                            </h3>
                            <p>Balance: {cycle.balance}</p>
                            <p>Status: {cycle.status}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 px-4 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Không có kỳ nợ nào được ghi nhận.</p>
                </div>
            )}
        </div>
    )
}