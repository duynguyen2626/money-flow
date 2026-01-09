'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function DebugPage() {
    const [isFixing, setIsFixing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFixSplitBills = async () => {
        setIsFixing(true);
        setResult(null);

        try {
            const res = await fetch('/api/debug/fix-split-bills', {
                method: 'POST',
            });

            const data = await res.json();
            setResult(data);
        } catch (err) {
            setResult({ error: String(err) });
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>

            <div className="space-y-6">
                <div className="border p-6 rounded-lg bg-white shadow-sm">
                    <h2 className="text-lg font-semibold mb-2">Fix Corrupted Split Bills</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Finds and fixes split bill parent transactions that invalidly have a `person_id`.
                        This will update them to `person_id: null` and `type: expense`.
                    </p>

                    <Button
                        onClick={handleFixSplitBills}
                        disabled={isFixing}
                        variant="destructive"
                    >
                        {isFixing ? 'Running Fix...' : 'Run Split Bill Migration'}
                    </Button>

                    {result && (
                        <div className="mt-4 p-4 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-60 border">
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
