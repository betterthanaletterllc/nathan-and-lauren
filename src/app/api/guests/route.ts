export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { guests, householdMembers, activityLog } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { slugify } from "@/lib/utils";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

// GET /api/guests — list all households with their members
export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allGuests = await db
      .select()
      .from(guests)
      .orderBy(desc(guests.createdAt));

    const allMembers = await db
      .select()
      .from(householdMembers)
      .orderBy(householdMembers.id);

    // Group members by household
    const membersByHousehold: Record<number, any[]> = {};
    for (const m of allMembers) {
      if (!membersByHousehold[m.householdId]) membersByHousehold[m.householdId] = [];
      membersByHousehold[m.householdId].push(m);
    }

    const result = allGuests.map((g) => ({
      ...g,
      members: membersByHousehold[g.id] || [],
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/guests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/guests — create a household with members
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, note, slug: customSlug, side, members = [] } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = customSlug || slugify(name);
    const partySize = members.length || 1;

    const [household] = await db
      .insert(guests)
      .values({ name, slug, partySize, note, side })
      .returning();

    // Insert members
    if (members.length > 0) {
      await db.insert(householdMembers).values(
        members.map((m: any) => ({
          householdId: household.id,
          firstName: m.firstName || "",
          lastName: m.lastName || "",
          phone: m.phone || null,
          email: m.email || null,
          dietaryRestrictions: m.dietaryRestrictions || null,
          isChild: m.isChild || false,
          isPlusOne: m.isPlusOne || false,
        }))
      );
    }

    await db.insert(activityLog).values({
      guestId: household.id,
      action: "guest_added",
      metadata: { name, slug, memberCount: partySize },
    });

    return NextResponse.json(household, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/guests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/guests — update a household (pass id in body)
export async function PUT(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, members, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    updates.updatedAt = new Date();

    // Timestamps arrive as ISO strings from the client; drizzle wants Date objects.
    for (const key of ["addressSubmittedAt", "rsvpSubmittedAt", "checklistSubmittedAt", "linkSentAt", "firstOpenedAt", "calendarSavedAt"]) {
      if (typeof updates[key] === "string") updates[key] = updates[key] ? new Date(updates[key]) : null;
    }

    // Update members if provided — IN PLACE, keeping member ids stable.
    // (Delete+reinsert regenerated ids, which orphaned open guest pages, the
    // seating chart, and activity-log references. Order is constructive-first:
    // update, insert, then delete removed — a mid-save failure never wipes data.)
    if (members && Array.isArray(members)) {
      const memberFields = (m: any) => ({
        firstName: m.firstName || "",
        lastName: m.lastName || "",
        phone: m.phone || null,
        email: m.email || null,
        dietaryRestrictions: m.dietaryRestrictions || null,
        isChild: m.isChild || false,
        isPlusOne: m.isPlusOne || false,
        rsvpStatus: m.rsvpStatus || null,
        foodChoice: m.foodChoice || null,
        foodAllergies: m.foodAllergies || null,
        attendingWelcome: m.attendingWelcome ?? null,
        attendingCeremony: m.attendingCeremony ?? null,
        attendingReception: m.attendingReception ?? null,
        attendingBrunch: m.attendingBrunch ?? null,
        passportConfirmed: m.passportConfirmed || false,
        flightsBooked: m.flightsBooked || false,
        departureDate: m.departureDate || null,
        departureFlight: m.departureFlight || null,
        returnDate: m.returnDate || null,
        returnFlight: m.returnFlight || null,
        hotelBooked: m.hotelBooked || false,
        tableNumber: m.tableNumber ?? null,
        seatNumber: m.seatNumber ?? null,
      });

      const existing = await db
        .select({ id: householdMembers.id })
        .from(householdMembers)
        .where(eq(householdMembers.householdId, id));
      const existingIds = new Set(existing.map((m) => m.id));
      const keptIds = new Set<number>();

      for (const m of members) {
        if (m.id && existingIds.has(m.id)) {
          keptIds.add(m.id);
          await db.update(householdMembers).set(memberFields(m)).where(eq(householdMembers.id, m.id));
        } else {
          await db.insert(householdMembers).values({ householdId: id, ...memberFields(m) });
        }
      }
      for (const ex of existing) {
        if (!keptIds.has(ex.id)) {
          await db.delete(householdMembers).where(eq(householdMembers.id, ex.id));
        }
      }
      updates.partySize = members.length;
    }

    const [updated] = await db
      .update(guests)
      .set(updates)
      .where(eq(guests.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT /api/guests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/guests — delete a household (cascade deletes members)
export async function DELETE(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    await db.delete(guests).where(eq(guests.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/guests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
