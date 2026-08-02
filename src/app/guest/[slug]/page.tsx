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

function formatFirstNames(memberNames: string[]): string {
  if (memberNames.length === 0) return "";
  if (memberNames.length === 1) return memberNames[0];
  if (memberNames.length === 2) return `${memberNames[0]} & ${memberNames[1]}`;
  return memberNames.slice(0, -1).join(", ") + ", & " + memberNames[memberNames.length - 1];
}

async function getMemberNames(guestId: number): Promise<string[]> {
  const members = await db
    .select({ firstName: householdMembers.firstName })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, guestId))
    .orderBy(householdMembers.id);
  return members.map((m) => m.firstName).filter(Boolean);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guest = await getGuest(params.slug);
  if (!guest) return { title: "Not Found" };

  const memberNames = await getMemberNames(guest.id);
  const displayName = memberNames.length > 0 ? formatFirstNames(memberNames) : guest.name.split(/\s*&\s*|\s+and\s+/i)[0].trim();

  return {
    title: `${displayName}, Save the Date! — Nathan & Lauren`,
    description: `You're invited to celebrate Nathan & Lauren's wedding · February 26, 2027 · Riviera Cancún, Mexico`,
    openGraph: {
      title: `${displayName}, Save the Date!`,
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
  const globalPhase = config["guest_page_phase"] || "save_the_date";
  const phase = guest.phaseOverride || globalPhase;
  const videoUrl = guest.videoUrl || config["global_video_url"] || "";
  // Real room-block deep link (Hyatt Inclusive Collection booking engine, Dreams Sapphire = drsrc).
  // Settings override these; fallbacks keep the booking card live even if settings are cleared.
  // NOTE: cp param is case-sensitive (lowercase fails). Minimal param set on purpose —
  // the occupancies JSON param is redundant with the /2/0/ path and broke once when
  // double-encoded in email transit. Verified prefilling dates + code 2026-08-02.
  const DEFAULT_ROOM_BLOCK_LINK =
    "https://bookings.hyattinclusivecollection.com/bookcore/availability/drsrc/2027-02-24/2027-02-28/2/0/?cp=ButoracWonderlyWedd&rrc=1";
  const roomBlockLink = config["room_block_link"] || DEFAULT_ROOM_BLOCK_LINK;
  const roomBlockCode = config["room_block_code"] || "BUTORACWONDERLYWEDD";
  const roomBlockDeadline = config["room_block_deadline"] || "";
  const rsvpDeadline = config["rsvp_deadline"] || "";
  const mealChangeDeadline = config["meal_change_deadline"] || "";
  const kidsInterest = Array.isArray(guest.tags) && guest.tags.includes("kids interest");
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

  const memberNames = members.map((m) => m.firstName).filter(Boolean);
  const displayName = memberNames.length > 0 ? formatFirstNames(memberNames) : guest.name;

  return (
    <GuestPageClient
      guest={{
        slug: guest.slug,
        name: guest.name,
        displayName,
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
      roomBlockCode={roomBlockCode}
      roomBlockDeadline={roomBlockDeadline}
      rsvpDeadline={rsvpDeadline}
      mealChangeDeadline={mealChangeDeadline}
      kidsInterestInitial={kidsInterest}
      destinationAirport={destinationAirport}
      travelDateStart={travelDateStart}
      travelDateEnd={travelDateEnd}
      foodOptions={foodOptions}
      resortMapUrl={resortMapUrl}
      eventSchedule={eventSchedule}
    />
  );
}
