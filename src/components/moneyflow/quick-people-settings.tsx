'use client'

import { useEffect, useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Person } from '@/types/moneyflow.types'
import { QuickPeopleConfig, DEFAULT_QUICK_PEOPLE_CONFIG } from '@/types/settings.types'
import { getQuickPeopleConfigAction, saveQuickPeopleConfigAction } from '@/actions/settings-actions'
import { toast } from 'sonner'
import { Loader2, Save, X, Search, Check } from 'lucide-react'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, getAccountInitial } from '@/lib/utils'

type QuickPeopleSettingsProps = {
    people: Person[]
    onClose?: () => void
}

export function QuickPeopleSettings({ people, onClose }: QuickPeopleSettingsProps) {
    const [config, setConfig] = useState<QuickPeopleConfig>(DEFAULT_QUICK_PEOPLE_CONFIG)
    const [loading, setLoading] = useState(true)
    const [isSaving, startSaving] = useTransition()
    const [open, setOpen] = useState(false)

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

    // Filter available people (exclude already pinned)
    const pinnedPeople = (config.pinned_ids || [])
        .map(id => people.find(p => p.id === id))
        .filter((p): p is Person => !!p)

    const availablePeople = people.filter(p => !config.pinned_ids?.includes(p.id))

    return (
        <div className="space-y-6 pt-4">
            {/* Smart Mode Toggle */}
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
                        <h4 className="text-sm font-semibold text-slate-700">Quick Access List</h4>
                        <span className="text-xs text-slate-500">{pinnedPeople.length} selected</span>
                    </div>

                    {/* Search & Add Dropdown */}
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                            >
                                <span className="text-slate-500 flex items-center gap-2">
                                    <Search className="w-4 h-4" />
                                    Search person to add...
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search people..." />
                                <CommandList>
                                    <CommandEmpty>No person found.</CommandEmpty>
                                    <CommandGroup heading="Available People">
                                        {availablePeople.map((person) => (
                                            <CommandItem
                                                key={person.id}
                                                value={person.name}
                                                onSelect={() => {
                                                    togglePin(person.id)
                                                    setOpen(false)
                                                }}
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                {person.avatar_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={person.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {getAccountInitial(person.name)}
                                                    </div>
                                                )}
                                                <span>{person.name}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {/* Selected List - Tags/List Style */}
                    {pinnedPeople.length > 0 ? (
                        <div className="grid gap-2 border border-slate-100 rounded-lg p-2 bg-slate-50/50 max-h-[300px] overflow-y-auto">
                            {pinnedPeople.map(person => (
                                <div
                                    key={person.id}
                                    className="group flex items-center justify-between p-2 rounded-md bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        {person.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={person.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                                                {getAccountInitial(person.name)}
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-slate-700">{person.name}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => togglePin(person.id)}
                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 text-sm">
                            No people selected. Use the search bar to add.
                        </div>
                    )}
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
