'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { updateBatchSettingsAction, getBatchSettingsAction } from '@/actions/batch-settings.actions'
import { listAllBatchPhasesAction, createBatchPhaseAction, updateBatchPhaseAction, deleteBatchPhaseAction } from '@/actions/batch-phases.actions'
import { getAccountsAction } from '@/actions/account-actions'
import { BatchMasterManager } from './BatchMasterManager'
import { toast } from 'sonner'

export function BatchSettingsPage({ hideHeader = false, onSuccess }: { hideHeader?: boolean, onSuccess?: () => void } = {}) {
    const [mbbSheetUrl, setMbbSheetUrl] = useState('')
    const [vibSheetUrl, setVibSheetUrl] = useState('')
    const [mbbImageUrl, setMbbImageUrl] = useState('')
    const [vibImageUrl, setVibImageUrl] = useState('')
    const [mbbWebhookUrl, setMbbWebhookUrl] = useState('')
    const [vibWebhookUrl, setVibWebhookUrl] = useState('')
    const [mbbDisplaySheetUrl, setMbbDisplaySheetUrl] = useState('')
    const [vibDisplaySheetUrl, setVibDisplaySheetUrl] = useState('')
    const [mbbDisplaySheetName, setMbbDisplaySheetName] = useState('')
    const [vibDisplaySheetName, setVibDisplaySheetName] = useState('')
    const [mbbTabName, setMbbTabName] = useState('')
    const [vibTabName, setVibTabName] = useState('')
    const [mbbCutoffDay, setMbbCutoffDay] = useState<number>(15)
    const [vibCutoffDay, setVibCutoffDay] = useState<number>(15)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [accounts, setAccounts] = useState<any[]>([])

    // Track original values to detect changes
    const [originalMBB, setOriginalMBB] = useState({ sheet: '', image: '', webhook: '', cutoff: 15, displaySheetUrl: '', displaySheetName: '', tabName: '' })
    const [originalVIB, setOriginalVIB] = useState({ sheet: '', image: '', webhook: '', cutoff: 15, displaySheetUrl: '', displaySheetName: '', tabName: '' })

    // Load settings on mount
    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            const [mbbResult, vibResult, accountsResult] = await Promise.all([
                getBatchSettingsAction('MBB'),
                getBatchSettingsAction('VIB'),
                getAccountsAction()
            ])

            if (Array.isArray(accountsResult)) {
                setAccounts(accountsResult)
            }

            if (mbbResult.success && (mbbResult as any).data) {
                const mbbData = (mbbResult as any).data
                setMbbSheetUrl(mbbData.sheet_url || '')
                setMbbImageUrl(mbbData.image_url || '')
                setMbbWebhookUrl(mbbData.webhook_url || '')
                setMbbCutoffDay(mbbData.cutoff_day || 15)
                setMbbDisplaySheetUrl(mbbData.display_sheet_url || '')
                setMbbDisplaySheetName(mbbData.display_sheet_name || '')
                setMbbTabName(mbbData.sheet_name || '')
                setOriginalMBB({
                    sheet: mbbData.sheet_url || '',
                    image: mbbData.image_url || '',
                    webhook: mbbData.webhook_url || '',
                    cutoff: mbbData.cutoff_day || 15,
                    displaySheetUrl: mbbData.display_sheet_url || '',
                    displaySheetName: mbbData.display_sheet_name || '',
                    tabName: mbbData.sheet_name || ''
                })
            }

            if (vibResult.success && (vibResult as any).data) {
                const vibData = (vibResult as any).data
                setVibSheetUrl(vibData.sheet_url || '')
                setVibImageUrl(vibData.image_url || '')
                setVibWebhookUrl(vibData.webhook_url || '')
                setVibCutoffDay(vibData.cutoff_day || 15)
                setVibDisplaySheetUrl(vibData.display_sheet_url || '')
                setVibDisplaySheetName(vibData.display_sheet_name || '')
                setVibTabName(vibData.sheet_name || '')
                setOriginalVIB({
                    sheet: vibData.sheet_url || '',
                    image: vibData.image_url || '',
                    webhook: vibData.webhook_url || '',
                    cutoff: vibData.cutoff_day || 15,
                    displaySheetUrl: vibData.display_sheet_url || '',
                    displaySheetName: vibData.display_sheet_name || '',
                    tabName: vibData.sheet_name || ''
                })
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
            toast.error('Failed to load settings')
        } finally {
            setInitialLoading(false)
        }
    }

    async function handleSaveMBB() {
        setLoading(true)
        try {
            const result = await updateBatchSettingsAction('MBB', {
                sheet_url: mbbSheetUrl || null,
                webhook_url: mbbWebhookUrl || null,
                image_url: mbbImageUrl || null,
                cutoff_day: mbbCutoffDay,
                display_sheet_url: mbbDisplaySheetUrl || null,
                display_sheet_name: mbbDisplaySheetName || null,
                sheet_name: mbbTabName || null
            })

            if (result.success) {
                toast.success('MBB settings saved successfully!')
                if (onSuccess) onSuccess()
            } else {
                toast.error(result.error || 'Failed to save MBB settings')
            }
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Failed to save MBB settings')
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveVIB() {
        setLoading(true)
        try {
            const result = await updateBatchSettingsAction('VIB', {
                sheet_url: vibSheetUrl || null,
                webhook_url: vibWebhookUrl || null,
                image_url: vibImageUrl || null,
                cutoff_day: vibCutoffDay,
                display_sheet_url: vibDisplaySheetUrl || null,
                display_sheet_name: vibDisplaySheetName || null,
                sheet_name: vibTabName || null
            })

            if (result.success) {
                toast.success('VIB settings saved successfully!')
                if (onSuccess) onSuccess()
            } else {
                toast.error(result.error || 'Failed to save VIB settings')
            }
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Failed to save VIB settings')
        } finally {
            setLoading(false)
        }
    }

    // Check if there are unsaved changes
    const mbbHasChanges =
        mbbSheetUrl !== originalMBB.sheet ||
        mbbImageUrl !== originalMBB.image ||
        mbbWebhookUrl !== originalMBB.webhook ||
        mbbCutoffDay !== originalMBB.cutoff ||
        mbbDisplaySheetUrl !== originalMBB.displaySheetUrl ||
        mbbDisplaySheetName !== originalMBB.displaySheetName ||
        mbbTabName !== originalMBB.tabName

    const vibHasChanges =
        vibSheetUrl !== originalVIB.sheet ||
        vibImageUrl !== originalVIB.image ||
        vibWebhookUrl !== originalVIB.webhook ||
        vibCutoffDay !== originalVIB.cutoff ||
        vibDisplaySheetUrl !== originalVIB.displaySheetUrl ||
        vibDisplaySheetName !== originalVIB.displaySheetName ||
        vibTabName !== originalVIB.tabName

    if (initialLoading) {
        return (
            <div className="bg-slate-50 flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Settings...</p>
            </div>
        )
    }

    return (
        <div className={hideHeader ? 'bg-white relative' : 'min-h-screen bg-slate-50'}>
            {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-slate-100">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">Saving Changes...</span>
                    </div>
                </div>
            )}
            <div className={hideHeader ? 'px-6 py-6' : 'container mx-auto px-4 py-8 max-w-4xl'}>
                {/* Header */}
                {!hideHeader && (
                    <div className="flex items-center gap-4 mb-8">
                        <Link href="/batch">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Batch Settings</h1>
                            <p className="text-slate-600">Configure sheet URLs and webhooks</p>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="mbb" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="mbb">MB Bank</TabsTrigger>
                        <TabsTrigger value="vib">VIB</TabsTrigger>
                    </TabsList>

                    <TabsContent value="mbb">
                        <Card>
                            <CardHeader>
                                <CardTitle>MB Bank Settings</CardTitle>
                                <CardDescription>
                                    Configure Google Sheets integration for MBB batches
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mbb-sheet-url">Google Apps Script URL</Label>
                                    <Input
                                        id="mbb-sheet-url"
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        value={mbbSheetUrl}
                                        onChange={(e) => setMbbSheetUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">
                                        💡 Paste your MBB Google Apps Script deployment URL here
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mbb-webhook">Webhook URL (Optional)</Label>
                                    <Input
                                        id="mbb-webhook"
                                        placeholder="https://your-webhook.com/batch/mbb"
                                        value={mbbWebhookUrl}
                                        onChange={(e) => setMbbWebhookUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">
                                        💡 Optional: Auto-sync webhook after batch operations
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mbb-image">Bank Icon URL</Label>
                                    <Input
                                        id="mbb-image"
                                        placeholder="https://your-cdn.com/mbb-icon.png"
                                        value={mbbImageUrl}
                                        onChange={(e) => setMbbImageUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">
                                        💡 Paste image URL for MB Bank icon (displayed on landing page)
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="mbb-display-sheet-url">Google Sheet URL (Display)</Label>
                                        <Input
                                            id="mbb-display-sheet-url"
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            value={mbbDisplaySheetUrl}
                                            onChange={(e) => setMbbDisplaySheetUrl(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mbb-display-sheet-name">Display Name</Label>
                                        <Input
                                            id="mbb-display-sheet-name"
                                            placeholder="e.g. Master MBB Sheet"
                                            value={mbbDisplaySheetName}
                                            onChange={(e) => setMbbDisplaySheetName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="mbb-tab-name">Sheet Tab Name</Label>
                                        <Input
                                            id="mbb-tab-name"
                                            placeholder="eMB_BulkPayment"
                                            value={mbbTabName}
                                            onChange={(e) => setMbbTabName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mbb-cutoff">Cutoff Day</Label>
                                        <Input
                                            id="mbb-cutoff"
                                            type="number"
                                            placeholder="15"
                                            value={mbbCutoffDay === 0 ? '' : mbbCutoffDay}
                                            onChange={(e) => setMbbCutoffDay(Number(e.target.value))}
                                            min={1}
                                            max={31}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">
                                    💡 The day of the month that separates 'Before' and 'After' tabs for this bank.
                                </p>

                                <Button onClick={handleSaveMBB} disabled={loading || !mbbHasChanges} className="w-full">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {!loading && <Save className="mr-2 h-4 w-4" />}
                                    Save MBB Settings
                                </Button>
                            </CardContent>
                        </Card>

                        <PhaseManager bankType="MBB" />
                    </TabsContent>

                    <TabsContent value="vib">
                        {/* Existing VIB Content */}
                        <Card>
                            <CardHeader>
                                <CardTitle>VIB Settings</CardTitle>
                                <CardDescription>
                                    Configure Google Sheets integration for VIB batches
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vib-sheet-url">Google Apps Script URL</Label>
                                    <Input
                                        id="vib-sheet-url"
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        value={vibSheetUrl}
                                        onChange={(e) => setVibSheetUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">
                                        💡 Paste your VIB Google Apps Script deployment URL here
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="vib-webhook">Webhook URL (Optional)</Label>
                                    <Input
                                        id="vib-webhook"
                                        placeholder="https://your-webhook.com/batch/vib"
                                        value={vibWebhookUrl}
                                        onChange={(e) => setVibWebhookUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">
                                        💡 Optional: Auto-sync webhook after batch operations
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="vib-image">Bank Icon URL</Label>
                                    <Input
                                        id="vib-image"
                                        placeholder="https://your-cdn.com/vib-icon.png"
                                        value={vibImageUrl}
                                        onChange={(e) => setVibImageUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500">
                                        💡 Paste image URL for VIB icon (displayed on landing page)
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="vib-display-sheet-url">Google Sheet URL (Display)</Label>
                                        <Input
                                            id="vib-display-sheet-url"
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            value={vibDisplaySheetUrl}
                                            onChange={(e) => setVibDisplaySheetUrl(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vib-display-sheet-name">Display Name</Label>
                                        <Input
                                            id="vib-display-sheet-name"
                                            placeholder="e.g. Master VIB Sheet"
                                            value={vibDisplaySheetName}
                                            onChange={(e) => setVibDisplaySheetName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="vib-tab-name">Sheet Tab Name</Label>
                                        <Input
                                            id="vib-tab-name"
                                            placeholder="Danh sách chuyển tiền"
                                            value={vibTabName}
                                            onChange={(e) => setVibTabName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vib-cutoff">Cutoff Day</Label>
                                        <Input
                                            id="vib-cutoff"
                                            type="number"
                                            placeholder="15"
                                            value={vibCutoffDay === 0 ? '' : vibCutoffDay}
                                            onChange={(e) => setVibCutoffDay(Number(e.target.value))}
                                            min={1}
                                            max={31}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">
                                    💡 The day of the month that separates 'Before' and 'After' tabs for this bank.
                                </p>

                                <Button onClick={handleSaveVIB} disabled={loading || !vibHasChanges} className="w-full">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {!loading && <Save className="mr-2 h-4 w-4" />}
                                    Save VIB Settings
                                </Button>
                            </CardContent>
                        </Card>

                        <PhaseManager bankType="VIB" />
                    </TabsContent>


                </Tabs>
            </div>
        </div>
    )
}

function PhaseManager({ bankType }: { bankType: 'MBB' | 'VIB' }) {
    const [phases, setPhases] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [newLabel, setNewLabel] = useState('')
    const [newPeriodType, setNewPeriodType] = useState<'before' | 'after'>('before')
    const [newCutoffDay, setNewCutoffDay] = useState(15)

    useEffect(() => {
        loadPhases()
    }, [bankType])

    async function loadPhases() {
        setLoading(true)
        try {
            const result = await listAllBatchPhasesAction(bankType)
            if (result.success) setPhases(result.data || [])
        } catch (e) {
            console.error('Failed to load phases', e)
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd() {
        if (!newLabel.trim()) {
            toast.error('Phase label is required')
            return
        }
        setAdding(true)
        try {
            const result = await createBatchPhaseAction({
                bankType,
                label: newLabel.trim(),
                periodType: newPeriodType,
                cutoffDay: newCutoffDay
            })
            if (result.success) {
                toast.success('Phase created')
                setNewLabel('')
                setNewCutoffDay(15)
                loadPhases()
            } else {
                toast.error(result.error || 'Failed to create phase')
            }
        } catch (e: any) {
            toast.error(e.message || 'Error creating phase')
        } finally {
            setAdding(false)
        }
    }

    async function handleToggleActive(id: string, isActive: boolean) {
        const result = await updateBatchPhaseAction(id, { isActive: !isActive })
        if (result.success) {
            toast.success(isActive ? 'Phase deactivated' : 'Phase activated')
            loadPhases()
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Soft-delete this phase? Items will remain but unlinked.')) return
        const result = await deleteBatchPhaseAction(id)
        if (result.success) {
            toast.success('Phase removed')
            loadPhases()
        }
    }

    async function handleUpdateField(id: string, field: string, value: any) {
        const updates: any = {}
        if (field === 'label') updates.label = value
        if (field === 'cutoffDay') updates.cutoffDay = Number(value)
        if (field === 'periodType') updates.periodType = value

        const result = await updateBatchPhaseAction(id, updates)
        if (result.success) {
            toast.success('Phase updated')
            loadPhases()
        }
    }

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="text-base">Batch Phases ({bankType})</CardTitle>
                <CardDescription>
                    Manage payment phases. Each phase defines a cutoff boundary for grouping master items.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {phases.map((phase) => (
                            <div key={phase.id} className={`flex items-center gap-3 p-3 rounded-xl border ${phase.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                                <Input
                                    defaultValue={phase.label}
                                    className="h-9 text-sm font-bold flex-1"
                                    onBlur={(e) => {
                                        if (e.target.value !== phase.label) handleUpdateField(phase.id, 'label', e.target.value)
                                    }}
                                />
                                <select
                                    defaultValue={phase.period_type}
                                    className="h-9 px-2 text-xs font-bold border border-slate-200 rounded-lg bg-white"
                                    onChange={(e) => handleUpdateField(phase.id, 'periodType', e.target.value)}
                                >
                                    <option value="before">Before</option>
                                    <option value="after">After</option>
                                </select>
                                <Input
                                    type="number"
                                    defaultValue={phase.cutoff_day}
                                    className="h-9 w-16 text-sm text-center"
                                    min={1}
                                    max={31}
                                    onBlur={(e) => {
                                        if (Number(e.target.value) !== phase.cutoff_day) handleUpdateField(phase.id, 'cutoffDay', e.target.value)
                                    }}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-9 text-xs font-bold ${phase.is_active ? 'text-emerald-600' : 'text-slate-400'}`}
                                    onClick={() => handleToggleActive(phase.id, phase.is_active)}
                                >
                                    {phase.is_active ? 'Active' : 'Inactive'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-slate-300 hover:text-red-500"
                                    onClick={() => handleDelete(phase.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}

                        {phases.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No phases configured. Add one below.</p>
                        )}
                    </div>
                )}

                {/* Add new phase */}
                <div className="flex items-end gap-3 pt-2 border-t border-slate-100">
                    <div className="flex-1 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Label</Label>
                        <Input
                            placeholder="e.g. Before 10"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            className="h-9 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Type</Label>
                        <select
                            value={newPeriodType}
                            onChange={(e) => setNewPeriodType(e.target.value as 'before' | 'after')}
                            className="h-9 px-2 text-xs font-bold border border-slate-200 rounded-lg bg-white"
                        >
                            <option value="before">Before</option>
                            <option value="after">After</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Day</Label>
                        <Input
                            type="number"
                            value={newCutoffDay}
                            onChange={(e) => setNewCutoffDay(Number(e.target.value))}
                            className="h-9 w-16 text-sm text-center"
                            min={1}
                            max={31}
                        />
                    </div>
                    <Button onClick={handleAdd} disabled={adding} size="sm" className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700">
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                        Add
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
