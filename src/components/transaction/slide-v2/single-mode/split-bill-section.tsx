"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    FormControl,
    FormField,
    FormItem,
} from "@/components/ui/form";
import {
    Collapsible,
    CollapsibleContent,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { SingleTransactionFormValues } from "../types";
import { Person } from "@/types/moneyflow.types";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { toast } from "sonner";

type SplitBillSectionProps = {
    people: Person[];
    forceShow?: boolean;
};

export function SplitBillSection({ people, forceShow = false }: SplitBillSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "participants",
    });

    const [isOpen, setIsOpen] = useState(false);
    const transactionType = useWatch({ control: form.control, name: "type" });
    const amount = useWatch({ control: form.control, name: "amount" });
    const participants =
        useWatch({ control: form.control, name: "participants" }) || [];
    const personId = useWatch({ control: form.control, name: "person_id" });

    const totalSplit = participants.reduce(
        (sum, participant) => sum + (participant.amount || 0),
        0,
    );
    const remainder = (amount || 0) - totalSplit;

    const shouldShow =
        forceShow || !!personId || ["expense", "debt"].includes(transactionType);

    const isExpanded = isOpen || participants.length > 0;

    const peopleOptions = useMemo(
        () =>
            people.map((person) => ({
                value: person.id,
                label: person.name,
                icon: (
                    <PersonAvatar
                        name={person.name}
                        imageUrl={person.image_url}
                        size="sm"
                    />
                ),
            })),
        [people],
    );

    const handleAddPerson = () => {
        append({ person_id: "", amount: 0 });
        setIsOpen(true);
    };

    const handleSplitEqually = () => {
        if (participants.length === 0 || !amount) return;

        const count = participants.length;
        const share = Math.floor(amount / count);
        const leftover = amount - share * count;

        replace(
            participants.map((participant, index) => ({
                ...participant,
                amount: index === 0 ? share + leftover : share,
            })),
        );
    };

    const handleDistributeRemainder = () => {
        if (!amount || participants.length === 0) return;

        const currentClaimed = participants.reduce(
            (sum, participant) => sum + (participant.amount || 0),
            0,
        );
        const remaining = amount - currentClaimed;
        if (remaining <= 0) return;

        const emptyIndexes = participants
            .map((participant, index) => ({ participant, index }))
            .filter(({ participant }) => !participant.amount);

        if (emptyIndexes.length === 0) return;

        const share = Math.floor(remaining / emptyIndexes.length);
        const dust = remaining - share * emptyIndexes.length;
        const nextParticipants = participants.map((participant) => ({
            ...participant,
        }));

        emptyIndexes.forEach(({ index }, itemIndex) => {
            nextParticipants[index].amount = itemIndex === 0 ? share + dust : share;
        });

        replace(nextParticipants);
    };

    if (!shouldShow) return null;

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <div>
                        <Label className="text-sm font-medium text-slate-700">
                            Split Bill
                        </Label>
                        <p className="text-[11px] text-slate-500">
                            Keep people and shares in sync with the form.
                        </p>
                    </div>
                </div>
                <div
                    className="relative cursor-pointer"
                    onClick={(event) => {
                        if (!amount && !isExpanded) {
                            event.preventDefault();
                            event.stopPropagation();
                            toast.error("Please input amount to split with people", {
                                position: "top-right",
                                className:
                                    "bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest border-none shadow-xl",
                            });
                        }
                    }}
                >
                    <Switch
                        checked={isExpanded}
                        onCheckedChange={(checked) => {
                            setIsOpen(checked);
                            if (checked) {
                                if (fields.length === 0) append({ person_id: "", amount: 0 });
                            } else {
                                form.setValue("participants", [], { shouldDirty: true });
                            }
                        }}
                        disabled={!amount && !isExpanded}
                        className={cn(!amount && !isExpanded && "pointer-events-none")}
                    />
                </div>
            </div>

            <Collapsible open={isExpanded} onOpenChange={setIsOpen}>
                <CollapsibleContent className="space-y-3 pt-1">
                    <div className="flex justify-between px-1 text-xs text-slate-500">
                        <span>Total: {new Intl.NumberFormat().format(amount || 0)}</span>
                        <span
                            className={cn(
                                "font-medium",
                                remainder < 0
                                    ? "text-red-600"
                                    : remainder > 0
                                        ? "text-orange-600"
                                        : "text-green-600",
                            )}
                        >
                            Remaining: {new Intl.NumberFormat().format(remainder)}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-2">
                                <div className="grid flex-1 grid-cols-[minmax(0,1fr)_132px] gap-2">
                                    <FormField
                                        control={form.control}
                                        name={`participants.${index}.person_id`}
                                        render={({ field: personField }) => (
                                            <FormItem className="w-full">
                                                <FormControl>
                                                    <Combobox
                                                        items={peopleOptions}
                                                        value={personField.value || undefined}
                                                        onValueChange={(value) =>
                                                            personField.onChange(value || "")
                                                        }
                                                        placeholder="Person"
                                                        className="h-10 w-full"
                                                        addLabel="Person"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name={`participants.${index}.amount`}
                                        render={({ field: amountField }) => (
                                            <FormItem className="w-full">
                                                <FormControl>
                                                    <SmartAmountInput
                                                        value={amountField.value || 0}
                                                        onChange={(value) => amountField.onChange(value || 0)}
                                                        hideLabel
                                                        className="h-10 font-medium"
                                                        placeholder="0"
                                                        compact
                                                        hideCalculator
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="h-10 w-10 shrink-0 text-slate-400 hover:text-red-500"
                                    type="button"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddPerson}
                            className="h-9 flex-1 border-dashed"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Person
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSplitEqually}
                            className="h-9 text-xs text-blue-600"
                            disabled={!amount || fields.length === 0}
                        >
                            Split Equally
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDistributeRemainder}
                            className="h-9 text-xs text-orange-600"
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
