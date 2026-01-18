"use client";

import { useEffect, useState } from 'react';

// Key prefix to avoid collisions
const KEY_PREFIX = 'mf3_recent_';

export function useRecentItems<T>(key: string, limit: number = 5) {
    const storageKey = `${KEY_PREFIX}${key}`;
    const [recentItems, setRecentItems] = useState<T[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setRecentItems(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse recent items", e);
            }
        }
    }, [storageKey]);

    const addRecentItem = (item: T) => {
        setRecentItems(prev => {
            // Remove if exists (to move to top)
            // Assuming item is string or object with id. Simple check for now.
            // For complex objects, need custom comparison, but string IDs usage is common.
            const newItemJson = JSON.stringify(item);
            const filtered = prev.filter(i => JSON.stringify(i) !== newItemJson);

            const updated = [item, ...filtered].slice(0, limit);
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    };

    return { recentItems, addRecentItem };
}
