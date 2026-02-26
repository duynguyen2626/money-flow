"use client";

import React from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import { Person, Subscription } from "@/types/moneyflow.types";
import { PersonForm } from "../person-form";
import { createPersonAction, updatePersonAction } from "@/actions/people-actions";
import { useRouter } from "next/navigation";
import { Users, Info, ArrowLeft } from "lucide-react";
import { UnsavedChangesDialog } from "@/components/transaction/slide-v2/unsaved-changes-dialog";

interface PeopleSlideV2Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    person?: Person | null;
    subscriptions: Subscription[];
    onSuccess?: (result: { success: boolean, profileId?: string, debtAccountId?: string, person?: any }) => void;
}

export function PeopleSlideV2({
    open,
    onOpenChange,
    person,
    subscriptions,
    onSuccess,
    onBack,
    zIndex = 600,
}: PeopleSlideV2Props & { onBack?: () => void; zIndex?: number }) {
    const router = useRouter();
    const isEdit = !!person;
    const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
    const [isDirty, setIsDirty] = React.useState(false);
    const [pendingCloseAction, setPendingCloseAction] = React.useState<"close" | "back" | null>(null);

    const handleSuccess = (result?: any) => {
        onOpenChange(false);
        if (onSuccess) {
            onSuccess(result);
        } else {
            router.refresh();
        }
    };

    const confirmDiscard = () => {
        setShowUnsavedDialog(false);
        if (pendingCloseAction === "back") {
            onBack?.();
        } else {
            onOpenChange(false);
        }
        setPendingCloseAction(null);
    };

    const handleBack = () => {
        if (isDirty) {
            setPendingCloseAction("back");
            setShowUnsavedDialog(true);
        } else {
            onBack?.();
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && isDirty) {
            setPendingCloseAction("close");
            setShowUnsavedDialog(true);
        } else {
            onOpenChange(newOpen);
        }
    };

    const handleApply = async (values: {
        name: string
        image_url?: string
        sheet_link?: string
        google_sheet_url?: string
        subscriptionIds: string[]
        is_owner?: boolean
        is_archived?: boolean
        is_group?: boolean
    }) => {
        let result;
        if (isEdit && person) {
            result = await updatePersonAction(person.id, {
                name: values.name,
                image_url: values.image_url,
                sheet_link: values.sheet_link,
                google_sheet_url: values.google_sheet_url,
                subscriptionIds: values.subscriptionIds,
                is_owner: values.is_owner,
                is_archived: values.is_archived,
                is_group: values.is_group,
            });
            handleSuccess({ success: !!result });
        } else {
            const res = await createPersonAction({
                name: values.name,
                image_url: values.image_url,
                sheet_link: values.sheet_link,
                google_sheet_url: values.google_sheet_url,
                subscriptionIds: values.subscriptionIds,
                is_owner: values.is_owner,
                is_archived: values.is_archived,
                is_group: values.is_group,
            });
            handleSuccess({ ...res, person: { id: res.profileId, name: values.name, image_url: values.image_url } });
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-xl p-0 flex flex-col gap-0 border-l border-slate-200"
                    zIndex={zIndex}
                    onPointerDownOutside={(e) => {
                        if (isDirty) {
                            e.preventDefault()
                            setPendingCloseAction("close")
                            setShowUnsavedDialog(true)
                        }
                    }}
                    onEscapeKeyDown={(e) => {
                        if (isDirty) {
                            e.preventDefault()
                            setPendingCloseAction("close")
                            setShowUnsavedDialog(true)
                        }
                    }}
                >
                    <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                        <SheetHeader className="text-left">
                            <div className="flex items-center gap-3 mb-2">
                                {onBack && (
                                    <button
                                        onClick={handleBack}
                                        className="h-8 w-8 flex items-center justify-center -ml-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                                        title="Back"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                )}
                                <div className="h-9 w-9 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-blue-600">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-black text-slate-900 leading-tight">
                                        {isEdit ? "Edit Profile" : "New Member"}
                                    </SheetTitle>
                                    <SheetDescription className="text-xs font-medium text-slate-500">
                                        {isEdit ? `Modifying details for ${person.name}` : "Create a new person to track debts and subscriptions."}
                                    </SheetDescription>
                                </div>
                            </div>
                        </SheetHeader>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <PersonForm
                            mode={isEdit ? "edit" : "create"}
                            subscriptions={subscriptions}
                            initialValues={person ? {
                                name: person.name,
                                image_url: person.image_url ?? '',
                                sheet_link: person.sheet_link ?? '',
                                google_sheet_url: person.google_sheet_url ?? '',
                                subscriptionIds: person.subscription_ids ?? [],
                                is_owner: person.is_owner ?? false,
                                is_archived: person.is_archived ?? false,
                                is_group: person.is_group ?? false,
                            } : undefined}
                            onSubmit={handleApply}
                            onChange={() => setIsDirty(true)}
                            onCancel={() => handleOpenChange(false)}
                            submitLabel={isEdit ? "Save Changes" : "Create Profile"}
                        />
                    </div>

                    {!isEdit && (
                        <div className="px-6 py-4 bg-blue-50/50 border-t border-blue-100 flex items-start gap-3">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                A dedicated <strong>Debt Account</strong> will be automatically provisioned for this person upon creation. You can link this person to transactions to track lending and repayments.
                            </p>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <UnsavedChangesDialog
                open={showUnsavedDialog}
                onOpenChange={setShowUnsavedDialog}
                onConfirm={confirmDiscard}
                onCancel={() => {
                    setShowUnsavedDialog(false);
                    setPendingCloseAction(null);
                }}
            />
        </>
    );
}
