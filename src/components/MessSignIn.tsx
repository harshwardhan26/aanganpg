"use client";

import { signIn } from "next-auth/react";

/**
 * Sign-in for mess.aanganpg.com.
 *
 * The room site opens a sheet on its homepage; that homepage does not exist on
 * this host, so this goes straight to Google. The two sites sign in separately
 * on purpose — the session cookie has no domain set, so it belongs to this host
 * alone and a hostel login is not a mess login.
 */
export function MessSignIn() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="mt-5 inline-flex min-h-14 items-center rounded-xl bg-primary-strong px-6 text-lg font-semibold text-white transition-colors hover:bg-primary-hover"
    >
      Sign in with Google
    </button>
  );
}
