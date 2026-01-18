"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface UnsavedChangesWarningProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onContinueEditing: () => void;
    onDiscardChanges: () => void;
}

export function UnsavedChangesWarning({
    open,
    onOpenChange,
    onContinueEditing,
    onDiscardChanges
}: UnsavedChangesWarningProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="h-auto max-h-[40vh] rounded-t-2xl border-t-4 border-amber-500"
                showClose={false}
            >
                <div className="flex flex-col items-center gap-6 py-4">
                    {/* Icon */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle className="h-8 w-8 text-amber-600" />
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-2">
                        <SheetTitle className="text-xl font-semibold">
                            Unsaved Changes
                        </SheetTitle>
                        <SheetDescription className="text-base text-muted-foreground max-w-sm mx-auto">
                            You have unsaved changes. Are you sure you want to close without saving?
                        </SheetDescription>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                        <Button
                            variant="outline"
                            onClick={() => {
                                onContinueEditing();
                                onOpenChange(false);
                            }}
                            className="flex-1 h-11"
                        >
                            Continue Editing
                        </Button>
                        <Button
                            onClick={() => {
                                onDiscardChanges();
                                onOpenChange(false);
                            }}
                            className="flex-1 h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Discard Changes
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
