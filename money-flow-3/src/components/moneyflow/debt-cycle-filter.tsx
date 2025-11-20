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
