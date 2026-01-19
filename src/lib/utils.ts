import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount).replace('₫', '').trim()
}

export function getAccountInitial(name: string) {
  const firstLetter = name?.trim().charAt(0)
  return firstLetter ? firstLetter.toUpperCase() : '?'
}

export function formatMoneyVND(amount: number) {
  if (amount === 0) return '-';
  // Format: 1.000 (no currency symbol)
  return new Intl.NumberFormat('vi-VN').format(amount);
}
