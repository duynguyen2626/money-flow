'use client'

import { Person, Subscription } from '@/types/moneyflow.types'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { PersonForm } from '@/components/people/person-form'
import { updatePersonAction } from '@/actions/people-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PersonSlideV2Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    person: Person
    subscriptions: Subscription[]
}

export function PersonSlideV2({
    open,
    onOpenChange,
    person,
    subscriptions,
}: PersonSlideV2Props) {
    const router = useRouter()

    const handleSubmit = async (values: any) => {
        try {
            const ok = await updatePersonAction(person.id, {
                name: values.name,
                image_url: values.image_url,
                sheet_link: values.sheet_link,
                subscriptionIds: values.subscriptionIds,
                is_archived: values.is_archived,
                is_group: values.is_group,
                is_owner: values.is_owner,
            })

            if (ok) {
                toast.success("Person updated successfully")
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error("Failed to update person")
            }
        } catch (error) {
            console.error(error)
            toast.error("An error occurred")
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-slate-50"
                side="right"
            >
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
                    <SheetTitle>Edit Person</SheetTitle>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50">
                    <PersonForm
                        mode="edit"
                        subscriptions={subscriptions}
                        initialValues={{
                            name: person.name,
                            image_url: person.image_url ?? '',
                            sheet_link: person.sheet_link ?? '',
                            subscriptionIds: person.subscription_ids ?? [],
                            is_owner: person.is_owner ?? false,
                            is_archived: person.is_archived ?? false,
                            is_group: person.is_group ?? false,
                        }}
                        onCancel={() => onOpenChange(false)}
                        onSubmit={handleSubmit}
                        submitLabel="Save Changes"
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
