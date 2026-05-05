export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, householdMembers, activityLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/rsvp — guest submits RSVP for their household
// Body: { slug, members: [{ id?, firstName, lastName, rsvpStatus, foodChoice, foodAllergies, isPlusOne }] }
export async function POST(req: NextRequest) {
  try {
    const { slug, members: rsvpMembers } = await req.json();

    if (!slug || !rsvpMembers) {
      return NextResponse.json({ error: "slug and members required" }, { status: 400 });
    }

    const [household] = await db
      .select()
      .from(guests)
      .where(eq(guests.slug, slug))
      .limit(1);

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    // Update existing members' RSVP status
    for (const m of rsvpMembers) {
      if (m.id) {
        // Existing member — update RSVP fields
        await db
          .update(householdMembers)
          .set({
            rsvpStatus: m.rsvpStatus || null,
            foodChoice: m.rsvpStatus === "coming" ? (m.foodChoice || null) : null,
            foodAllergies: m.rsvpStatus === "coming" ? (m.foodAllergies || null) : null,
            attendingWelcome: m.attendingWelcome ?? null,
            attendingCeremony: m.attendingCeremony ?? null,
            attendingReception: m.attendingReception ?? null,
            attendingBrunch: m.attendingBrunch ?? null,
          })
          .where(eq(householdMembers.id, m.id));
      } else if (m.isPlusOne && m.firstName) {
        // New plus-one — insert
        await db.insert(householdMembers).values({
          householdId: household.id,
          firstName: m.firstName,
          lastName: m.lastName || "",
          phone: m.phone || null,
          email: m.email || null,
          isPlusOne: true,
          rsvpStatus: m.rsvpStatus || "coming",
          foodChoice: m.foodChoice || null,
          foodAllergies: m.foodAllergies || null,
        });
      }
    }

    // Update household RSVP timestamp and party size
    const updatedMembers = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, household.id));

    await db
      .update(guests)
      .set({
        rsvpSubmittedAt: new Date(),
        partySize: updatedMembers.length,
        updatedAt: new Date(),
      })
      .where(eq(guests.id, household.id));

    await db.insert(activityLog).values({
      guestId: household.id,
      action: "rsvp_submitted",
      metadata: {
        coming: updatedMembers.filter((m) => m.rsvpStatus === "coming").length,
        notComing: updatedMembers.filter((m) => m.rsvpStatus === "not_coming").length,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/rsvp error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
