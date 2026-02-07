'use client'

import { useState } from 'react'
import { toYYYYMMFromDate } from '@/lib/month-tag'
import { recallServiceDistributionAction } from '@/actions/service-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCcw, AlertTriangle, CheckCircle2, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function RecallDistributionPage() {
    const [isOpen, setIsOpen] = useState(false)
    const [monthTag, setMonthTag] = useState(toYYYYMMFromDate(new Date()))
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ count: number } | null>(null)

    const handleRecall = async () => {
        setLoading(true)
        try {
            const resp = await recallServiceDistributionAction(monthTag)
            if (resp.success) {
                setResult({ count: resp.count ?? 0 })
                toast.success(`Successfully recalled ${resp.count} transactions`)
                setIsOpen(false)
            } else {
                toast.error(resp.error || 'Failed to recall distribution')
            }
        } catch (err: any) {
            toast.error(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-full bg-slate-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <Link
                    href="/services"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Subscriptions
                </Link>

                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                <RefreshCcw className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-900">Distribution Recall Tool</CardTitle>
                                <CardDescription>Revoke and cleanup service distributions for testing</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-8">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-amber-900">Warning: Recall Action</p>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    This action will <strong>void</strong> all service distribution transactions for the selected month.
                                    It will also trigger <strong>Google Sheets deletion</strong> for all members with linked sheets.
                                    Use this primarily for debugging or correcting distribution errors.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="monthTag" className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                    Target Month (YYYY-MM)
                                </Label>
                                <Input
                                    id="monthTag"
                                    value={monthTag}
                                    onChange={(e) => setMonthTag(e.target.value)}
                                    placeholder="2026-02"
                                    className="h-12 text-lg font-bold border-slate-200 focus:ring-orange-500"
                                />
                            </div>

                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        className="w-full h-12 gap-2 text-sm font-bold rounded-xl shadow-lg shadow-red-100"
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Recall Distribution
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] rounded-3xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-bold text-slate-900">Confirm Recall</DialogTitle>
                                        <DialogDescription className="text-slate-500 text-sm">
                                            Are you sure you want to recall all service distributions for <strong>{monthTag}</strong>?
                                            This will affect all distributed services for this period.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl h-11 px-6 text-xs font-bold">
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleRecall}
                                            disabled={loading}
                                            className="rounded-xl h-11 px-6 text-xs font-bold gap-2"
                                        >
                                            {loading ? (
                                                <RefreshCcw className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <RefreshCcw className="h-3 w-3" />
                                            )}
                                            Recall {monthTag}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {result && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center gap-3 text-emerald-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <p className="text-sm font-bold">Recall Successful</p>
                                </div>
                                <p className="mt-2 text-xs text-emerald-600 font-medium">
                                    We have successfully voided <strong>{result.count}</strong> transactions and updated the corresponding Google Sheets.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                    onClick={() => setResult(null)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
