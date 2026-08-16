import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  isPasswordSet,
  safeEqual,
  sessionTokenFor,
} from "@/lib/auth";
import { VinylIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";

  const password = process.env.ARTITRACK_PASSWORD;
  const submitted = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  // Only ever redirect within this app, so a crafted link can't bounce
  // someone to another site after signing in.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!isPasswordSet(password)) redirect(destination);

  if (!safeEqual(submitted, password!)) {
    redirect(`/login?error=1&next=${encodeURIComponent(destination)}`);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await sessionTokenFor(password!), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  });

  redirect(destination);
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const failed = params?.error === "1";
  const next = typeof params?.next === "string" ? params.next : "/";

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 pt-16">
      <span className="rounded-full bg-gradient-to-br from-accent to-accent-2 p-[2px]">
        <span className="flex size-14 items-center justify-center rounded-full bg-bg">
          <VinylIcon className="size-9 text-white/85" />
        </span>
      </span>

      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">ArtiTrack</h1>
        <p className="mt-1.5 text-sm text-muted">Enter your password to continue.</p>
      </div>

      <form action={signIn} className="panel flex w-full flex-col gap-3 p-4">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          required
          placeholder="Password"
          className="field w-full px-3 py-2.5 text-sm"
        />
        {failed && (
          <p role="alert" className="text-xs text-red-400">
            That password didn&apos;t work.
          </p>
        )}
        <button type="submit" className="btn-primary px-4 py-2.5 text-sm">
          Unlock
        </button>
      </form>
    </div>
  );
}
