export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, householdMembers, activityLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/checklist — guest submits travel checklist
export async function POST(req: NextRequest) {
  try {
    const {
      slug,
      hotelInRoomBlock,
      transportNeeded,
      arrivalDate,
      departureDate,
      emergencyContact,
      songRequest,
      messageToCouple,
      memberChecklist,
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

    // Update household-level fields
    await db
      .update(guests)
      .set({
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

    // Update per-member checklist
    if (memberChecklist && Array.isArray(memberChecklist)) {
      for (const mc of memberChecklist) {
        if (mc.id) {
          await db
            .update(householdMembers)
            .set({
              passportConfirmed: mc.passportConfirmed ?? false,
              flightsBooked: mc.flightsBooked ?? false,
              departureDate: mc.departureDate || null,
              departureFlight: mc.departureFlight || null,
              returnDate: mc.returnDate || null,
              returnFlight: mc.returnFlight || null,
              hotelBooked: mc.hotelBooked ?? false,
            })
            .where(eq(householdMembers.id, mc.id));
        }
      }
    }

    await db.insert(activityLog).values({
      guestId: household.id,
      action: "checklist_submitted",
      metadata: { memberChecklist: memberChecklist?.length || 0 },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/checklist error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
