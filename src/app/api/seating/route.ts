export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { householdMembers } from "@/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";

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

    // Apply new assignments FIRST, then clear only members no longer assigned —
    // a mid-save failure leaves old seats intact instead of a wiped chart.
    const assignedIds = new Set<number>();
    for (const a of assignments) {
      if (a.memberId && a.tableNumber) {
        assignedIds.add(a.memberId);
        await db
          .update(householdMembers)
          .set({
            tableNumber: a.tableNumber,
            seatNumber: a.seatNumber ?? null,
          })
          .where(eq(householdMembers.id, a.memberId));
      }
    }

    const seated = await db
      .select({ id: householdMembers.id })
      .from(householdMembers)
      .where(isNotNull(householdMembers.tableNumber));
    for (const s of seated) {
      if (!assignedIds.has(s.id)) {
        await db
          .update(householdMembers)
          .set({ tableNumber: null, seatNumber: null })
          .where(eq(householdMembers.id, s.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/seating error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
