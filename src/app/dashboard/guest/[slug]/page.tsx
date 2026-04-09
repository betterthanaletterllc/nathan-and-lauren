"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

interface Guest {
  id: number;
  slug: string;
  name: string;
  partySize: number;
  note: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  firstOpenedAt: string | null;
  openCount: number;
  addressSubmittedAt: string | null;
  calendarSavedAt: string | null;
  createdAt: string;
}

export default function GuestDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [guest, setGuest] = useState<Guest | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!session) return;
    fetch("/api/guests")
      .then((r) => r.json())
      .then((all: Guest[]) => {
        const found = all.find((g) => g.slug === params.slug);
        setGuest(found || null);
      });
  }, [session, params.slug]);

  if (!session) return null;
  if (!guest) {
    return (
      <div className="min-h-dvh bg-sand flex items-center justify-center">
        <p className="font-body text-ink-faint text-sm">Loading...</p>
      </div>
    );
  }

  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";

  const guestLink = `${baseUrl}/guest/${guest.slug}`;

  const rows: [string, string][] = [
    ["Name", guest.name],
    ["Slug", `/${guest.slug}`],
    ["Party size", String(guest.partySize)],
    ["Personal note", guest.note || "(uses global default)"],
    ["Link opened", guest.firstOpenedAt ? `Yes — ${fmtDate(guest.firstOpenedAt)} (${guest.openCount}×)` : "No"],
    ["Address submitted", guest.addressSubmittedAt ? fmtDate(guest.addressSubmittedAt) : "No"],
    ["Calendar saved", guest.calendarSavedAt ? fmtDate(guest.calendarSavedAt) : "No"],
    [
      "Mailing address",
      guest.addressLine1
        ? [guest.addressLine1, guest.addressLine2, `${guest.city}, ${guest.state} ${guest.zip}`, guest.country]
            .filter(Boolean)
            .join("\n")
        : "—",
    ],
    ["Guest link", guestLink],
    ["Added", fmtDate(guest.createdAt)],
  ];

  return (
    <div className="min-h-dvh bg-sand">
      <header className="bg-[#FFFDF9] border-b border-gold-pale/40 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="font-body text-[11px] tracking-[2px] uppercase text-gold hover:underline"
        >
          ← Back
        </button>
        <h1 className="font-display font-light text-xl text-ink">
          {guest.name}
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-[#FFFDF9] border border-gold-pale/40 p-6">
          {rows.map(([label, val]) => (
            <div
              key={label}
              className="flex py-3 border-b border-sand-dark last:border-0"
            >
              <span className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint w-40 pt-0.5 shrink-0">
                {label}
              </span>
              <span className="font-body text-sm text-ink whitespace-pre-line">
                {label === "Guest link" ? (
                  <a
                    href={val}
                    target="_blank"
                    rel="noopener"
                    className="text-gold hover:underline break-all"
                  >
                    {val}
                  </a>
                ) : (
                  val
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Landing page preview */}
        <div className="mt-8">
          <p className="font-body text-[10px] tracking-[3px] uppercase text-ink-faint mb-3">
            Landing page preview
          </p>
          <div className="border border-gold-pale/40 rounded overflow-hidden">
            <iframe
              src={`/guest/${guest.slug}`}
              className="w-full h-[700px] pointer-events-none"
              title="Guest page preview"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
