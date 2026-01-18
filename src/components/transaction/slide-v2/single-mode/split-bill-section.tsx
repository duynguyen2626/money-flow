"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Trash2, User, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { SingleTransactionFormValues } from "../types";
import { Person } from "@/types/moneyflow.types";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { useState, useEffect } from "react";

type SplitBillSectionProps = {
    people: Person[];
};

export function SplitBillSection({ people }: SplitBillSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "participants"
    });

    const [isOpen, setIsOpen] = useState(false);
    const transactionType = useWatch({ control: form.control, name: "type" });
    const amount = useWatch({ control: form.control, name: "amount" });
    const participants = useWatch({ control: form.control, name: "participants" }) || [];

    // Calculate total split amount
    const totalSplit = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainder = (amount || 0) - totalSplit;

    // Limit visibility to Expense and Debt
    const shouldShow = ['expense', 'debt'].includes(transactionType);

    // Remove auto-open effect that prevents closing
    // useEffect(() => { ... }) - REMOVED

    // ... mappings ...

    if (!shouldShow) return null;

    const peopleOptions = people.map(p => {
        return {
            value: p.id,
            label: p.name,
            icon: <PersonAvatar name={p.name} imageUrl={p.image_url} size="sm" />
        };
    });

    const handleAddPerson = () => {
        append({ person_id: "", amount: 0 });
        setIsOpen(true);
    };

    const handleSplitEqually = () => {
        if (participants.length === 0 || !amount) return;
        const count = participants.length;
        const share = Math.floor(amount / count);
        const remainder = amount - (share * count);

        const newParticipants = participants.map((p, index) => ({
            ...p,
            amount: index === 0 ? share + remainder : share
        }));

        form.setValue("participants", newParticipants);
    };

    return (
        <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <Label className="text-sm font-medium text-slate-700">Split Bill</Label>
                </div>
                <Switch
                    checked={isOpen}
                    onCheckedChange={(checked) => {
                        setIsOpen(checked);
                        if (checked) {
                            if (fields.length === 0) append({ person_id: "", amount: 0 });
                        } else {
                            // Optional: Clear participants when toggling off?
                            // For now, let's keep data but UI closes. 
                            // If user explicitly turns off, we might want to clear to avoid accidental processing.
                            form.setValue("participants", []);
                        }
                    }}
                    disabled={!amount && !isOpen} // Disable enabling if no amount? User said "chỉ cho split khi đã nhập amount"
                />
            </div>

            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleContent className="space-y-3 pt-3">
                    {/* Summary */}
                    <div className="flex justify-between text-xs text-slate-500 px-1">
                        <span>Total: {new Intl.NumberFormat().format(amount || 0)}</span>
                        <span className={cn(
                            "font-medium",
                            remainder < 0 ? "text-red-600" : remainder > 0 ? "text-orange-600" : "text-green-600"
                        )}>
                            Remaining: {new Intl.NumberFormat().format(remainder)}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-start">
                                {/* Grid container for inputs ensures consistent 50% width */}
                                <div className="grid grid-cols-2 gap-2 flex-1">
                                    <FormItem className="w-full">
                                        <FormControl>
                                            <Combobox
                                                items={peopleOptions}
                                                value={form.getValues(`participants.${index}.person_id`)}
                                                onValueChange={(val) => {
                                                    if (val) form.setValue(`participants.${index}.person_id`, val);
                                                }}
                                                placeholder="Person"
                                                className="h-10 w-full"
                                                onAddNew={() => console.log("Add Person")}
                                                addLabel="Person"
                                            />
                                        </FormControl>
                                    </FormItem>

                                    <FormItem className="w-full">
                                        <FormControl>
                                            <SmartAmountInput
                                                value={form.getValues(`participants.${index}.amount`)}
                                                onChange={(val) => form.setValue(`participants.${index}.amount`, val || 0)}
                                                hideLabel
                                                className="h-10 font-medium"
                                                placeholder="0"
                                            />
                                        </FormControl>
                                    </FormItem>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="h-9 w-9 text-slate-400 hover:text-red-500 shrink-0"
                                    type="button"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddPerson}
                            className="flex-1 border-dashed h-9"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Person
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSplitEqually}
                            className="text-xs text-blue-600 h-9"
                            disabled={!amount || fields.length === 0}
                        >
                            Split Equally
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (!amount || participants.length === 0) return;

                                // 1. Calculate current sum of NON-ZERO inputs to determine what's already "claimed"
                                // We trust the form state 'participants' which tracks current values
                                const currentClaimed = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
                                const remainder = amount - currentClaimed;

                                if (remainder <= 0) return; // Nothing to distribute

                                // 2. Find targets: Participants with 0 amount
                                const emptyTargets = participants.map((p, i) => ({ ...p, originalIndex: i }))
                                    .filter(p => !p.amount || p.amount === 0);

                                if (emptyTargets.length === 0) return; // No empty slots

                                // 3. Distribute remainder
                                const count = emptyTargets.length;
                                const share = Math.floor(remainder / count);
                                const dust = remainder - (share * count);

                                // 4. Update form
                                const newParticipants = [...participants];
                                emptyTargets.forEach((p, i) => {
                                    newParticipants[p.originalIndex].amount = i === 0 ? share + dust : share;
                                });
                                form.setValue("participants", newParticipants);
                            }}
                            className="text-xs text-orange-600 h-9"
                            disabled={!amount || fields.length === 0 || remainder <= 0}
                        >
                            Distribute Rem.
                        </Button>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
