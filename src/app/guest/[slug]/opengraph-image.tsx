import { ImageResponse } from "@vercel/og";
import { db } from "@/lib/db";
import { guests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const alt = "Nathan & Lauren — Save the Date";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.slug, params.slug))
    .limit(1);

  const guestName = guest?.name || "You're Invited";
  const firstName = guestName.split(/\s*&\s*|\s+and\s+/i)[0].trim();

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
          background: "linear-gradient(135deg, #FAF6F1 0%, #F2EBE2 100%)",
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
            background: "#FFFDF9",
          }}
        >
          <p
            style={{
              fontSize: 18,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#C4956A",
              margin: "0 0 24px",
            }}
          >
            SAVE THE DATE
          </p>
          <p
            style={{
              fontSize: 28,
              color: "#6B6660",
              margin: "0 0 16px",
            }}
          >
            {firstName}, you&apos;re invited!
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
            <div style={{ width: 60, height: 1, background: "#C4956A" }} />
            <p style={{ fontSize: 24, color: "#C4956A", fontStyle: "italic" }}>
              February 27, 2027
            </p>
            <div style={{ width: 60, height: 1, background: "#C4956A" }} />
          </div>
          <p style={{ fontSize: 22, color: "#6B6660", fontStyle: "italic" }}>
            Cancún, Mexico
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
