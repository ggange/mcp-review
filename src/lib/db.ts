import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 6: PrismaClient reads connection string from DATABASE_URL env var (defined in schema.prisma)
function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Please add it to your .env file.\n' +
        'Example: DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"'
    )
  }

  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

