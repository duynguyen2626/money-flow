'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronRight, History, MinusCircle, Pencil, PlusCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ManageSheetButton } from '@/components/people/manage-sheet-button'
import type { PeopleDirectoryItem } from '@/components/people/people-directory-data'
import { isYYYYMM } from '@/lib/month-tag'
import type { Account, Category, Person, Shop, Subscription } from '@/types/moneyflow.types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PersonCard } from '@/components/people/person-card'

type PeopleDirectoryDesktopProps = {
  items: PeopleDirectoryItem[]
  subscriptions: Subscription[]
  people: Person[]
  accounts: Account[]
  categories: Category[]
  shops: Shop[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function PeopleDirectoryDesktop({
  items,
  subscriptions,
  people,
  accounts,
  categories,
  shops,
  selectedId,
  onSelect,
}: PeopleDirectoryDesktopProps) {
  return (
    <>
      <div className="hidden md:grid auto-rows-fr gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {items.map((item) => (
          <div key={item.id} onClick={() => onSelect?.(item.id)}>
            <PersonCard
              person={item.person}
              subscriptions={subscriptions}
              isSelected={selectedId === item.id}
              onSelect={() => onSelect?.(item.id)}
              accounts={accounts}
              categories={categories}
              shops={shops}
            />
          </div>
        ))}
      </div>
    </>
  )
}
