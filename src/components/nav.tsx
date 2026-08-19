import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Nav() {
  const session = await auth();
  return (
    <nav className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/" className="font-bold">
        Tutor
      </Link>
      {session?.user && (
        <div className="flex items-center gap-4 text-sm">
          <span>{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
