export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { householdMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/seating — save per-member seat assignments
// Body: { assignments: [{ memberId, tableNumber, seatNumber }] }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { assignments } = await req.json();

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: "assignments array required" }, { status: 400 });
    }

    // Clear all existing seat assignments first
    await db
      .update(householdMembers)
      .set({ tableNumber: null, seatNumber: null });

    // Set new assignments
    for (const a of assignments) {
      if (a.memberId && a.tableNumber) {
        await db
          .update(householdMembers)
          .set({
            tableNumber: a.tableNumber,
            seatNumber: a.seatNumber ?? null,
          })
          .where(eq(householdMembers.id, a.memberId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/seating error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
