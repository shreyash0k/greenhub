import { auth, signOut } from "@/lib/auth"
import Link from "next/link"
import Image from "next/image"

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              <span className="text-green-600">Green</span>Hub
            </Link>
            {session && (
              <div className="ml-8 flex space-x-1">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Settings
                </Link>
              </div>
            )}
          </div>
          {session?.user && (
            <div className="flex items-center gap-3">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-gray-700 hidden sm:block">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <button className="text-sm text-gray-500 hover:text-gray-700 ml-2 transition-colors">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
