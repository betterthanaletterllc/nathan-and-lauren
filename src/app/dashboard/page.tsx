"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-dvh bg-sand flex items-center justify-center">
        <p className="font-body text-ink-faint text-sm tracking-widest uppercase">
          Loading...
        </p>
      </div>
    );
  }

  if (!session) {
    redirect("/dashboard/login");
  }

  return <DashboardClient />;
}
