import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './db'
import { normalizeEmail } from './utils'

// Build providers array conditionally - only include if env vars are set
const providers = []

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      // Enable automatic account linking for verified emails
      // GitHub verifies emails, so we can safely link accounts with the same email
      allowDangerousEmailAccountLinking: true,
    })
  )
}

// Google authentication disabled for now - focusing on GitHub only
// if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
//   providers.push(
//     Google({
//       clientId: process.env.GOOGLE_ID,
//       clientSecret: process.env.GOOGLE_SECRET,
//       // Enable automatic account linking for verified emails
//       // Google verifies emails, so we can safely link accounts with the same email
//       allowDangerousEmailAccountLinking: true,
//     })
//   )
// }

// Ensure NEXTAUTH_URL is set for NextAuth v5
// Vercel provides VERCEL_URL without protocol, so we construct the full URL
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: providers.length > 0 ? PrismaAdapter(prisma) : undefined,
  providers,
  trustHost: true, // Trust the host header (needed for Vercel)
  callbacks: {
    async signIn({ user, account }) {
      // Only process OAuth providers (skip email/password if added later)
      if (!account || !user.email) {
        return true // Allow default behavior for non-OAuth or missing email
      }

      const normalizedEmail = normalizeEmail(user.email)
      if (!normalizedEmail) {
        return true // Allow default behavior if email cannot be normalized
      }

      try {
        // Explicit account linking: Check if a user with this email already exists
        // and link the new provider account to the existing user
        // First try exact match (normalized email)
        let existingUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { accounts: true },
        })

        // If not found, try case-insensitive search for existing users
        // (handles edge case where email was stored with different casing)
        if (!existingUser) {
          const users = await prisma.user.findMany({
            where: {
              email: {
                not: null,
              },
            },
            include: { accounts: true },
          })
          existingUser =
            users.find(
              (u) => u.email && normalizeEmail(u.email) === normalizedEmail
            ) || null
        }

        if (existingUser) {
          // Check if account for this provider already exists
          const existingAccount = existingUser.accounts.find(
            (acc) => acc.provider === account.provider
          )

          if (existingAccount) {
            // Account already linked, allow sign-in
            return true
          }

          // Link the new provider account to the existing user
          // We do this explicitly to ensure email normalization is handled correctly
          // The PrismaAdapter's allowDangerousEmailAccountLinking serves as a fallback
          try {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state:
                  typeof account.session_state === 'string'
                    ? account.session_state
                    : account.session_state != null
                      ? String(account.session_state)
                      : null,
              },
            })
            // Account successfully linked, allow sign-in
            // The adapter will see the account exists and use the existing user
            return true
          } catch (error: unknown) {
            // Handle unique constraint violation (account already exists)
            // This can happen in race conditions or if the adapter already created it
            if (
              error &&
              typeof error === 'object' &&
              'code' in error &&
              error.code === 'P2002'
            ) {
              // Account already exists for this provider, allow sign-in
              return true
            }
            // Re-throw other errors
            throw error
          }
        }

        // No existing user found, allow default NextAuth behavior (creates new user)
        // Ensure the new user's email is normalized for consistency
        // The adapter will create the user, but we normalize the email here
        // to ensure future account linking works correctly
        if (user.email !== normalizedEmail) {
          user.email = normalizedEmail
        }

        return true
      } catch (error) {
        // Log error but allow sign-in to proceed with default behavior
        // This prevents authentication failures due to account linking issues
        // The allowDangerousEmailAccountLinking option will serve as a fallback
        console.error('Error during account linking:', error)
        return true
      }
    },
    session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
})

