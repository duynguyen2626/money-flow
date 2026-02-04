import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Settings, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBatchSettingsAction } from '@/actions/batch-settings.actions'
import { BankLinkWithLoading } from './bank-link-with-loading'
import { BankSettingsSlideTrigger } from './bank-settings-slide'

export async function BankSelectionLanding() {
    // Load settings from DB
    const [mbbResult, vibResult] = await Promise.all([
        getBatchSettingsAction('MBB'),
        getBatchSettingsAction('VIB')
    ])

    const mbbData = (mbbResult as any).data
    const vibData = (vibResult as any).data

    const banks = [
        {
            id: 'mbb',
            name: 'MB Bank',
            fullName: 'Military Commercial Joint Stock Bank',
            imageUrl: mbbData?.image_url || null,
            color: 'from-blue-500 to-blue-700',
            href: '/batch/mbb'
        },
        {
            id: 'vib',
            name: 'VIB',
            fullName: 'Vietnam International Bank',
            imageUrl: vibData?.image_url || null,
            color: 'from-purple-500 to-purple-700',
            href: '/batch/vib'
        }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="container mx-auto px-4 py-16">
                {/* Header */}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-2">
                            Batch Transfers
                        </h1>
                        <p className="text-slate-600">
                            Select your bank to manage batch transfers
                        </p>
                    </div>
                    <BankSettingsSlideTrigger />
                </div>

                {/* Bank Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {banks.map((bank) => (
                        <BankLinkWithLoading key={bank.id} href={bank.href}>
                            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-500 overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Gradient Header */}
                                    <div className={`bg-gradient-to-r ${bank.color} p-8 relative overflow-hidden`}>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

                                        {/* Bank Icon */}
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                                                {bank.imageUrl ? (
                                                    <Image
                                                        src={bank.imageUrl}
                                                        alt={bank.name}
                                                        width={80}
                                                        height={80}
                                                        className="object-cover w-full h-full"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                                                        <span className={`text-3xl font-bold bg-gradient-to-r ${bank.color} bg-clip-text text-transparent`}>
                                                            {bank.id.toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <ArrowRight className="h-8 w-8 text-white group-hover:translate-x-2 transition-transform" />
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-6 bg-white">
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                            {bank.name}
                                        </h3>
                                        <p className="text-slate-600 text-sm mb-4">
                                            {bank.fullName}
                                        </p>

                                        {/* Stats Preview */}
                                        <div className="flex gap-4 pt-4 border-t">
                                            <div>
                                                <div className="text-xs text-slate-500">Processing</div>
                                                <div className="text-lg font-semibold text-slate-900">—</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">Done</div>
                                                <div className="text-lg font-semibold text-green-600">—</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </BankLinkWithLoading>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="mt-12 text-center">
                    <p className="text-slate-500 text-sm">
                        Need help? Check out the{' '}
                        <Link href="/batch/settings" className="text-blue-600 hover:underline font-medium">
                            settings page
                        </Link>
                        {' '}to configure sheet URLs and webhooks.
                    </p>
                </div>
            </div>
        </div>
    )
}
