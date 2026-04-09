import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activityLog, guests } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

// GET /api/activity — recent activity feed
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json([]);
    }

    const activities = await db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
        guestName: guests.name,
        guestSlug: guests.slug,
      })
      .from(activityLog)
      .leftJoin(guests, eq(activityLog.guestId, guests.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(100);

    return NextResponse.json(activities);
  } catch (err: any) {
    console.error("GET /api/activity error:", err);
    return NextResponse.json([]);
  }
}
