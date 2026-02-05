'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BreadcrumbContextType {
    customNames: Record<string, string>;
    setCustomName: (path: string, name: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
    const [customNames, setCustomNames] = useState<Record<string, string>>({});

    const setCustomName = useCallback((path: string, name: string) => {
        setCustomNames((prev) => {
            if (prev[path] === name) return prev;
            return { ...prev, [path]: name };
        });
    }, []);

    return (
        <BreadcrumbContext.Provider value={{ customNames, setCustomName }}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

export function useBreadcrumbs() {
    const context = useContext(BreadcrumbContext);
    if (!context) {
        throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
    }
    return context;
}
