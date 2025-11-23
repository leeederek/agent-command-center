import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      cdpWalletId: string
    }
  }

  interface User {
    id: string
    cdpWalletId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    cdpWalletId: string
  }
}

