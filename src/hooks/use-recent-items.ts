'use client';

import { useState, useEffect, useCallback } from 'react';

export type RecentItem = {
    id: string;
    type: 'account' | 'person';
    name: string;
    image_url?: string | null;
    timestamp: number;
};

const MAX_RECENT_ITEMS = 5;
const STORAGE_KEY = 'money-flow-recent-items';

export function useRecentItems() {
    const [items, setItems] = useState<RecentItem[]>([]);

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setItems(parsed);
            } catch (e) {
                console.error('Failed to parse recent items', e);
            }
        }
    }, []);

    const addRecentItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
        setItems((prev) => {
            // Remove if already exists (to move to top)
            const filtered = prev.filter((i) => !(i.id === item.id && i.type === item.type));

            const newItem: RecentItem = {
                ...item,
                timestamp: Date.now(),
            };

            const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearRecentItems = useCallback(() => {
        setItems([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return {
        items,
        addRecentItem,
        clearRecentItems,
    };
}
