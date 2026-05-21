export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { guests } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

// POST /api/geocode — batch geocode all guests missing lat/lng
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const needsGeocode = await db
      .select()
      .from(guests)
      .where(and(isNotNull(guests.city), isNotNull(guests.state), isNull(guests.latitude)));

    let geocoded = 0;
    for (const guest of needsGeocode) {
      try {
        await new Promise((r) => setTimeout(r, 1100)); // Nominatim rate limit
        const q = encodeURIComponent(`${guest.addressLine1}, ${guest.city}, ${guest.state} ${guest.zip}`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
          { headers: { "User-Agent": "NathanAndLaurenWedding/1.0" } }
        );
        const data = await res.json();
        if (data[0]) {
          await db
            .update(guests)
            .set({ latitude: data[0].lat, longitude: data[0].lon })
            .where(eq(guests.id, guest.id));
          geocoded++;
        }
      } catch {}
    }

    return NextResponse.json({ success: true, total: needsGeocode.length, geocoded });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
