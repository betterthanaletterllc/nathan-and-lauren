export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, activityLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/address — guest submits their mailing address
export async function POST(req: NextRequest) {
  const body = await req.json();
  const cap = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const slug = cap(body.slug, 120);
  const addressLine1 = cap(body.addressLine1, 200);
  const addressLine2 = cap(body.addressLine2, 200);
  const city = cap(body.city, 100);
  const state = cap(body.state, 60);
  const zip = cap(body.zip, 20);
  const country = cap(body.country, 60);

  if (!slug || !addressLine1 || !city || !state || !zip) {
    return NextResponse.json(
      { error: "slug, addressLine1, city, state, zip are required" },
      { status: 400 }
    );
  }

  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.slug, slug))
    .limit(1);

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  await db
    .update(guests)
    .set({
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      zip,
      country: country || "US",
      addressSubmittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(guests.id, guest.id));

  // Geocode before responding (serverless kills fire-and-forget work) — but cap
  // the wait so a slow Nominatim never blocks the guest's confirmation.
  try {
    const q = encodeURIComponent(`${addressLine1}, ${city}, ${state} ${zip}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
      headers: { "User-Agent": "NathanAndLaurenWedding/1.0" },
      signal: AbortSignal.timeout(3500),
    });
    const data = await res.json();
    if (data[0]) {
      await db
        .update(guests)
        .set({ latitude: data[0].lat, longitude: data[0].lon })
        .where(eq(guests.id, guest.id));
    }
  } catch {} // admin geocode backfill covers misses

  await db.insert(activityLog).values({
    guestId: guest.id,
    action: "address_submitted",
    metadata: { city, state },
  });

  return NextResponse.json({ success: true });
}
