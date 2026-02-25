'use client'

import * as React from 'react'
import {
    Command as CommandPrimitive,
    CommandEmpty as CommandPrimitiveEmpty,
    CommandGroup as CommandPrimitiveGroup,
    CommandInput as CommandPrimitiveInput,
    CommandItem as CommandPrimitiveItem,
    CommandList as CommandPrimitiveList,
    CommandSeparator as CommandPrimitiveSeparator,
} from 'cmdk'
import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

const Command = React.forwardRef<
    React.ElementRef<typeof CommandPrimitive>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
    <CommandPrimitive
        ref={ref}
        className={cn(
            'flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-slate-950',
            className
        )}
        {...props}
    />
))
Command.displayName = 'Command'

interface CommandDialogProps extends React.ComponentPropsWithoutRef<typeof Dialog> { }

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
    return (
        <Dialog {...props}>
            <DialogContent className="overflow-hidden p-0 shadow-lg">
                <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
                    {children}
                </Command>
            </DialogContent>
        </Dialog>
    )
}

const CommandInput = React.forwardRef<
    React.ElementRef<typeof CommandPrimitiveInput>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitiveInput>
>(({ className, ...props }, ref) => (
    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandPrimitiveInput
            ref={ref}
            className={cn(
                'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    </div>
))

CommandInput.displayName = 'CommandInput'

const CommandList = React.forwardRef<
    React.ElementRef<typeof CommandPrimitiveList>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitiveList>
>(({ className, ...props }, ref) => (
    <CommandPrimitiveList
        ref={ref}
        className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
        {...props}
    />
))

CommandList.displayName = 'CommandList'

const CommandEmpty = React.forwardRef<
    React.ElementRef<typeof CommandPrimitiveEmpty>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitiveEmpty>
>((props, ref) => (
    <CommandPrimitiveEmpty
        ref={ref}
        className="py-6 text-center text-sm"
        {...props}
    />
))

CommandEmpty.displayName = 'CommandEmpty'

const CommandGroup = React.forwardRef<
    React.ElementRef<typeof CommandPrimitiveGroup>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitiveGroup>
>(({ className, ...props }, ref) => (
    <CommandPrimitiveGroup
        ref={ref}
        className={cn(
            'overflow-hidden p-1 text-slate-950 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500',
            className
        )}
        {...props}
    />
))

CommandGroup.displayName = 'CommandGroup'

const CommandSeparator = React.forwardRef<
    React.ElementRef<typeof CommandPrimitiveSeparator>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitiveSeparator>
>(({ className, ...props }, ref) => (
    <CommandPrimitiveSeparator
        ref={ref}
        className={cn('-mx-1 h-px bg-slate-200', className)}
        {...props}
    />
))
CommandSeparator.displayName = 'CommandSeparator'

const CommandItem = React.forwardRef<
    React.ElementRef<typeof CommandPrimitiveItem>,
    React.ComponentPropsWithoutRef<typeof CommandPrimitiveItem>
>(({ className, ...props }, ref) => (
    <CommandPrimitiveItem
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-slate-100 aria-selected:text-slate-900',
            className
        )}
        {...props}
    />
))

CommandItem.displayName = 'CommandItem'

const CommandShortcut = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
    return (
        <span
            className={cn(
                'ml-auto text-xs tracking-widest text-slate-500',
                className
            )}
            {...props}
        />
    )
}
CommandShortcut.displayName = 'CommandShortcut'

export {
    Command,
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandShortcut,
    CommandSeparator,
}
