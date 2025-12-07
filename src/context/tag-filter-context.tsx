'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

type TagFilterContextType = {
    selectedTag: string | null
    setSelectedTag: (tag: string | null) => void
}

const TagFilterContext = createContext<TagFilterContextType | undefined>(undefined)

export function TagFilterProvider({ children, initialTag }: { children: ReactNode; initialTag?: string | null }) {
    const [selectedTag, setSelectedTag] = useState<string | null>(initialTag ?? null)
    const searchParams = useSearchParams()

    // Sync with URL tag param on mount
    useEffect(() => {
        const tagFromUrl = searchParams.get('tag')
        if (tagFromUrl) {
            setSelectedTag(tagFromUrl)
        }
    }, [searchParams])

    return (
        <TagFilterContext.Provider value={{ selectedTag, setSelectedTag }}>
            {children}
        </TagFilterContext.Provider>
    )
}

export function useTagFilter() {
    const context = useContext(TagFilterContext)
    if (context === undefined) {
        throw new Error('useTagFilter must be used within a TagFilterProvider')
    }
    return context
}