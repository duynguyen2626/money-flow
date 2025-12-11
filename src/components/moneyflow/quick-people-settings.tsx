'use client'

import { useEffect, useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Person } from '@/types/moneyflow.types'
import { QuickPeopleConfig, DEFAULT_QUICK_PEOPLE_CONFIG } from '@/types/settings.types'
import { getQuickPeopleConfigAction, saveQuickPeopleConfigAction } from '@/actions/settings-actions'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

type QuickPeopleSettingsProps = {
    people: Person[]
    onClose?: () => void
}

export function QuickPeopleSettings({ people, onClose }: QuickPeopleSettingsProps) {
    const [config, setConfig] = useState<QuickPeopleConfig>(DEFAULT_QUICK_PEOPLE_CONFIG)
    const [loading, setLoading] = useState(true)
    const [isSaving, startSaving] = useTransition()

    useEffect(() => {
        async function fetchConfig() {
            const res = await getQuickPeopleConfigAction()
            if (res.success && res.data) {
                setConfig(res.data)
            }
            setLoading(false)
        }
        fetchConfig()
    }, [])

    const handleSave = () => {
        startSaving(async () => {
            const res = await saveQuickPeopleConfigAction(config)
            if (res.success) {
                toast.success('Settings saved successfully')
                onClose?.()
            } else {
                toast.error('Failed to save settings')
            }
        })
    }

    const togglePin = (personId: string) => {
        setConfig(prev => {
            const current = prev.pinned_ids || []
            const exists = current.includes(personId)
            return {
                ...prev,
                pinned_ids: exists
                    ? current.filter(id => id !== personId)
                    : [...current, personId]
            }
        })
    }

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
    }

    return (
        <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-0.5">
                    <Label className="text-base">Smart Mode</Label>
                    <p className="text-sm text-slate-500">
                        Automatically show top 5 most recently used people.
                    </p>
                </div>
                <Switch
                    checked={config.mode === 'smart'}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, mode: checked ? 'smart' : 'manual' }))}
                />
            </div>

            {config.mode === 'manual' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-700">Select People for Quick Access</h4>
                        <span className="text-xs text-slate-500">{config.pinned_ids.length} selected</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
                        {people.map(person => {
                            const isPinned = config.pinned_ids?.includes(person.id)
                            return (
                                <div key={person.id} className="flex items-center space-x-2 border border-slate-100 p-2 rounded hover:bg-slate-50">
                                    <Checkbox
                                        id={`pin-${person.id}`}
                                        checked={isPinned}
                                        onCheckedChange={() => togglePin(person.id)}
                                    />
                                    <Label htmlFor={`pin-${person.id}`} className="text-sm cursor-pointer flex-1 truncate">
                                        {person.name}
                                    </Label>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {config.mode === 'smart' && (
                <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-lg text-sm text-blue-700">
                    <p>
                        <strong>Note:</strong> In Smart Mode, the system tracks your "Lend" and "Repay" actions and automatically updates the Quick List.
                    </p>
                    <div className="mt-2 text-xs text-blue-600">
                        Currently tracking <strong>{people.length}</strong> people.
                    </div>
                </div>
            )}

            <div className="pt-2 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Settings
                </Button>
            </div>
        </div>
    )
}
