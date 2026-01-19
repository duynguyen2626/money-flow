import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPeople } from '@/services/people.service';
import { formatMoneyVND } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowLeft, CreditCard, Calendar, Receipt } from 'lucide-react';
import { SubscriptionBadges } from '@/components/people/v2/subscription-badges';

interface PeopleDetailsPageProps {
    params: Promise<{ id: string }>;
}

export default async function PeopleDetailsPage({ params }: PeopleDetailsPageProps) {
    const { id } = await params;
    const people = await getPeople({ includeArchived: true });
    const person = people.find(p => p.id === id);

    if (!person) {
        notFound();
    }

    // Stats
    const totalDebt = (person.current_cycle_debt || 0) + (person.outstanding_debt || 0);

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header / Nav */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/people/v2"
                            className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                        <h1 className="text-lg font-bold text-slate-800 hidden sm:block">Person Details</h1>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* We can add 'Edit' button here later */}
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/people/v2?edit=${person.id}`}>Edit</Link>
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <Avatar className="h-24 w-24 rounded-2xl border-4 border-white shadow-sm bg-white">
                        <AvatarImage src={person.image_url || undefined} className="object-cover" />
                        <AvatarFallback className="text-2xl bg-slate-100 text-slate-400 rounded-2xl">
                            {person.name?.[0]?.toUpperCase() || <User className="h-8 w-8" />}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{person.name}</h2>
                            {person.is_archived && <Badge variant="secondary">Archived</Badge>}
                            {person.is_group && <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">Group</Badge>}
                        </div>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-slate-500">
                            {person.email && <span>{person.email}</span>}
                            {person.google_sheet_url && (
                                <a href={person.google_sheet_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                    Link to Sheet
                                </a>
                            )}
                        </div>

                        <div className="pt-2">
                            <SubscriptionBadges subscriptions={person.subscription_details || []} />
                        </div>
                    </div>
                </div>

                {/* Financial Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="h-3.5 w-3.5" />
                                Current Debt
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">
                                {formatMoneyVND(person.current_cycle_debt || 0)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">This month cycle</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                Outstanding
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600">
                                {formatMoneyVND(person.outstanding_debt || 0)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Previous cycles</p>
                        </CardContent>
                    </Card>

                    <Card className={totalDebt > 0 ? "bg-rose-50/50 border-rose-100" : "bg-emerald-50/50 border-emerald-100"}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Receipt className="h-3.5 w-3.5" />
                                Total Remains
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-black", totalDebt > 0 ? "text-rose-700" : "text-emerald-700")}>
                                {totalDebt > 0 ? formatMoneyVND(totalDebt) : "Settled"}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Net payable</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity (Monthly Debts) */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Recent Cycles</h3>
                    {person.monthly_debts && person.monthly_debts.length > 0 ? (
                        <div className="grid gap-3">
                            {person.monthly_debts.map((dept, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-900">{dept.tagLabel}</p>
                                        <p className="text-xs text-slate-500">{dept.last_activity ? new Date(dept.last_activity).toLocaleDateString() : 'No date'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono font-medium text-slate-700">{formatMoneyVND(dept.amount)}</p>
                                        <p className="text-xs text-slate-400">Remains</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic">No recent debt history.</p>
                    )}
                </div>

            </main>
        </div>
    );
}

// Utility class merge helper (if not imported)
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
