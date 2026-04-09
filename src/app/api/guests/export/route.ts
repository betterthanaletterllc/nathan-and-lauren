import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { guests } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

// GET /api/guests/export — download all guest addresses as CSV
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allGuests = await db
    .select()
    .from(guests)
    .orderBy(asc(guests.name));

  const headers = [
    "Name",
    "Slug",
    "Party Size",
    "Address Line 1",
    "Address Line 2",
    "City",
    "State",
    "ZIP",
    "Country",
    "Address Submitted",
    "Link Opened",
    "Open Count",
    "Note",
  ];

  const rows = allGuests.map((g) => [
    g.name,
    g.slug,
    g.partySize,
    g.addressLine1 || "",
    g.addressLine2 || "",
    g.city || "",
    g.state || "",
    g.zip || "",
    g.country || "",
    g.addressSubmittedAt ? new Date(g.addressSubmittedAt).toISOString() : "",
    g.firstOpenedAt ? new Date(g.firstOpenedAt).toISOString() : "",
    g.openCount,
    g.note || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="guest-addresses-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
