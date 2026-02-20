'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { updateBatchSettingsAction, getBatchSettingsAction } from '@/actions/batch-settings.actions'
import { toast } from 'sonner'

export function BatchSettingsPage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
    const [mbbSheetUrl, setMbbSheetUrl] = useState('')
    const [vibSheetUrl, setVibSheetUrl] = useState('')
    const [mbbImageUrl, setMbbImageUrl] = useState('')
    const [vibImageUrl, setVibImageUrl] = useState('')
    const [mbbWebhookUrl, setMbbWebhookUrl] = useState('')
    const [vibWebhookUrl, setVibWebhookUrl] = useState('')
    const [mbbCutoffDay, setMbbCutoffDay] = useState<number>(15)
    const [vibCutoffDay, setVibCutoffDay] = useState<number>(15)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)

    // Track original values to detect changes
    const [originalMBB, setOriginalMBB] = useState({ sheet: '', image: '', webhook: '', cutoff: 15 })
    const [originalVIB, setOriginalVIB] = useState({ sheet: '', image: '', webhook: '', cutoff: 15 })

    // Load settings on mount
    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            const [mbbResult, vibResult] = await Promise.all([
                getBatchSettingsAction('MBB'),
                getBatchSettingsAction('VIB')
            ])

            if (mbbResult.success && (mbbResult as any).data) {
                const mbbData = (mbbResult as any).data
                setMbbSheetUrl(mbbData.sheet_url || '')
                setMbbImageUrl(mbbData.image_url || '')
                setMbbWebhookUrl(mbbData.webhook_url || '')
                setMbbCutoffDay(mbbData.cutoff_day || 15)
                setOriginalMBB({
                    sheet: mbbData.sheet_url || '',
                    image: mbbData.image_url || '',
                    webhook: mbbData.webhook_url || '',
                    cutoff: mbbData.cutoff_day || 15
                })
            }

            if (vibResult.success && (vibResult as any).data) {
                const vibData = (vibResult as any).data
                setVibSheetUrl(vibData.sheet_url || '')
                setVibImageUrl(vibData.image_url || '')
                setVibWebhookUrl(vibData.webhook_url || '')
                setVibCutoffDay(vibData.cutoff_day || 15)
                setOriginalVIB({
                    sheet: vibData.sheet_url || '',
                    image: vibData.image_url || '',
                    webhook: vibData.webhook_url || '',
                    cutoff: vibData.cutoff_day || 15
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
                cutoff_day: mbbCutoffDay
            })

            if (result.success) {
                toast.success('MBB settings saved successfully!')
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
                cutoff_day: vibCutoffDay
            })

            if (result.success) {
                toast.success('VIB settings saved successfully!')
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
        mbbCutoffDay !== originalMBB.cutoff

    const vibHasChanges =
        vibSheetUrl !== originalVIB.sheet ||
        vibImageUrl !== originalVIB.image ||
        vibWebhookUrl !== originalVIB.webhook ||
        vibCutoffDay !== originalVIB.cutoff

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className={hideHeader ? 'bg-white' : 'min-h-screen bg-slate-50'}>
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
                                    <p className="text-xs text-slate-500">
                                        💡 The day of the month that separates 'Before' and 'After' tabs for this bank.
                                    </p>
                                </div>

                                <Button onClick={handleSaveMBB} disabled={loading || !mbbHasChanges} className="w-full">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {!loading && <Save className="mr-2 h-4 w-4" />}
                                    Save MBB Settings
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="vib">
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
                                    <p className="text-xs text-slate-500">
                                        💡 The day of the month that separates 'Before' and 'After' tabs for this bank.
                                    </p>
                                </div>

                                <Button onClick={handleSaveVIB} disabled={loading || !vibHasChanges} className="w-full">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {!loading && <Save className="mr-2 h-4 w-4" />}
                                    Save VIB Settings
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
