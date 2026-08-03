export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, householdMembers, activityLog, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const KIDS_INTEREST_TAG = "kids interest";

// Deadlines are evaluated in the venue's timezone (Cancún, UTC-5, no DST) so
// server (UTC) and guests (any US timezone) agree on when a day ends.
function parseLocalDeadline(dateStr: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T23:59:59-05:00`);
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

    // RSVP deadline enforced server-side too (client shows the countdown)
    const rsvpDeadline = parseLocalDeadline(await getSetting("rsvp_deadline"));
    if (rsvpDeadline && Date.now() > rsvpDeadline.getTime()) {
      return NextResponse.json(
        { error: "The RSVP window has closed — text Nathan & Lauren and they'll take care of you" },
        { status: 403 }
      );
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

    // Scope every write to THIS household — client-sent ids are untrusted
    const existingMembers = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, household.id));
    const ownIds = new Set(existingMembers.map((m) => m.id));
    let plusOneCount = existingMembers.filter((m) => m.isPlusOne).length;
    let totalCount = existingMembers.length;

    // Update existing members / insert new plus-ones and children
    for (const m of rsvpMembers) {
      if (m.id && !ownIds.has(m.id)) continue; // not this household's member — ignore
      if (!m.id) {
        // Inserts are capped: plus-ones need the allowance (max 1), household ≤ 12 people
        if (m.isPlusOne && (!household.plusOneAllowed || plusOneCount >= 1)) continue;
        if (!m.isPlusOne && !m.isChild) continue; // only plus-ones/kids may be added via RSVP
        if (totalCount >= 12) continue;
      }
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
          firstName: String(m.firstName).slice(0, 100),
          lastName: String(m.lastName || "").slice(0, 100),
          phone: m.phone ? String(m.phone).slice(0, 30) : null,
          email: m.email ? String(m.email).slice(0, 200) : null,
          isPlusOne: !!m.isPlusOne,
          isChild: !!m.isChild,
          rsvpStatus: m.rsvpStatus || "coming",
          foodChoice: m.foodChoice || null,
          foodAllergies: m.foodAllergies || null,
        });
        totalCount++;
        if (m.isPlusOne) plusOneCount++;
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
    const { slug, memberId, foodChoice, foodAllergies, action, firstName, lastName, plusOne } = await req.json();

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const deadline = parseLocalDeadline(await getSetting("meal_change_deadline"));
    if (deadline && Date.now() > deadline.getTime()) {
      return NextResponse.json(
        { error: "Changes are closed — text Nathan & Lauren for anything urgent" },
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

    // Add a plus-one after the fact (allowed households only, one max)
    if (action === "add_plus_one") {
      if (!household.plusOneAllowed) {
        return NextResponse.json({ error: "Plus ones aren't enabled for this invitation" }, { status: 403 });
      }
      if (!plusOne?.firstName || !plusOne?.foodChoice) {
        return NextResponse.json({ error: "Name and dinner selection required" }, { status: 400 });
      }
      const existing = await db
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.householdId, household.id));
      if (existing.some((m) => m.isPlusOne)) {
        return NextResponse.json({ error: "A plus one is already on this RSVP" }, { status: 409 });
      }
      const [inserted] = await db
        .insert(householdMembers)
        .values({
          householdId: household.id,
          firstName: plusOne.firstName,
          lastName: plusOne.lastName || "",
          isPlusOne: true,
          rsvpStatus: "coming",
          foodChoice: plusOne.foodChoice,
          foodAllergies: plusOne.foodAllergies || null,
        })
        .returning();
      await db
        .update(guests)
        .set({ partySize: existing.length + 1, updatedAt: new Date() })
        .where(eq(guests.id, household.id));
      await db.insert(activityLog).values({
        guestId: household.id,
        action: "plus_one_added",
        metadata: { name: `${inserted.firstName} ${inserted.lastName}`.trim(), foodChoice: inserted.foodChoice },
      });
      return NextResponse.json({ success: true, member: inserted });
    }

    // Edit a plus-one's name (plus-one rows only — real members are the couple's data)
    if (action === "update_plus_one") {
      if (!memberId || !firstName) {
        return NextResponse.json({ error: "memberId and firstName required" }, { status: 400 });
      }
      const [target] = await db
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.id, memberId))
        .limit(1);
      if (!target || target.householdId !== household.id || !target.isPlusOne) {
        return NextResponse.json({ error: "Plus one not found" }, { status: 404 });
      }
      const prevName = `${target.firstName} ${target.lastName}`.trim();
      await db
        .update(householdMembers)
        .set({ firstName, lastName: lastName || "" })
        .where(eq(householdMembers.id, memberId));
      await db.insert(activityLog).values({
        guestId: household.id,
        action: "plus_one_updated",
        metadata: { memberId, from: prevName, to: `${firstName} ${lastName || ""}`.trim() },
      });
      return NextResponse.json({ success: true });
    }

    if (!memberId || !foodChoice) {
      return NextResponse.json({ error: "memberId and foodChoice required" }, { status: 400 });
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
