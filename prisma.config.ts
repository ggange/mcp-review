// Prisma 7+ configuration for migrations and CLI commands
// Note: This file is only used by Prisma 7+. Prisma 6 reads from schema.prisma directly.
// Runtime connections are handled via adapter in src/lib/db.ts (Prisma 7) or directly (Prisma 6)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations if you have connection pooling (e.g., Neon, Supabase)
    // Otherwise, DATABASE_URL will be used for both migrations and direct connections
    // Note: This file is only used by Prisma 7+. Prisma 6 reads from schema.prisma directly.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"] || "postgresql://localhost:5432/db",
  },
});
