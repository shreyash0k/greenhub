import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GitHub],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && profile && user.id) {
        const login = (profile as { login?: string }).login
        if (login) {
          await prisma.user.update({
            where: { id: user.id },
            data: { githubUsername: login },
          })
        }
      }
    },
  },
})
