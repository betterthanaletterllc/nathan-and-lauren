"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-sand flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] border border-gold-pale/60 p-12 text-center max-w-sm w-full">
        <p className="font-body font-normal text-[10px] tracking-[6px] uppercase text-gold mb-6">
          Dashboard
        </p>
        <h1 className="font-display font-light text-3xl text-ink mb-2">
          Nathan & Lauren
        </h1>
        <p className="font-body font-light text-xs text-ink-faint mb-8">
          Sign in to manage your guest list
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full py-3.5 bg-gold text-white font-body font-normal text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
