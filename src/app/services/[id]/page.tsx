import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Pencil, ArrowLeft, Users, BarChart3, Calendar, CreditCard, Info } from 'lucide-react'

import { getSubscription } from '@/services/subscription.service'
import { getPeople } from '@/services/people.service'
import { getAccounts } from '@/services/account.service'
import { getShops } from '@/services/shop.service'
import { getServiceBranding } from '@/components/services/service-branding'
import { EditSubscriptionDialog } from '@/components/services/edit-subscription-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ServicePageProps {
    params: Promise<{ id: string }>
}

const numberFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
})

export default async function ServicePage({ params }: ServicePageProps) {
    const { id } = await params

    const [subscription, people, accounts, shops] = await Promise.all([
        getSubscription(id),
        getPeople(),
        getAccounts(),
        getShops(),
    ])

    if (!subscription) {
        notFound()
    }

    const brand = getServiceBranding(subscription.name)

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/services" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5 text-slate-500" />
                </Link>
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm ${brand.bg} ${brand.text}`}>
                    {brand.icon}
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">{subscription.name}</h1>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <span className="font-medium text-slate-900">{numberFormatter.format(subscription.price || 0)}</span>
                        <span>/ month</span>
                    </div>
                </div>
                <EditSubscriptionDialog
                    subscription={subscription}
                    people={people}
                    accounts={accounts}
                    shops={shops}
                    trigger={
                        <Button variant="outline" size="sm" className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Button>
                    }
                />
            </div>

            {/* Content */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview" className="gap-2">
                        <Info className="h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="members" className="gap-2">
                        <Users className="h-4 w-4" />
                        Members
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {subscription.next_billing_date
                                        ? format(new Date(subscription.next_billing_date), 'MMM d, yyyy')
                                        : 'Not set'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Auto-renewal date
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate">
                                    {accounts.find(a => a.id === subscription.payment_account_id)?.name || 'Default'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Source account
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Cost History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <BarChart3 className="h-8 w-8 mr-2" />
                                <span>Chart coming soon</span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="members" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Subscription Members</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {subscription.members && subscription.members.length > 0 ? (
                                <div className="space-y-3">
                                    {subscription.members.map((member) => (
                                        <div key={member.profile_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center gap-3">
                                                {member.avatar_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={member.avatar_url} alt={member.profile_name || ''} className="h-10 w-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                                        {(member.profile_name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-slate-900">{member.profile_name}</p>
                                                    <p className="text-xs text-slate-500">{member.slots} slot{member.slots !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900">
                                                    {numberFormatter.format((subscription.price || 0) / (subscription.members?.reduce((acc, m) => acc + (m.slots || 1), 0) || 1) * (member.slots || 1))}
                                                </p>
                                                <p className="text-xs text-slate-500">Estimated share</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    No members assigned to this subscription.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
