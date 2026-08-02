import { ImageResponse } from "@vercel/og";
import { db } from "@/lib/db";
import { guests, householdMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const alt = "Nathan & Lauren — February 26, 2027";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatNames(names: string[]): string {
  if (names.length === 0) return "You're Invited";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return names.slice(0, -1).join(", ") + ", & " + names[names.length - 1];
}

export default async function Image({ params }: { params: { slug: string } }) {
  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.slug, params.slug))
    .limit(1);

  let displayName = "You're Invited";
  if (guest) {
    const members = await db
      .select({ firstName: householdMembers.firstName })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, guest.id))
      .orderBy(householdMembers.id);
    const names = members.map((m) => m.firstName).filter(Boolean);
    displayName = names.length > 0 ? formatNames(names) : guest.name;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FAF4EF 0%, #EBE3D1 100%)",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: "1px solid #E8D5C0",
            padding: "60px 80px",
            background: "#FAF4EF",
          }}
        >
          <p
            style={{
              fontSize: 18,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#B08A4A",
              margin: "0 0 24px",
            }}
          >
            SAVE THE DATE
          </p>
          <p
            style={{
              fontSize: 28,
              color: "#4F7060",
              margin: "0 0 16px",
            }}
          >
            {displayName}, you&apos;re invited!
          </p>
          <p
            style={{
              fontSize: 64,
              fontWeight: 300,
              color: "#2C2A26",
              margin: "0 0 8px",
              lineHeight: 1.1,
            }}
          >
            Nathan & Lauren
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              margin: "16px 0",
            }}
          >
            <div style={{ width: 60, height: 1, background: "#B08A4A" }} />
            <p style={{ fontSize: 24, color: "#B08A4A", fontStyle: "italic" }}>
              February 26, 2027
            </p>
            <div style={{ width: 60, height: 1, background: "#B08A4A" }} />
          </div>
          <p style={{ fontSize: 22, color: "#4F7060", fontStyle: "italic" }}>
            Riviera Cancún, Mexico
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
