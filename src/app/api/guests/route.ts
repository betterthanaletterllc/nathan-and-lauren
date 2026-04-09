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

    // Update members if provided
    if (members && Array.isArray(members)) {
      // Delete existing and re-insert
      await db.delete(householdMembers).where(eq(householdMembers.householdId, id));
      if (members.length > 0) {
        await db.insert(householdMembers).values(
          members.map((m: any) => ({
            householdId: id,
            firstName: m.firstName || "",
            lastName: m.lastName || "",
            phone: m.phone || null,
            email: m.email || null,
            dietaryRestrictions: m.dietaryRestrictions || null,
            isChild: m.isChild || false,
          }))
        );
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
