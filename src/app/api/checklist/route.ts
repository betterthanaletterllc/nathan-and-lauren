export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, activityLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/checklist — guest submits travel checklist
export async function POST(req: NextRequest) {
  try {
    const {
      slug,
      passportConfirmed,
      flightsBooked,
      flightDetails,
      hotelBooked,
      hotelInRoomBlock,
      transportNeeded,
      arrivalDate,
      departureDate,
      emergencyContact,
      songRequest,
      messageToCouple,
    } = await req.json();

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const [household] = await db
      .select()
      .from(guests)
      .where(eq(guests.slug, slug))
      .limit(1);

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    await db
      .update(guests)
      .set({
        passportConfirmed: passportConfirmed ?? false,
        flightsBooked: flightsBooked ?? false,
        flightDetails: flightDetails || null,
        hotelBooked: hotelBooked ?? false,
        hotelInRoomBlock: hotelInRoomBlock ?? null,
        transportNeeded: transportNeeded ?? null,
        arrivalDate: arrivalDate || null,
        departureDate: departureDate || null,
        emergencyContact: emergencyContact || null,
        songRequest: songRequest || null,
        messageToCouple: messageToCouple || null,
        checklistSubmittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(guests.id, household.id));

    await db.insert(activityLog).values({
      guestId: household.id,
      action: "checklist_submitted",
      metadata: { passportConfirmed, flightsBooked, hotelBooked },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/checklist error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
