export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, householdMembers, activityLog, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const KIDS_INTEREST_TAG = "kids interest";

function parseLocalDeadline(dateStr: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return null;
  // End of that day, local server time
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
}

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row?.value || "";
}

// POST /api/rsvp — guest submits RSVP for their household
// Body: { slug, members: [{ id?, firstName, lastName, rsvpStatus, foodChoice, foodAllergies, isPlusOne, isChild }], kidsInterest? }
export async function POST(req: NextRequest) {
  try {
    const { slug, members: rsvpMembers, kidsInterest } = await req.json();

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

    // Every attending guest needs a dinner selection
    for (const m of rsvpMembers) {
      if (m.rsvpStatus === "coming" && !m.foodChoice) {
        return NextResponse.json(
          { error: `${m.firstName || "Each attending guest"} needs a dinner selection` },
          { status: 400 }
        );
      }
    }

    // Update existing members / insert new plus-ones and children
    for (const m of rsvpMembers) {
      if (m.id) {
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
      } else if ((m.isPlusOne || m.isChild) && m.firstName) {
        await db.insert(householdMembers).values({
          householdId: household.id,
          firstName: m.firstName,
          lastName: m.lastName || "",
          phone: m.phone || null,
          email: m.email || null,
          isPlusOne: !!m.isPlusOne,
          isChild: !!m.isChild,
          rsvpStatus: m.rsvpStatus || "coming",
          foodChoice: m.foodChoice || null,
          foodAllergies: m.foodAllergies || null,
        });
      }
    }

    // Kids-interest flag lives on household tags (visible & filterable in the dashboard)
    const currentTags: string[] = Array.isArray(household.tags) ? household.tags : [];
    let newTags = currentTags;
    if (kidsInterest && !currentTags.includes(KIDS_INTEREST_TAG)) {
      newTags = [...currentTags, KIDS_INTEREST_TAG];
    } else if (kidsInterest === false && currentTags.includes(KIDS_INTEREST_TAG)) {
      newTags = currentTags.filter((t) => t !== KIDS_INTEREST_TAG);
    }

    // Update household RSVP timestamp, party size, tags
    const updatedMembers = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, household.id))
      .orderBy(householdMembers.id);

    await db
      .update(guests)
      .set({
        rsvpSubmittedAt: new Date(),
        partySize: updatedMembers.length,
        tags: newTags,
        updatedAt: new Date(),
      })
      .where(eq(guests.id, household.id));

    await db.insert(activityLog).values({
      guestId: household.id,
      action: "rsvp_submitted",
      metadata: {
        coming: updatedMembers.filter((m) => m.rsvpStatus === "coming").length,
        notComing: updatedMembers.filter((m) => m.rsvpStatus === "not_coming").length,
        kidsInterest: !!kidsInterest,
      },
    });

    // Return the fresh member list (with real ids) so the page can flow
    // straight into the travel checklist without a reload
    return NextResponse.json({ success: true, members: updatedMembers });
  } catch (err: any) {
    console.error("POST /api/rsvp error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/rsvp — guest changes a dinner selection (open until meal_change_deadline)
// Body: { slug, memberId, foodChoice, foodAllergies? }
export async function PATCH(req: NextRequest) {
  try {
    const { slug, memberId, foodChoice, foodAllergies } = await req.json();

    if (!slug || !memberId || !foodChoice) {
      return NextResponse.json({ error: "slug, memberId and foodChoice required" }, { status: 400 });
    }

    const deadline = parseLocalDeadline(await getSetting("meal_change_deadline"));
    if (deadline && Date.now() > deadline.getTime()) {
      return NextResponse.json(
        { error: "Meal changes are closed — text Nathan & Lauren for anything urgent" },
        { status: 403 }
      );
    }

    const [household] = await db
      .select()
      .from(guests)
      .where(eq(guests.slug, slug))
      .limit(1);

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    const [member] = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.id, memberId))
      .limit(1);

    if (!member || member.householdId !== household.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const previous = member.foodChoice;
    await db
      .update(householdMembers)
      .set({
        foodChoice,
        ...(foodAllergies !== undefined ? { foodAllergies: foodAllergies || null } : {}),
      })
      .where(eq(householdMembers.id, memberId));

    await db.insert(activityLog).values({
      guestId: household.id,
      action: "meal_changed",
      metadata: { memberId, name: `${member.firstName} ${member.lastName}`.trim(), from: previous, to: foodChoice },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/rsvp error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
