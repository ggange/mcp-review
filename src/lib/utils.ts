import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a consistent color gradient based on the server name
 * @param name - Server name to generate color for
 * @returns Tailwind gradient classes
 */
export function getAvatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-pink-500',
    'from-indigo-500 to-blue-500',
    'from-fuchsia-500 to-pink-500',
    'from-cyan-500 to-blue-500',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

/**
 * Normalize an email address for consistent comparison
 * - Converts to lowercase
 * - Trims whitespace
 * - Returns null for null/undefined/empty strings
 * @param email - Email address to normalize
 * @returns Normalized email or null
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null
  }
  return email.trim().toLowerCase() || null
}

/**
 * Format a GitHub star count compactly: 999 → "999", 1234 → "1.2k", 1200000 → "1.2M"
 */
export function formatStars(count: number): string {
  if (count < 1000) return String(count)
  const [value, suffix] = count < 1_000_000 ? [count / 1000, 'k'] : [count / 1_000_000, 'M']
  const rounded = value >= 100 ? Math.round(value).toString() : (Math.floor(value * 10) / 10).toString()
  return `${rounded}${suffix}`
}
