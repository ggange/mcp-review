import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { withExplicitSslMode } from '@/lib/db-url'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7: the runtime connection goes through the pg driver adapter.
// prisma.config.ts holds the URL the CLI (db push, studio) uses.
function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Please add it to your .env file.\n' +
        'Example: DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"'
    )
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: withExplicitSslMode(url) }) })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

