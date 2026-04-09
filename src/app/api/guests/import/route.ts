import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { guests, activityLog } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

// POST /api/guests/import — bulk import guests from CSV data
// Expects JSON body: { guests: [{ name, slug?, partySize?, note? }] }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guests: guestList } = await req.json();

  if (!Array.isArray(guestList) || guestList.length === 0) {
    return NextResponse.json(
      { error: "guests array is required" },
      { status: 400 }
    );
  }

  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (const g of guestList) {
    try {
      if (!g.name) {
        results.errors.push(`Skipped row: missing name`);
        results.skipped++;
        continue;
      }

      const slug = g.slug || slugify(g.name);
      const partySize = parseInt(g.partySize || g.party_size) || 1;

      await db.insert(guests).values({
        name: g.name.trim(),
        slug,
        partySize,
        note: g.note || null,
        linkSentAt: null,
      });

      await db.insert(activityLog).values({
        action: "guest_imported",
        metadata: { name: g.name, slug },
      });

      results.imported++;
    } catch (err: any) {
      if (err.message?.includes("unique")) {
        results.errors.push(`"${g.name}" skipped: slug already exists`);
        results.skipped++;
      } else {
        results.errors.push(`"${g.name}": ${err.message}`);
        results.skipped++;
      }
    }
  }

  return NextResponse.json(results);
}
