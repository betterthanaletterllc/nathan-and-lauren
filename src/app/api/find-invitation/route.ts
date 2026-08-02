export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, householdMembers, activityLog } from "@/lib/db/schema";

// Simple per-IP rate limit (per serverless instance — a deterrent, not a vault;
// the data behind it is a wedding guest page, not a bank)
const attempts = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function rateLimited(ip: string): boolean {
  const nowMs = Date.now();
  const entry = attempts.get(ip);
  if (!entry || nowMs - entry.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: nowMs });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

function digitsOf(s: string): string {
  return (s || "").replace(/\D/g, "");
}

// POST /api/find-invitation — { query } -> { slug } | 404
export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    if (rateLimited(ip)) {
      return NextResponse.json({ error: "Too many tries — give it a minute" }, { status: 429 });
    }

    const { query } = await req.json();
    const q = (query || "").trim();
    if (!q) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const members = await db
      .select({
        householdId: householdMembers.householdId,
        firstName: householdMembers.firstName,
        lastName: householdMembers.lastName,
        phone: householdMembers.phone,
      })
      .from(householdMembers);

    const matchedHouseholds = new Set<number>();
    let via: "phone" | "name" | null = null;

    const qDigits = digitsOf(q);
    if (qDigits.length >= 7) {
      // Phone lookup — compare last 10 digits
      const qTail = qDigits.slice(-10);
      for (const m of members) {
        const pDigits = digitsOf(m.phone || "");
        if (pDigits && pDigits.slice(-10) === qTail) {
          matchedHouseholds.add(m.householdId);
          via = "phone";
        }
      }
    } else {
      // Name lookup — first + last, case-insensitive
      const tokens = q.toLowerCase().split(/\s+/);
      if (tokens.length >= 2) {
        const first = tokens[0];
        const last = tokens.slice(1).join(" ");
        for (const m of members) {
          if (
            m.firstName.trim().toLowerCase() === first &&
            m.lastName.trim().toLowerCase() === last
          ) {
            matchedHouseholds.add(m.householdId);
            via = "name";
          }
        }
      }
    }

    // Exactly one household or nothing — never disambiguate (no guest-list enumeration)
    if (matchedHouseholds.size !== 1) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const householdId = [...matchedHouseholds][0];
    const allHouseholds = await db
      .select({ id: guests.id, slug: guests.slug })
      .from(guests);
    const household = allHouseholds.find((g) => g.id === householdId);
    if (!household) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await db.insert(activityLog).values({
      guestId: householdId,
      action: "invitation_lookup",
      metadata: { via },
    });

    return NextResponse.json({ slug: household.slug });
  } catch (err: any) {
    console.error("POST /api/find-invitation error:", err);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
