import { db } from "@/lib/db";
import { guests, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GuestPageClient from "@/components/guest/GuestPageClient";

// Never cache — always fetch fresh settings/guest data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: { slug: string };
}

async function getGuest(slug: string) {
  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.slug, slug))
    .limit(1);
  return guest || null;
}

async function getSettings() {
  const all = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const s of all) map[s.key] = s.value || "";
  return map;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guest = await getGuest(params.slug);
  if (!guest) return { title: "Not Found" };

  const firstName = guest.name.split(/\s*&\s*|\s+and\s+/i)[0].trim();

  return {
    title: `${firstName}, Save the Date! — Nathan & Lauren`,
    description: `You're invited to celebrate Nathan & Lauren's wedding · February 26, 2027 · Cancún, Mexico`,
    openGraph: {
      title: `${firstName}, Save the Date!`,
      description: `Nathan & Lauren are getting married · February 26, 2027 · Cancún, Mexico`,
      type: "website",
    },
  };
}

export default async function GuestPage({ params }: Props) {
  const guest = await getGuest(params.slug);
  if (!guest) notFound();

  const config = await getSettings();
  const globalNote = config["global_note"] || "";
  const note = guest.note || globalNote;
  const showTable = config["show_table_numbers"] === "true";

  return (
    <GuestPageClient
      guest={{
        slug: guest.slug,
        name: guest.name,
        addressSubmitted: !!guest.addressSubmittedAt,
        tableNumber: showTable ? guest.tableNumber : null,
      }}
      note={note}
    />
  );
}
