"use client";

import { ArrowRight } from "lucide-react";

/**
 * Arrow Connector Component
 * 
 * Visual indicator showing parent→child relationship between accounts.
 * Displays a white circular button with an arrow icon.
 */
export function ArrowConnector() {
    return (
        <div className="flex items-center justify-center shrink-0">
            <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-200">
                <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>
        </div>
    );
}
