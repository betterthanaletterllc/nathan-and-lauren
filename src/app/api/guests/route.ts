import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { guests, activityLog } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { slugify } from "@/lib/utils";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

// GET /api/guests — list all guests
export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allGuests = await db
      .select()
      .from(guests)
      .orderBy(desc(guests.createdAt));
    return NextResponse.json(allGuests);
  } catch (err: any) {
    console.error("GET /api/guests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/guests — create a guest
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, partySize = 1, note, slug: customSlug, partyNames } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = customSlug || slugify(name);

    const [guest] = await db
      .insert(guests)
      .values({
        name,
        slug,
        partySize,
        note,
        partyNames: partyNames || null,
      })
      .returning();

    await db.insert(activityLog).values({
      guestId: guest.id,
      action: "guest_added",
      metadata: { name, slug },
    });

    return NextResponse.json(guest, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/guests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/guests — update a guest (pass id in body)
export async function PUT(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    updates.updatedAt = new Date();

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

// DELETE /api/guests — delete a guest (pass id in body)
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
