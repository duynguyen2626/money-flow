import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Loader2, Plus, Edit, CornerDownRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Combobox, ComboboxGroup } from '@/components/ui/combobox'
import { upsertBatchMasterItemAction } from '@/actions/batch-master.actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AccountSlideV2 } from '@/components/accounts/v2/AccountSlideV2'
import { useRouter } from 'next/navigation'

const formSchema = z.object({
    receiver_name: z.string().min(1, 'Receiver name is required'),
    bank_number: z.string().min(1, 'Bank number is required'),
    bank_name: z.string().min(1, 'Bank name is required'),
    bank_code: z.string().optional(),
    target_account_id: z.string().optional(),
    cutoff_period: z.enum(['before', 'after']),
    phase_id: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface BatchMasterItemSlideProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    bankType: 'MBB' | 'VIB'
    accounts: any[]
    bankMappings: any[]
    item?: any // For edit mode
    onSuccess?: () => void
    phases?: any[] // Dynamic phases
}

export function BatchMasterItemSlide({
    isOpen,
    onOpenChange,
    bankType,
    accounts,
    bankMappings,
    item,
    onSuccess,
    phases = [],
}: BatchMasterItemSlideProps) {
    const [loading, setLoading] = useState(false)
    const [isAccountSlideOpen, setIsAccountSlideOpen] = useState(false)
    const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<any>(null)
    const router = useRouter()
    const isEditMode = !!item?.id

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            receiver_name: item?.receiver_name || '',
            bank_number: item?.bank_number || '',
            bank_name: item?.bank_name || '',
            bank_code: item?.bank_code || '',
            target_account_id: item?.target_account_id || 'none',
            cutoff_period: item?.cutoff_period || 'before',
            phase_id: item?.phase_id || phases[0]?.id || '',
        },
    })

    // Watchers for reactive UI
    const targetAccountId = form.watch('target_account_id')
    const bankCode = form.watch('bank_code')
    const cutoffPeriod = form.watch('cutoff_period')
    const selectedAccount = useMemo(() => accounts.find(a => a.id === targetAccountId), [accounts, targetAccountId])

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && item) {
                form.reset({
                    receiver_name: item.receiver_name || '',
                    bank_number: item.bank_number || '',
                    bank_name: item.bank_name || '',
                    bank_code: item.bank_code || '',
                    target_account_id: item.target_account_id || 'none',
                    cutoff_period: item.cutoff_period || 'before',
                    phase_id: item.phase_id || phases[0]?.id || '',
                })
            } else {
                form.reset({
                    receiver_name: '',
                    bank_number: '',
                    bank_name: '',
                    bank_code: '',
                    target_account_id: 'none',
                    cutoff_period: 'before',
                    phase_id: phases[0]?.id || '',
                })
            }
        }
    }, [isOpen, item, isEditMode, form])

    // Auto-fill logic from internal account
    useEffect(() => {
        if (!targetAccountId || targetAccountId === 'none') return
        const target = accounts.find(a => a.id === targetAccountId)
        if (target) {
            if (target.receiver_name) form.setValue('receiver_name', target.receiver_name)
            if (target.account_number) form.setValue('bank_number', target.account_number)

            // Auto-suggest Cutoff Period and Phase
            const dueDay = target.due_date || target.statement_day
            if (dueDay) {
                // Find the best matching phase based on due_date
                if (phases.length > 0) {
                    const matchedPhase = phases.find(p =>
                        p.period_type === 'before' ? dueDay <= p.cutoff_day : dueDay > p.cutoff_day
                    ) || phases[0]
                    form.setValue('cutoff_period', matchedPhase.period_type)
                    form.setValue('phase_id', matchedPhase.id)
                } else {
                    form.setValue('cutoff_period', dueDay <= 15 ? 'before' : 'after')
                }
            }

            // Try to auto-select bank_code if it matches the account's bank_name
            if (target.bank_name) {
                const search = target.bank_name.toLowerCase()
                const match = bankMappings.find(b =>
                    b.bank_code.toLowerCase() === search ||
                    b.short_name?.toLowerCase().includes(search) ||
                    b.bank_name.toLowerCase().includes(search)
                )
                if (match) {
                    form.setValue('bank_code', match.bank_code)
                }
            }
        }
    }, [accounts, form, targetAccountId, bankMappings])

    // Update bank_name when bank_code changes
    useEffect(() => {
        if (bankCode && bankMappings.length > 0) {
            const selectedBank = bankMappings.find(b => b.bank_code === bankCode)
            if (selectedBank) {
                form.setValue('bank_name', selectedBank.short_name || selectedBank.bank_name)
            }
        }
    }, [bankCode, bankMappings, form])

    // Grouping for Internal Accounts
    const accountGroups: ComboboxGroup[] = useMemo(() => [
        {
            label: "System",
            items: [{ value: 'none', label: 'Manual Entry (No Link)', description: 'Skip internal reconciliation' }]
        },
        {
            label: "Available Internal Accounts",
            items: accounts
                .filter(a => a.type !== 'debt' && a.type !== 'loan' && a.type !== 'system')
                .map(a => ({
                    value: a.id,
                    label: a.name,
                    description: `${a.bank_name || ''} ${a.account_number || ''}`,
                    icon: a.image_url ? (
                        <img src={a.image_url} alt="" className="w-4 h-4 rounded-none object-contain" />
                    ) : (
                        <div className="w-4 h-4 rounded-none bg-slate-900 flex items-center justify-center text-[8px] font-black text-white shrink-0 uppercase">
                            {a.name?.[0]}
                        </div>
                    )
                }))
        }
    ], [accounts])

    // Grouping for Bank Mappings (Mapped vs All)
    const bankGroups: ComboboxGroup[] = useMemo(() => {
        if (!bankMappings) return []

        const uniqueBankMappings = Array.from(
            bankMappings
                .filter(b => !(b as any).bank_type || (b as any).bank_type === bankType)
                .reduce((map, bank) => {
                    const bCode = (bank as any).bank_code
                    if (bCode && !map.has(bCode)) {
                        map.set(bCode, bank)
                    }
                    return map
                }, new Map<string, any>()).values()
        )

        let recommendedCodes: string[] = []
        if (selectedAccount?.bank_name) {
            const search = selectedAccount.bank_name.toLowerCase()
            recommendedCodes = uniqueBankMappings
                .filter(b =>
                    (b as any).bank_code.toLowerCase().includes(search) ||
                    (b as any).short_name?.toLowerCase().includes(search) ||
                    (b as any).bank_name.toLowerCase().includes(search)
                )
                .map(b => (b as any).bank_code)
        }

        const mappedBanks = uniqueBankMappings.filter(b => recommendedCodes.includes((b as any).bank_code))
        const otherBanks = uniqueBankMappings.filter(b => !recommendedCodes.includes((b as any).bank_code))

        const groups: ComboboxGroup[] = []

        if (mappedBanks.length > 0) {
            groups.push({
                label: "Mapped Bank",
                items: mappedBanks.map(b => ({
                    label: `${(b as any).bank_code} - ${(b as any).bank_name}`,
                    value: (b as any).bank_code,
                    description: (b as any).short_name,
                    icon: (
                        <div className="w-6 h-4 rounded-sm bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[7px] font-black text-indigo-600 uppercase">
                            {(b as any).bank_code}
                        </div>
                    )
                }))
            })
        }

        groups.push({
            label: "All bank",
            items: otherBanks.map(b => ({
                label: `${(b as any).bank_code} - ${(b as any).bank_name}`,
                value: (b as any).bank_code,
                description: (b as any).short_name,
                icon: (
                    <div className="w-6 h-4 rounded-sm bg-slate-50 border border-slate-100 flex items-center justify-center text-[7px] font-black text-slate-400 uppercase">
                        {(b as any).bank_code}
                    </div>
                )
            }))
        })

        return groups
    }, [bankMappings, selectedAccount])

    // Grouping for Receiver Suggestions
    const receiverItems = useMemo(() => {
        const uniqueReceivers = new Map<string, any>()
        accounts.forEach(a => {
            if (a.receiver_name && !uniqueReceivers.has(a.receiver_name)) {
                uniqueReceivers.set(a.receiver_name, {
                    value: a.receiver_name,
                    label: a.receiver_name,
                    description: `${a.bank_name || ''} ${a.account_number || ''}`,
                    bank_number: a.account_number
                })
            }
        })
        return Array.from(uniqueReceivers.values())
    }, [accounts])

    // Grouping for Account Number Suggestions
    const accountNoItems = useMemo(() => {
        const uniqueNos = new Map<string, any>()
        accounts.forEach(a => {
            if (a.account_number && !uniqueNos.has(a.account_number)) {
                uniqueNos.set(a.account_number, {
                    value: a.account_number,
                    label: a.account_number,
                    description: `${a.bank_name || ''} - ${a.name || ''}`,
                    receiver_name: a.receiver_name
                })
            }
        })
        return Array.from(uniqueNos.values())
    }, [accounts])

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = await upsertBatchMasterItemAction({
                ...(isEditMode ? { id: item.id } : {}),
                ...values,
                target_account_id: values.target_account_id === 'none' ? null : values.target_account_id,
                phase_id: values.phase_id || null,
                bank_type: bankType,
                sort_order: isEditMode ? item.sort_order : 0
            })

            if (result.success) {
                toast.success(isEditMode ? 'Template updated' : 'Added to template')
                onOpenChange(false)
                onSuccess?.()
            } else {
                toast.error(result.error || 'Failed to save')
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to save item')
        } finally {
            setLoading(false)
        }
    }

    const selectedPhaseObj = phases.find(p => p.id === form.watch('phase_id'))
    const cutoffDay = selectedPhaseObj?.cutoff_day || 15;
    const effectiveDay = selectedAccount ? Number(selectedAccount.due_date || selectedAccount.statement_day || 0) : 0;
    const isWrongPeriod = effectiveDay > 0 && selectedPhaseObj && (
        selectedPhaseObj.period_type === 'before' ? effectiveDay > selectedPhaseObj.cutoff_day : effectiveDay <= selectedPhaseObj.cutoff_day
    );

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300"
                    onClick={() => onOpenChange(false)}
                />
            )}

            {/* Slide */}
            <div
                className={`fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border",
                            isEditMode ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                        )}>
                            {isEditMode ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 leading-none">
                                {isEditMode ? 'Edit Target' : 'Add Target'}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Master Checklist Template</p>
                        </div>
                        {isEditMode && (
                            <div className="ml-auto mr-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100/50 animate-in fade-in zoom-in duration-500">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Saved</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* SECTION 1: Bank Connections */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Bank Connections</span>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="target_account_id"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <div className="flex items-center justify-between px-1">
                                                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Target (Internal)</FormLabel>
                                                    {field.value && field.value !== 'none' && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setSelectedAccountForEdit(selectedAccount);
                                                                setIsAccountSlideOpen(true);
                                                            }}
                                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-tight hover:bg-blue-100 transition-colors animate-in fade-in slide-in-from-right-1"
                                                        >
                                                            <Edit className="h-2.5 w-2.5" />
                                                            Edit Info
                                                        </button>
                                                    )}
                                                </div>
                                                <FormControl>
                                                    <div className="space-y-2">
                                                        <Combobox
                                                            groups={accountGroups}
                                                            value={field.value || 'none'}
                                                            onValueChange={(val) => field.onChange(val ?? 'none')}
                                                            placeholder="Select internal account"
                                                            inputPlaceholder="Search accounts..."
                                                            className={cn(
                                                                "h-12 border-slate-200 bg-white shadow-sm",
                                                                isWrongPeriod ? "border-amber-200 bg-amber-50/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]" : selectedAccount ? "border-emerald-100 bg-emerald-50/20" : ""
                                                            )}
                                                        />
                                                        {isWrongPeriod && (
                                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 items-start animate-in fade-in slide-in-from-top-1">
                                                                <div className="p-1 bg-amber-100 rounded-full">
                                                                    <Info className="h-3 w-3 text-amber-600" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[11px] leading-tight font-medium text-amber-800">
                                                                        This account has a {selectedAccount.due_date ? 'due date' : 'statement day'} of <span className="font-black">{effectiveDay}</span>, which may not match the <span className="font-black italic uppercase">{selectedPhaseObj?.label || cutoffPeriod}</span> phase.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="bank_code"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Mapping</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        groups={bankGroups}
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        placeholder="Bank..."
                                                        className="h-12 border-slate-200 bg-white"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {bankCode && (
                                        <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
                                            <CornerDownRight className="h-3 w-3 text-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Selected:</span>
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">
                                                {form.getValues('bank_name')} ({bankCode})
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 2: Target Identity */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Target Identity</span>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="receiver_name"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receiver Name</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        items={receiverItems}
                                                        value={field.value}
                                                        onValueChange={(val) => {
                                                            field.onChange(val)
                                                            const match = receiverItems.find((r: any) => r.value === val)
                                                            if (match?.bank_number) {
                                                                form.setValue('bank_number', match.bank_number)
                                                            }
                                                        }}
                                                        placeholder="Receiver Name..."
                                                        className="h-12 font-black text-slate-900 border-slate-200 bg-white focus:ring-indigo-500"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="bank_number"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1.5">
                                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account No</FormLabel>
                                                <FormControl>
                                                    <Combobox
                                                        items={accountNoItems}
                                                        value={field.value}
                                                        onValueChange={(val) => {
                                                            field.onChange(val)
                                                            const match = accountNoItems.find((r: any) => r.value === val)
                                                            if (match?.receiver_name) {
                                                                form.setValue('receiver_name', match.receiver_name)
                                                            }
                                                        }}
                                                        placeholder="01234..."
                                                        className="h-12 border-slate-200 bg-white tabular-nums font-bold"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* SECTION 3: Workflow Setting */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Grid Placement</span>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="phase_id"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <div className={cn("flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200", phases.length > 2 ? "flex-wrap" : "")}>
                                                {phases.length > 0 ? phases.map((phase) => (
                                                    <Button
                                                        key={phase.id}
                                                        type="button"
                                                        variant={field.value === phase.id ? 'default' : 'ghost'}
                                                        className={cn(
                                                            "flex-1 h-11 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                                                            field.value === phase.id ? "bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100 hover:bg-white" : "text-slate-400"
                                                        )}
                                                        onClick={() => {
                                                            field.onChange(phase.id)
                                                            form.setValue('cutoff_period', phase.period_type)
                                                        }}
                                                    >
                                                        {phase.label}
                                                    </Button>
                                                )) : (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant={cutoffPeriod === 'before' ? 'default' : 'ghost'}
                                                            className={cn(
                                                                "flex-1 h-11 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                                                                cutoffPeriod === 'before' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100 hover:bg-white" : "text-slate-400"
                                                            )}
                                                            onClick={() => form.setValue('cutoff_period', 'before')}
                                                        >
                                                            Day 1 - 15
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={cutoffPeriod === 'after' ? 'default' : 'ghost'}
                                                            className={cn(
                                                                "flex-1 h-11 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                                                                cutoffPeriod === 'after' ? "bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100 hover:bg-white" : "text-slate-400"
                                                            )}
                                                            onClick={() => form.setValue('cutoff_period', 'after')}
                                                        >
                                                            Day 16 - END
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">Determines which phase section this target appears in</p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </form>
                    </Form>
                </div>

                {/* Footer */}
                <div className="border-t p-6 bg-slate-50 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-600"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 shadow-lg shadow-slate-200"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        <span>{isEditMode ? 'Save Changes' : 'Save to Master'}</span>
                    </Button>
                </div>

                {/* Account Edit Slide */}
                <AccountSlideV2
                    open={isAccountSlideOpen}
                    onOpenChange={setIsAccountSlideOpen}
                    account={selectedAccountForEdit}
                    allAccounts={accounts}
                    onBack={() => setIsAccountSlideOpen(false)}
                />
            </div>
        </>
    )
}
