export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatMoneyVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

export function getAccountInitial(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatCompactMoney(amount: number) {
  const absAmount = Math.abs(amount);
  if (absAmount >= 1000000) {
    return (amount / 1000000).toFixed(1) + "M";
  }
  if (absAmount >= 1000) {
    return (amount / 1000).toFixed(0) + "k";
  }
  return amount.toString();
}

/**
 * Formats a number to a long Vietnamese currency string.
 * Example: 326333 => "3 Trăm 26 Ngàn 333"
 */
export function formatVNLongAmount(amount: number): string {
  const absAmount = Math.round(Math.abs(amount));
  if (absAmount === 0) return '0';

  const b = Math.floor(absAmount / 1_000_000_000);
  let remainder = absAmount % 1_000_000_000;

  const m = Math.floor(remainder / 1_000_000);
  remainder %= 1_000_000;

  const k = Math.floor(remainder / 1_000);
  const d = remainder % 1_000;

  const parts: string[] = [];

  const formatWithHundreds = (val: number, unit: string) => {
    if (val <= 0) return;
    if (val >= 100) {
      const h = Math.floor(val / 100);
      const rem = val % 100;
      if (rem > 0) {
        parts.push(`${h} Trăm ${rem} ${unit}`);
      } else {
        parts.push(`${h} Trăm ${unit}`);
      }
    } else {
      parts.push(`${val} ${unit}`);
    }
  };

  formatWithHundreds(b, 'Tỷ');
  formatWithHundreds(m, 'Triệu');
  formatWithHundreds(k, 'Ngàn');

  if (d > 0) {
    if (d >= 100) {
      const h = Math.floor(d / 100);
      const rem = d % 100;
      if (rem > 0) {
        parts.push(`${h} Trăm ${rem}`);
      } else {
        parts.push(`${h} Trăm`);
      }
    } else {
      parts.push(`${d}`);
    }
  }

  return parts.join(' ').trim();
}

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
