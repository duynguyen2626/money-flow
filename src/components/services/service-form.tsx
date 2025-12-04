// @ts-nocheck
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { ShopCombobox } from '@/components/shops/shop-combobox'
import { Person } from '@/types/moneyflow.types'
import { Check, ChevronsUpDown, Trash2, UserPlus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  price: z.coerce.number().min(0, {
    message: 'Price must be a positive number.',
  }),
  shop_id: z.string().uuid().optional().nullable(),
  members: z.array(z.object({
    profile_id: z.string(),
    slots: z.coerce.number().min(1).default(1),
    is_owner: z.boolean().default(false)
  })).optional().default([])
})

export type ServiceFormValues = z.infer<typeof formSchema>

interface ServiceFormProps {
  onSubmit: (values: ServiceFormValues) => void
  onCancel: () => void
  initialValues?: Partial<ServiceFormValues>
  mode: 'create' | 'edit'
  people: Person[]
}

export function ServiceForm({
  onSubmit,
  onCancel,
  initialValues,
  mode,
  people = [],
}: ServiceFormProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      price: 0,
      shop_id: null,
      members: [],
      ...initialValues,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
  });

  const watchedPrice = useWatch({ control: form.control, name: "price" }) || 0;
  const watchedMembers = useWatch({ control: form.control, name: "members" }) || [];

  const totalSlots = watchedMembers.reduce((sum, m) => sum + (Number(m.slots) || 0), 0);
  const unitCost = totalSlots > 0 ? watchedPrice / totalSlots : 0;

  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues)
    }
  }, [initialValues, form])

  const submitLabel = mode === 'create' ? 'Create Service' : 'Update Service'

  // Combobox state
  const [openCombobox, setOpenCombobox] = useState(false)

  const handleAddMember = (personId: string) => {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    // Check if already added
    if (fields.some(f => f.profile_id === personId)) {
      return;
    }

    append({
      profile_id: personId,
      slots: 1,
      is_owner: person.is_owner || false
    });
    setOpenCombobox(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Netflix" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 260000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="shop_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Shop (Optional)</FormLabel>
              <ShopCombobox
                value={field.value || ''}
                onChange={(val) => field.onChange(val || null)}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Members Section */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <FormLabel>Members</FormLabel>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" role="combobox" aria-expanded={openCombobox} className="h-8">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search person..." />
                  <CommandEmpty>No person found.</CommandEmpty>
                  <CommandGroup>
                    {people.map((person) => (
                      <CommandItem
                        key={person.id}
                        value={person.name}
                        onSelect={() => handleAddMember(person.id)}
                        disabled={fields.some(f => f.profile_id === person.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            fields.some(f => f.profile_id === person.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {person.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => {
              const person = people.find(p => p.id === field.profile_id);
              const currentSlots = watchedMembers[index]?.slots || 0;
              const cost = unitCost * Number(currentSlots);

              return (
                <div key={field.id} className="flex items-center gap-3 p-2 rounded border bg-slate-50">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${person?.is_owner ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {person?.name?.substring(0, 2).toUpperCase() ?? '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{person?.name}</p>
                    <p className="text-xs text-slate-500">
                      ~ {Math.round(cost).toLocaleString()} đ
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Slots:</span>
                    <FormField
                      control={form.control}
                      name={`members.${index}.slots`}
                      render={({ field: slotField }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input
                              {...slotField}
                              type="number"
                              min="1"
                              className="w-16 h-8 text-center"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {fields.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No members added yet.</p>
            )}
          </div>

          {fields.length > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-sm font-medium text-slate-600">Total Slots:</span>
              <span className="text-sm font-bold text-slate-900">{totalSlots}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Form>
  )
}