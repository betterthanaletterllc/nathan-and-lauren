import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { guests, householdMembers, activityLog } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

// POST /api/guests/import — bulk import from CSV
// Each row = one person. Rows with the same Household are grouped together.
// Columns: Household, Slug, Table, Note, Side, First Name, Last Name, Phone, Email, Dietary Restrictions, Is Child
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows array is required" }, { status: 400 });
    }

    // Group rows by household
    const households: Record<string, { info: any; members: any[] }> = {};

    for (const row of rows) {
      const household = (row.Household || row.household || "").trim();
      if (!household) continue;

      if (!households[household]) {
        households[household] = {
          info: {
            name: household,
            slug: (row.Slug || row.slug || slugify(household)).trim(),
            tableNumber: parseInt(row.Table || row.table) || null,
            note: (row.Note || row.note || "").trim() || null,
            side: (row.Side || row.side || "").trim().toLowerCase() || null,
          },
          members: [],
        };
      }

      const firstName = (row["First Name"] || row.firstName || row.first_name || "").trim();
      const lastName = (row["Last Name"] || row.lastName || row.last_name || "").trim();

      if (firstName || lastName) {
        households[household].members.push({
          firstName,
          lastName,
          phone: (row.Phone || row.phone || "").trim() || null,
          email: (row.Email || row.email || "").trim() || null,
          dietaryRestrictions: (row["Dietary Restrictions"] || row.dietaryRestrictions || row.dietary_restrictions || "").trim() || null,
          isChild: ["yes", "true", "1", "y"].includes(
            (row["Is Child"] || row.isChild || row.is_child || "").toString().trim().toLowerCase()
          ),
        });
      }
    }

    const results = { imported: 0, skipped: 0, members: 0, errors: [] as string[] };

    for (const [name, { info, members }] of Object.entries(households)) {
      try {
        const [household] = await db
          .insert(guests)
          .values({
            name: info.name,
            slug: info.slug,
            partySize: members.length || 1,
            tableNumber: info.tableNumber,
            note: info.note,
            side: info.side,
          })
          .returning();

        if (members.length > 0) {
          await db.insert(householdMembers).values(
            members.map((m: any) => ({
              householdId: household.id,
              ...m,
            }))
          );
          results.members += members.length;
        }

        await db.insert(activityLog).values({
          action: "guest_imported",
          metadata: { name, slug: info.slug, memberCount: members.length },
        });

        results.imported++;
      } catch (err: any) {
        if (err.message?.includes("unique")) {
          results.errors.push(`"${name}" skipped: slug already exists`);
          results.skipped++;
        } else {
          results.errors.push(`"${name}": ${err.message}`);
          results.skipped++;
        }
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("POST /api/guests/import error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
