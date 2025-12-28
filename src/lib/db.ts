import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In Prisma 7, PrismaClient requires an adapter for direct connections
function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Please add it to your .env file.\n' +
        'Example: DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"'
    )
  }

  const pool = new Pool({ connectionString: url })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

