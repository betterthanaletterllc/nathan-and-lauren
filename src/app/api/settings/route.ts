import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/settings — fetch all settings
export async function GET() {
  await getServerSession(authOptions);
  const all = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const s of all) {
    map[s.key] = s.value || "";
  }
  return NextResponse.json(map);
}

// POST /api/settings — upsert a setting { key, value }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, value } = await req.json();

  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });

  return NextResponse.json({ success: true });
}
