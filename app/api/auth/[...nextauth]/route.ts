import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

// For Phase 1, we'll use a simple credentials-based auth
// In production, you'd integrate with CDP's embedded wallet/OAuth
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'CDP Wallet',
      credentials: {
        cdpWalletId: { label: 'CDP Wallet ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.cdpWalletId) {
          return null
        }

        // Find or create user with this CDP wallet ID
        let user = await db.user.findUnique({
          where: { cdpWalletId: credentials.cdpWalletId },
        })

        if (!user) {
          // Create new user on first login
          user = await db.user.create({
            data: {
              cdpWalletId: credentials.cdpWalletId,
            },
          })
        }

        return {
          id: user.id,
          cdpWalletId: user.cdpWalletId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.cdpWalletId = user.cdpWalletId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.cdpWalletId = token.cdpWalletId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

