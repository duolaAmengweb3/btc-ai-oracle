import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatProbability(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function getDirectionColor(direction: string): string {
  switch (direction) {
    case 'up':
      return 'text-green-500';
    case 'down':
      return 'text-red-500';
    default:
      return 'text-yellow-500';
  }
}

export function getHealthColor(grade: string): string {
  switch (grade) {
    case 'normal':
      return 'text-green-500';
    case 'degraded':
      return 'text-yellow-500';
    default:
      return 'text-red-500';
  }
}

export function getHealthIcon(grade: string): string {
  switch (grade) {
    case 'normal':
      return '✅';
    case 'degraded':
      return '⚠️';
    default:
      return '⛔';
  }
}
