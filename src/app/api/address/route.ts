export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, activityLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/address — guest submits their mailing address
export async function POST(req: NextRequest) {
  const { slug, addressLine1, addressLine2, city, state, zip, country } =
    await req.json();

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

  await db.insert(activityLog).values({
    guestId: guest.id,
    action: "address_submitted",
    metadata: { city, state },
  });

  return NextResponse.json({ success: true });
}
