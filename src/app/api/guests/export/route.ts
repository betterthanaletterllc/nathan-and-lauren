import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { guests, householdMembers } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

// GET /api/guests/export — download all guests as CSV (one row per person)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allGuests = await db.select().from(guests).orderBy(asc(guests.name));
    const allMembers = await db.select().from(householdMembers).orderBy(householdMembers.id);

    const membersByHousehold: Record<number, any[]> = {};
    for (const m of allMembers) {
      if (!membersByHousehold[m.householdId]) membersByHousehold[m.householdId] = [];
      membersByHousehold[m.householdId].push(m);
    }

    const headers = [
      "Household", "Slug", "Table", "Side", "Note",
      "First Name", "Last Name", "Phone", "Email", "Dietary Restrictions", "Is Child",
      "Address Line 1", "Address Line 2", "City", "State", "ZIP", "Country",
      "Link Opened", "Address Submitted",
    ];

    const rows: string[][] = [];

    for (const g of allGuests) {
      const members = membersByHousehold[g.id] || [];
      if (members.length === 0) {
        // Household with no members — still export one row
        rows.push([
          g.name, g.slug, g.tableNumber?.toString() || "", g.side || "", g.note || "",
          "", "", "", "", "", "",
          g.addressLine1 || "", g.addressLine2 || "", g.city || "", g.state || "", g.zip || "", g.country || "",
          g.firstOpenedAt ? new Date(g.firstOpenedAt).toISOString() : "",
          g.addressSubmittedAt ? new Date(g.addressSubmittedAt).toISOString() : "",
        ]);
      } else {
        for (const m of members) {
          rows.push([
            g.name, g.slug, g.tableNumber?.toString() || "", g.side || "", g.note || "",
            m.firstName, m.lastName, m.phone || "", m.email || "", m.dietaryRestrictions || "", m.isChild ? "Yes" : "No",
            g.addressLine1 || "", g.addressLine2 || "", g.city || "", g.state || "", g.zip || "", g.country || "",
            g.firstOpenedAt ? new Date(g.firstOpenedAt).toISOString() : "",
            g.addressSubmittedAt ? new Date(g.addressSubmittedAt).toISOString() : "",
          ]);
        }
      }
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="guest-list-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/guests/export error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
