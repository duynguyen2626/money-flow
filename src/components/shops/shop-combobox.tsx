'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { getShopsAction } from '@/actions/shop-actions'

type Shop = {
    id: string
    name: string
    image_url: string | null
}

interface ShopComboboxProps {
    value?: string
    onChange: (value: string) => void
}

export function ShopCombobox({ value, onChange }: ShopComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [shops, setShops] = React.useState<Shop[]>([])
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        const fetchShops = async () => {
            setLoading(true)
            try {
                const data = await getShopsAction()
                setShops(data)
            } catch (error) {
                console.error('Failed to fetch shops:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchShops()
    }, [])

    const selectedShop = shops.find((shop) => shop.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedShop ? (
                        <div className="flex items-center gap-2">
                            {selectedShop.image_url && (
                                <img
                                    src={selectedShop.image_url}
                                    alt={selectedShop.name}
                                    className="h-4 w-4 rounded-full object-cover"
                                />
                            )}
                            {selectedShop.name}
                        </div>
                    ) : (
                        "Select shop..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="p-0"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Search shop..." />
                    <CommandList>
                        <CommandEmpty>No shop found.</CommandEmpty>
                        <CommandGroup>
                            {shops.map((shop) => (
                                <CommandItem
                                    key={shop.id}
                                    value={`${shop.name} ${shop.id}`}
                                    onSelect={() => {
                                        onChange(shop.id === value ? "" : shop.id)
                                        setOpen(false)
                                        toast.success(`Selected ${shop.name}`)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === shop.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex items-center gap-2">
                                        {shop.image_url && (
                                            <img
                                                src={shop.image_url}
                                                alt={shop.name}
                                                className="h-4 w-4 rounded-full object-cover"
                                            />
                                        )}
                                        {shop.name}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
