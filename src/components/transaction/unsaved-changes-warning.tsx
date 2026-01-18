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
                side="right"
                className="w-full sm:max-w-md border-l-4 border-amber-500 flex flex-col justify-center"
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
                    <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
                        <Button
                            onClick={() => {
                                onDiscardChanges();
                                onOpenChange(false);
                            }}
                            className="w-full h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Discard Changes
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                onContinueEditing();
                                onOpenChange(false);
                            }}
                            className="w-full h-11"
                        >
                            Continue Editing
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
