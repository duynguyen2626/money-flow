'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
    year: number
    defaultTab: string
}

export function YearSelector({ year, defaultTab }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleYearChange = (newYear: string) => {
        const currentTab = searchParams.get('tab') || defaultTab
        router.push(`/cashback?year=${newYear}&tab=${currentTab}`)
    }

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-sm font-medium">Year:</label>
            <select
                id="year-select"
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
            >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
            </select>
        </div>
    )
}
