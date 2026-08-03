export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, activityLog } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const ALLOWED_ACTIONS = new Set(["opened", "calendar_saved"]);

// POST /api/track — log a guest opening their link
export async function POST(req: NextRequest) {
  try {
  const { slug, action = "opened" } = await req.json();

  if (!slug || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.slug, slug))
    .limit(1);

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  // Update open tracking
  if (action === "opened") {
    await db
      .update(guests)
      .set({
        firstOpenedAt: guest.firstOpenedAt || new Date(),
        openCount: sql`${guests.openCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(guests.id, guest.id));
  }

  if (action === "calendar_saved") {
    await db
      .update(guests)
      .set({ calendarSavedAt: new Date(), updatedAt: new Date() })
      .where(eq(guests.id, guest.id));
  }

  await db.insert(activityLog).values({
    guestId: guest.id,
    action,
    metadata: { slug },
  });

  return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/track error:", err);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
