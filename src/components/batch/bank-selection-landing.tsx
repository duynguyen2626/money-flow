import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Database, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { getBatchSettingsAction } from '@/actions/batch-settings.actions'
import { BankLinkWithLoading } from './bank-link-with-loading'
import { BankSettingsSlideTrigger } from './bank-settings-slide'
import { getBatchesByType } from '@/services/batch.service'
import { cn } from '@/lib/utils'

export async function BankSelectionLanding() {
    // Load settings and data
    const [mbbResult, vibResult, mbbBatches, vibBatches] = await Promise.all([
        getBatchSettingsAction('MBB'),
        getBatchSettingsAction('VIB'),
        getBatchesByType('MBB'),
        getBatchesByType('VIB')
    ])

    const mbbSetting = (mbbResult as any).data
    const vibSetting = (vibResult as any).data

    // Helper to calculate stats
    const calculateStats = (batches: any[]) => {
        const activeBatches = batches.filter(b => !b.is_archived)
        const totalItems = activeBatches.reduce((acc, b) => acc + (b.batch_items?.[0]?.count || 0), 0)
        return {
            activeCount: activeBatches.length,
            totalItems
        }
    }

    const mbbStats = calculateStats(mbbBatches)
    const vibStats = calculateStats(vibBatches)

    const totalPendingBatches = mbbStats.activeCount + vibStats.activeCount

    const banks = [
        {
            id: 'mbb',
            name: 'MB Bank',
            fullName: 'Military Commercial Joint Stock Bank',
            imageUrl: mbbSetting?.image_url || null,
            color: 'indigo',
            gradient: 'from-blue-600 to-indigo-700',
            href: '/batch/mbb',
            stats: mbbStats
        },
        {
            id: 'vib',
            name: 'VIB',
            fullName: 'Vietnam International Bank',
            imageUrl: vibSetting?.image_url || null,
            color: 'purple',
            gradient: 'from-purple-600 to-fuchsia-700',
            href: '/batch/vib',
            stats: vibStats
        }
    ]

    return (
        <div className="min-h-full bg-slate-50/50 flex flex-col">
            {/* Hero Summary Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-6 py-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-red-100 rounded-md">
                                    <Database className="h-5 w-5 text-red-600" />
                                </div>
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">System</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                                Batch Processing
                            </h1>
                            <p className="text-slate-500 font-medium max-w-lg">
                                Centralized hub for high-volume transaction imports and reconciliation.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4 min-w-[160px]">
                                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase text-slate-400">Pending</div>
                                    <div className="text-xl font-bold text-slate-900">{totalPendingBatches} Batches</div>
                                </div>
                            </div>
                            <BankSettingsSlideTrigger />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 container mx-auto px-6 py-12">
                {/* Bank Cards Grid */}
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {banks.map((bank) => (
                        <BankLinkWithLoading key={bank.id} href={bank.href} target="_blank">
                            <Card className="group relative overflow-hidden h-full border-none shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-white">
                                <CardContent className="p-0 flex flex-col h-full">
                                    {/* Visual Header */}
                                    <div className={cn(
                                        "h-48 relative overflow-hidden bg-gradient-to-br",
                                        bank.gradient
                                    )}>
                                        {/* Abstract Shapes */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-colors" />
                                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl" />

                                        <div className="absolute inset-0 p-8 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                {/* Bank Logo - ROUNDED NONE (Rule Compliance) */}
                                                <div className="w-16 h-16 bg-white rounded-none shadow-2xl flex items-center justify-center p-0 overflow-hidden ring-4 ring-white/20 group-hover:scale-105 transition-transform duration-500">
                                                    {bank.imageUrl ? (
                                                        <Image
                                                            src={bank.imageUrl}
                                                            alt={bank.name}
                                                            width={64}
                                                            height={64}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    ) : (
                                                        <span className={cn(
                                                            "text-2xl font-black bg-gradient-to-br bg-clip-text text-transparent",
                                                            bank.gradient
                                                        )}>
                                                            {bank.id.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                                                    <ArrowRight className="h-5 w-5 text-white" />
                                                </div>
                                            </div>

                                            <div className="text-white">
                                                <h3 className="text-3xl font-black tracking-tight mb-1">{bank.name}</h3>
                                                <p className="text-white/70 text-xs font-medium uppercase tracking-widest">{bank.fullName}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content & Stats */}
                                    <div className="p-8 flex-1 flex flex-col">
                                        <div className="grid grid-cols-2 gap-6 mb-8">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Active Months</span>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-900">{bank.stats.activeCount}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Total Items</span>
                                                </div>
                                                <div className="text-2xl font-bold text-slate-900">{bank.stats.totalItems.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex items-center gap-2 text-sm font-bold group-hover:gap-3 transition-all">
                                            <span className={cn(
                                                "bg-clip-text text-transparent bg-gradient-to-r",
                                                bank.gradient
                                            )}>
                                                Process Transfers
                                            </span>
                                            <ArrowRight className={cn(
                                                "h-4 w-4",
                                                bank.color === 'indigo' ? "text-indigo-600" : "text-purple-600"
                                            )} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </BankLinkWithLoading>
                    ))}
                </div>

                {/* Footer Help */}
                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm">
                        <span className="text-slate-500 text-sm font-medium">Need to configure sheet URLs?</span>
                        <Link
                            href="/batch/settings"
                            className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1 transition-colors"
                        >
                            Visit Settings <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
