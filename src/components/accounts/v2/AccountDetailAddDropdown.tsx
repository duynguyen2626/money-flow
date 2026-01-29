'use client'

import { useRef, useState } from 'react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Users, DollarSign, Zap, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Account } from '@/types/moneyflow.types'

interface AddOption {
    type: string
    label: string
    icon: React.ReactNode
    color: string
    bgColor: string
    showForCreditCard?: boolean // If true, only show for credit cards
    hideForCreditCard?: boolean // If true, hide for credit cards
}

interface AccountDetailAddDropdownProps {
    onSelect: (type?: string) => void
    account: Account
}

export function AccountDetailAddDropdown({ onSelect, account }: AccountDetailAddDropdownProps) {
    const [open, setOpen] = useState(false)
    const closeTimeout = useRef<NodeJS.Timeout | null>(null)

    const isCreditCard = account.type === 'credit_card'

    // Define all options including Quick
    const ALL_OPTIONS: AddOption[] = [
        {
            type: 'quick',
            label: 'Quick',
            icon: <Zap className="w-4 h-4" />,
            color: 'text-indigo-700',
            bgColor: 'hover:bg-indigo-50',
        },
        {
            type: 'expense',
            label: 'Expense',
            icon: <ArrowDownLeft className="w-4 h-4" />,
            color: 'text-rose-700',
            bgColor: 'hover:bg-rose-50',
        },
        {
            type: 'income',
            label: 'Income',
            icon: <ArrowUpRight className="w-4 h-4" />,
            color: 'text-emerald-700',
            bgColor: 'hover:bg-emerald-50',
        },
        {
            type: 'transfer',
            label: 'Transfer',
            icon: <ArrowRightLeft className="w-4 h-4" />,
            color: 'text-blue-700',
            bgColor: 'hover:bg-blue-50',
            hideForCreditCard: true, // Hide for credit cards
        },
        {
            type: 'pay-card',
            label: 'Pay Card',
            icon: <CreditCard className="w-4 h-4" />,
            color: 'text-blue-700',
            bgColor: 'hover:bg-blue-50',
            showForCreditCard: true, // Only show for credit cards
        },
        {
            type: 'debt',
            label: 'Lend',
            icon: <Users className="w-4 h-4" />,
            color: 'text-purple-700',
            bgColor: 'hover:bg-purple-50',
        },
        {
            type: 'repayment',
            label: 'Repay',
            icon: <DollarSign className="w-4 h-4" />,
            color: 'text-amber-700',
            bgColor: 'hover:bg-amber-50',
        },
    ]

    // Filter options based on account type
    const availableOptions = ALL_OPTIONS.filter(opt => {
        if (opt.showForCreditCard && !isCreditCard) return false
        if (opt.hideForCreditCard && isCreditCard) return false
        return true
    })

    // Get recent types from localStorage
    const getRecentTypes = (): string[] => {
        try {
            const recent = localStorage.getItem(`mf_recent_add_types_${account.id}`)
            return recent ? JSON.parse(recent) : []
        } catch {
            return []
        }
    }

    const saveRecentType = (type: string) => {
        try {
            const recent = getRecentTypes()
            const filtered = recent.filter(t => t !== type)
            const newRecent = [type, ...filtered].slice(0, 3) // Keep last 3
            localStorage.setItem(`mf_recent_add_types_${account.id}`, JSON.stringify(newRecent))
        } catch (e) {
            console.error('Failed to save recent type', e)
        }
    }

    const handleSelect = (type: string) => {
        saveRecentType(type)
        onSelect(type)
        setOpen(false)
    }

    const handleMouseEnter = () => {
        if (closeTimeout.current) clearTimeout(closeTimeout.current)
        setOpen(true)
    }

    const handleMouseLeave = () => {
        closeTimeout.current = setTimeout(() => setOpen(false), 120)
    }

    const recentTypes = getRecentTypes()
    const recentOptions = recentTypes
        .map(t => availableOptions.find(opt => opt.type === t))
        .filter(Boolean) as AddOption[]

    const allOptions = availableOptions.filter(
        opt => !recentTypes.includes(opt.type)
    )

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="sm"
                    className="h-9 gap-2 bg-primary hover:bg-primary/90 shadow-sm md:w-auto w-9 px-0 md:px-4 relative z-10"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    title="Add transaction"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">Add</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[200px] p-1"
                align="end"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="space-y-0.5">
                    {/* Recent Section */}
                    {recentOptions.length > 0 && (
                        <>
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Recent
                            </div>
                            {recentOptions.map(option => (
                                <button
                                    key={option.type}
                                    onClick={() => handleSelect(option.type)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm transition-colors",
                                        option.bgColor,
                                        option.color
                                    )}
                                >
                                    {option.icon}
                                    <span>{option.label}</span>
                                </button>
                            ))}
                            <div className="h-px bg-border my-1" />
                        </>
                    )}

                    {/* All Options */}
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        New Transaction
                    </div>
                    {allOptions.map(option => (
                        <button
                            key={option.type}
                            onClick={() => handleSelect(option.type)}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm transition-colors",
                                option.bgColor,
                                option.color
                            )}
                        >
                            {option.icon}
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
