import { signIn } from "@/auth";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white text-[#1a1815]" style={{ colorScheme: "light" }}>
      <nav className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-6 py-5">
        <Link href="/landing" className="flex items-center gap-2 text-[17px] font-bold tracking-tight">
          <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden>
            <rect x="4" y="16" width="24" height="9" rx="3" fill="#40342b" />
            <rect x="6.5" y="10" width="19" height="9" rx="3" fill="#2777c2" />
            <rect x="9" y="4" width="14" height="9" rx="3" fill="#7db3e0" />
          </svg>
          cram
        </Link>
      </nav>
      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm rounded-2xl border border-[#eeece8] p-8 shadow-[0_14px_40px_rgba(26,24,21,0.08)]">
          <h1 className="text-xl font-semibold tracking-tight">Sign in to Cram</h1>
          <p className="mt-1.5 text-sm text-[#8a857e]">
            Use your school email — we&apos;ll send you a login link.
          </p>
          <form
            action={async (formData) => {
              "use server";
              await signIn("resend", {
                email: formData.get("email") as string,
                redirectTo: "/",
              });
            }}
            className="mt-6 flex flex-col gap-3"
          >
            <input
              name="email"
              type="email"
              required
              placeholder="you@student.sbhs.nsw.edu.au"
              className="rounded-lg border border-[#e3e0da] bg-white px-3.5 py-2.5 text-[15px] outline-none placeholder:text-[#b6b1aa] focus:border-[#2777c2]"
            />
            <button
              type="submit"
              className="rounded-full bg-[#1a1815] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
            >
              Email me a login link
            </button>
          </form>
          <p className="mt-5 text-xs text-[#b6b1aa]">High students only · free</p>
        </div>
      </div>
    </main>
  );
}
