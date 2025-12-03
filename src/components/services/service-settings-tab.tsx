'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { distributeServiceAction, getServiceBotConfigAction, saveServiceBotConfigAction } from '@/actions/service-actions'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface ServiceSettingsTabProps {
    service: any
}

export function ServiceSettingsTab({ service }: ServiceSettingsTabProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [distributing, setDistributing] = useState(false)

    // Config State
    const [isEnabled, setIsEnabled] = useState(false)
    const [runDay, setRunDay] = useState(1)
    const [noteTemplate, setNoteTemplate] = useState('')

    useEffect(() => {
        loadConfig()
    }, [service.id])

    async function loadConfig() {
        setLoading(true)
        try {
            const config: any = await getServiceBotConfigAction(service.id)
            if (config) {
                setIsEnabled(config.is_enabled || false)
                if (config.config) {
                    const c = config.config as any
                    setRunDay(c.runDay || 1)
                    setNoteTemplate(c.noteTemplate || '')
                }
            } else {
                // Default values
                setNoteTemplate(service.note_template || `{service} {date} [{slots} slots] [{price}]`)
            }
        } catch (error) {
            console.error('Failed to load config:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        try {
            await saveServiceBotConfigAction(service.id, {
                isEnabled,
                runDay,
                noteTemplate
            })
            toast.success('Settings saved successfully')
        } catch (error) {
            toast.error('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    async function handleManualRun() {
        if (!confirm('Are you sure you want to run the distribution manually? This will create transactions immediately.')) return

        setDistributing(true)
        try {
            const result = await distributeServiceAction(service.id, undefined, noteTemplate)
            if (result.success) {
                toast.success(`Distribution successful! Created ${result.transactions?.length || 0} transactions.`)
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Failed to run distribution')
        } finally {
            setDistributing(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Automation Configuration</CardTitle>
                    <CardDescription>Configure how the bot handles this service monthly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Auto Run Monthly</Label>
                            <div className="text-sm text-muted-foreground">
                                Automatically distribute costs on a specific day.
                            </div>
                        </div>
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={setIsEnabled}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Run Day (1-31)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={31}
                            value={runDay}
                            onChange={(e) => setRunDay(parseInt(e.target.value))}
                            disabled={!isEnabled}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Note Template</Label>
                        <Input
                            value={noteTemplate}
                            onChange={(e) => setNoteTemplate(e.target.value)}
                            placeholder="{service} {date}..."
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Tokens: {'{service}'}, {'{member}'}, {'{slots}'}, {'{date}'}, {'{price}'}, {'{total_slots}'}
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Configuration
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Manual Trigger</CardTitle>
                    <CardDescription>Run the distribution logic immediately for testing or manual processing.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        This will calculate the cost per slot and create transactions for all members based on the current configuration.
                    </p>
                    <Button onClick={handleManualRun} disabled={distributing} variant="secondary" className="w-full sm:w-auto">
                        {distributing ? 'Processing...' : '⚡ Run Distribution Now'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
