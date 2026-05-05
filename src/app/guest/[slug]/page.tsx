import { db } from "@/lib/db";
import { guests, settings, householdMembers } from "@/lib/db/schema";
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
    description: `You're invited to celebrate Nathan & Lauren's wedding · February 26, 2027 · Riviera Cancún, Mexico`,
    openGraph: {
      title: `${firstName}, Save the Date!`,
      description: `Nathan & Lauren are getting married · February 26, 2027 · Riviera Cancún, Mexico`,
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
  const phase = config["guest_page_phase"] || "save_the_date";
  const videoUrl = guest.videoUrl || config["global_video_url"] || "";
  const roomBlockLink = config["room_block_link"] || "";
  const destinationAirport = config["destination_airport"] || "CUN";
  const travelDateStart = config["travel_date_start"] || "2027-02-25";
  const travelDateEnd = config["travel_date_end"] || "2027-02-28";
  const foodOptions = (config["food_options"] || "Salmon,Chicken Fettuccine").split(",").map((s) => s.trim()).filter(Boolean);
  const resortMapUrl = config["resort_map_url"] || "";
  let eventSchedule: any[] = [];
  try { eventSchedule = JSON.parse(config["event_schedule"] || "[]"); } catch {}

  // Fetch household members
  const members = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.householdId, guest.id))
    .orderBy(householdMembers.id);

  return (
    <GuestPageClient
      guest={{
        slug: guest.slug,
        name: guest.name,
        addressSubmitted: !!guest.addressSubmittedAt,
        tableNumber: showTable ? guest.tableNumber : null,
        plusOneAllowed: guest.plusOneAllowed,
        rsvpSubmitted: !!guest.rsvpSubmittedAt,
        checklistSubmitted: !!guest.checklistSubmittedAt,
        passportConfirmed: guest.passportConfirmed,
        flightsBooked: guest.flightsBooked,
        flightDetails: guest.flightDetails,
        hotelBooked: guest.hotelBooked,
        hotelInRoomBlock: guest.hotelInRoomBlock,
        transportNeeded: guest.transportNeeded,
        arrivalDate: guest.arrivalDate,
        departureDate: guest.departureDate,
        emergencyContact: guest.emergencyContact,
        songRequest: guest.songRequest,
        messageToCouple: guest.messageToCouple,
      }}
      members={members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        rsvpStatus: m.rsvpStatus,
        foodChoice: m.foodChoice,
        foodAllergies: m.foodAllergies,
        isChild: m.isChild,
        isPlusOne: m.isPlusOne,
        passportConfirmed: m.passportConfirmed,
        flightsBooked: m.flightsBooked,
        departureDate: m.departureDate,
        departureFlight: m.departureFlight,
        returnDate: m.returnDate,
        returnFlight: m.returnFlight,
        hotelBooked: m.hotelBooked,
      }))}
      note={note}
      phase={phase}
      videoUrl={videoUrl}
      roomBlockLink={roomBlockLink}
      destinationAirport={destinationAirport}
      travelDateStart={travelDateStart}
      travelDateEnd={travelDateEnd}
      foodOptions={foodOptions}
      resortMapUrl={resortMapUrl}
      eventSchedule={eventSchedule}
    />
  );
}
