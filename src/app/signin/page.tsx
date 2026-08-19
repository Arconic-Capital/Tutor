import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">cram — Sydney High</h1>
      <p className="text-sm text-gray-600">
        Sign in with your school email. We&apos;ll send you a login link.
      </p>
      <form
        action={async (formData) => {
          "use server";
          await signIn("resend", {
            email: formData.get("email") as string,
            redirectTo: "/",
          });
        }}
        className="flex flex-col gap-3"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="you@student.sbhs.nsw.edu.au"
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Send login link
        </button>
      </form>
    </main>
  );
}
