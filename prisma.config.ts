// Prisma 7+ configuration for migrations and CLI commands
// Runtime connections are handled via adapter in src/lib/db.ts
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
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
