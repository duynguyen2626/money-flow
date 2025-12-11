'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QuickPeopleSettings } from './quick-people-settings'
import { Person } from '@/types/moneyflow.types'

type QuickPeopleSettingsDialogProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    people: Person[]
}

export function QuickPeopleSettingsDialog({ isOpen, onOpenChange, people }: QuickPeopleSettingsDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Quick People Settings</DialogTitle>
                </DialogHeader>
                <QuickPeopleSettings people={people} onClose={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    )
}
