import { prisma } from './db'
import type { Session } from 'next-auth'

/**
 * Check if a user has admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  
  return user?.role === 'admin'
}

/**
 * Require admin access - throws if user is not admin
 */
export async function requireAdmin(session: Session | null): Promise<void> {
  if (!session?.user?.id) {
    throw new Error('Unauthorized: You must be signed in')
  }
  
  const admin = await isAdmin(session.user.id)
  if (!admin) {
    throw new Error('Forbidden: Admin access required')
  }
}
