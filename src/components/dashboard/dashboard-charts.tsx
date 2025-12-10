'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

type SpendingData = {
    name: string
    value: number
    icon?: string | null
    logo_url?: string | null
}

type DashboardChartsProps = {
    spendingByCategory: SpendingData[]
}

const COLORS = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
    '#6366F1', // indigo
    '#84CC16', // lime
]

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
})

export function DashboardCharts({ spendingByCategory }: DashboardChartsProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!spendingByCategory || spendingByCategory.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="text-center">
                    <p className="text-lg font-medium">No spending data</p>
                    <p className="text-sm mt-1">Start adding transactions to see your spending breakdown</p>
                </div>
            </div>
        )
    }

    const data = spendingByCategory.map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length],
    }))

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        {data.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={data.logo_url}
                                alt={data.name}
                                className="h-6 w-6 object-contain"
                            />
                        ) : data.icon ? (
                            <span className="text-lg">{data.icon}</span>
                        ) : null}
                        <p className="font-semibold text-slate-900">{data.name}</p>
                    </div>
                    <p className="text-sm text-slate-600">
                        Amount: <span className="font-bold text-slate-900">{numberFormatter.format(data.value)}</span>
                    </p>
                </div>
            )
        }
        return null
    }

    const CustomLegend = ({ payload }: any) => {
        return (
            <div className="grid grid-cols-2 gap-2 mt-4">
                {payload.map((entry: any, index: number) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: entry.color }}
                        />
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            {entry.payload.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={entry.payload.logo_url}
                                    alt={entry.value}
                                    className="h-4 w-4 object-contain flex-shrink-0"
                                />
                            ) : entry.payload.icon ? (
                                <span className="text-sm flex-shrink-0">{entry.payload.icon}</span>
                            ) : null}
                            <span className="text-xs text-slate-700 truncate">{entry.value}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900 flex-shrink-0">
                            {numberFormatter.format(entry.payload.value)}
                        </span>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="w-full min-h-[300px]">
            {!isMounted ? (
                <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
                    Loading chart...
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
