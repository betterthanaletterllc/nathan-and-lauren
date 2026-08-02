"use client";

import { useEffect, useState } from "react";

interface MemberData {
  id: number;
  firstName: string;
  lastName: string;
  rsvpStatus: string | null;
  foodChoice: string | null;
  foodAllergies: string | null;
  isChild: boolean;
  isPlusOne: boolean;
  passportConfirmed: boolean;
  flightsBooked: boolean;
  departureDate: string | null;
  departureFlight: string | null;
  returnDate: string | null;
  returnFlight: string | null;
  hotelBooked: boolean;
}

interface Props {
  guest: {
    slug: string;
    name: string;
    displayName: string;
    addressSubmitted: boolean;
    tableNumber: number | null;
    plusOneAllowed: boolean;
    rsvpSubmitted: boolean;
    checklistSubmitted: boolean;
    passportConfirmed: boolean;
    flightsBooked: boolean;
    flightDetails: string | null;
    hotelBooked: boolean;
    hotelInRoomBlock: boolean | null;
    transportNeeded: boolean | null;
    arrivalDate: string | null;
    departureDate: string | null;
    emergencyContact: string | null;
    songRequest: string | null;
    messageToCouple: string | null;
  };
  members: MemberData[];
  note: string;
  phase: string;
  videoUrl: string;
  roomBlockLink: string;
  roomBlockCode: string;
  roomBlockDeadline: string;
  rsvpDeadline: string;
  mealChangeDeadline: string;
  kidsInterestInitial: boolean;
  destinationAirport: string;
  travelDateStart: string;
  travelDateEnd: string;
  foodOptions: string[];
  resortMapUrl: string;
  eventSchedule: { name: string; date: string; time: string; location: string; notes: string }[];
}

export default function GuestPageClient({ guest, members: initialMembers, note, phase, videoUrl, roomBlockLink, roomBlockCode, roomBlockDeadline, rsvpDeadline, mealChangeDeadline, kidsInterestInitial, destinationAirport, travelDateStart, travelDateEnd, foodOptions, resortMapUrl, eventSchedule }: Props) {
  const [submitted, setSubmitted] = useState(guest.addressSubmitted);
  const [submitting, setSubmitting] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(guest.rsvpSubmitted);
  const [checklistSubmitted, setChecklistSubmitted] = useState(guest.checklistSubmitted);
  const [form, setForm] = useState({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  // RSVP state
  const [rsvpMembers, setRsvpMembers] = useState(
    initialMembers.map((m) => ({
      ...m,
      rsvpStatus: m.rsvpStatus || "",
      foodChoice: m.foodChoice || "",
      foodAllergies: m.foodAllergies || "",
    }))
  );
  const [plusOne, setPlusOne] = useState({ firstName: "", lastName: "", phone: "", email: "", foodChoice: "", foodAllergies: "" });
  const [showPlusOne, setShowPlusOne] = useState(false);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpAttempted, setRsvpAttempted] = useState(false);
  const [rsvpError, setRsvpError] = useState("");

  // Kids
  const [kidsInterest, setKidsInterest] = useState(kidsInterestInitial);
  const [kidForm, setKidForm] = useState({ first: "", last: "" });
  const [kidError, setKidError] = useState("");

  // Meal changes (post-RSVP)
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [mealSavingId, setMealSavingId] = useState<number | null>(null);

  // Checklist state - per person
  const [memberChecklist, setMemberChecklist] = useState(
    initialMembers.filter(m => m.rsvpStatus === "coming").map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      passportConfirmed: m.passportConfirmed || false,
      flightsBooked: m.flightsBooked || false,
      departureDate: m.departureDate || "",
      departureFlight: m.departureFlight || "",
      returnDate: m.returnDate || "",
      returnFlight: m.returnFlight || "",
      hotelBooked: m.hotelBooked || false,
    }))
  );
  const [checklist, setChecklist] = useState({
    hotelInRoomBlock: guest.hotelInRoomBlock ?? true,
    transportNeeded: guest.transportNeeded ?? false,
    arrivalDate: guest.arrivalDate || "",
    departureDate: guest.departureDate || "",
    emergencyContact: guest.emergencyContact || "",
    songRequest: guest.songRequest || "",
    messageToCouple: guest.messageToCouple || "",
  });
  const [checklistSubmitting, setChecklistSubmitting] = useState(false);

  // Countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const weddingDate = new Date("2027-02-26T00:00:00");
  const diff = Math.max(0, weddingDate.getTime() - now);
  const countdown = {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };

  // Deadline helpers — parse YYYY-MM-DD as LOCAL date (new Date("YYYY-MM-DD") is UTC and shifts a day)
  function parseLocalDate(dateStr: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
  }
  function formatDeadline(dateStr: string): string {
    const d = parseLocalDate(dateStr);
    return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  }
  const rsvpDeadlineDate = parseLocalDate(rsvpDeadline);
  const rsvpDaysLeft = rsvpDeadlineDate ? Math.max(0, Math.ceil((rsvpDeadlineDate.getTime() - now) / 86400000)) : null;

  // Meal-change window
  const mealDeadlineDate = parseLocalDate(mealChangeDeadline);
  const mealChangeOpen = !mealDeadlineDate || now <= mealDeadlineDate.getTime();

  // Food option value <-> label
  function mealValue(label: string) {
    return label.toLowerCase().replace(/\s+/g, "_");
  }
  function mealLabel(value: string | null) {
    if (!value) return "—";
    return foodOptions.find((o) => mealValue(o) === value) || value;
  }

  // RSVP validation — every member answered, every attendee has a dinner
  function getRsvpMissing(): string[] {
    const missing: string[] = [];
    for (const m of rsvpMembers) {
      if (!m.rsvpStatus) missing.push(`${m.firstName} hasn’t answered yet`);
      else if (m.rsvpStatus === "coming" && !m.foodChoice) missing.push(`${m.firstName} needs a dinner selection`);
    }
    if (showPlusOne && plusOne.firstName && !plusOne.foodChoice) {
      missing.push(`${plusOne.firstName} needs a dinner selection`);
    }
    return missing;
  }
  const rsvpMissing = getRsvpMissing();

  // Status strip (rsvp phase onward)
  const showStrip = phase === "rsvp" || phase === "checklist" || phase === "final";
  const checklistTotal = memberChecklist.length * 3;
  const checklistDone = memberChecklist.reduce(
    (s, m) => s + (m.passportConfirmed ? 1 : 0) + (m.flightsBooked ? 1 : 0) + (m.hotelBooked ? 1 : 0),
    0
  );
  const anyoneComing = rsvpMembers.some((m) => m.rsvpStatus === "coming");

  // Travel section step numbering (hotel card only renders when configured)
  const hasBookingCard = !!(roomBlockLink || roomBlockCode);
  const flightsStepNum = hasBookingCard ? 2 : 1;
  const checklistStepNum = flightsStepNum + 1;

  // Geolocation for nearest airport
  const [userAirport, setUserAirport] = useState("");
  function findNearestAirport() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const airports = [
        { code: "DFW", lat: 32.8998, lng: -97.0403 },
        { code: "LAX", lat: 33.9425, lng: -118.4081 },
        { code: "JFK", lat: 40.6413, lng: -73.7781 },
        { code: "ORD", lat: 41.9742, lng: -87.9073 },
        { code: "ATL", lat: 33.6407, lng: -84.4277 },
        { code: "DEN", lat: 39.8561, lng: -104.6737 },
        { code: "SFO", lat: 37.6213, lng: -122.3790 },
        { code: "SEA", lat: 47.4502, lng: -122.3088 },
        { code: "MIA", lat: 25.7959, lng: -80.2870 },
        { code: "BOS", lat: 42.3656, lng: -71.0096 },
        { code: "IAH", lat: 29.9902, lng: -95.3368 },
        { code: "PHX", lat: 33.4373, lng: -112.0078 },
        { code: "MSP", lat: 44.8848, lng: -93.2223 },
        { code: "DTW", lat: 42.2124, lng: -83.3534 },
        { code: "CLT", lat: 35.2140, lng: -80.9431 },
        { code: "EWR", lat: 40.6895, lng: -74.1745 },
        { code: "LAS", lat: 36.0840, lng: -115.1537 },
        { code: "MCO", lat: 28.4312, lng: -81.3081 },
        { code: "AUS", lat: 30.1975, lng: -97.6664 },
        { code: "SAT", lat: 29.5337, lng: -98.4698 },
        { code: "DAL", lat: 32.8471, lng: -96.8518 },
        { code: "BNA", lat: 36.1263, lng: -86.6774 },
        { code: "SAN", lat: 32.7338, lng: -117.1933 },
        { code: "PHL", lat: 39.8744, lng: -75.2424 },
        { code: "DCA", lat: 38.8512, lng: -77.0402 },
        { code: "IAD", lat: 38.9531, lng: -77.4565 },
      ];
      let nearest = airports[0];
      let minDist = Infinity;
      for (const a of airports) {
        const d = Math.sqrt((lat - a.lat) ** 2 + (lng - a.lng) ** 2);
        if (d < minDist) { minDist = d; nearest = a; }
      }
      setUserAirport(nearest.code);
    });
  }

  function getFlightsUrl(origin?: string) {
    const from = origin || userAirport || "";
    const q = `Flights${from ? " from " + from : ""} to ${destinationAirport} on ${travelDateStart} return ${travelDateEnd}`;
    return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
  }

  // Track open on mount
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: guest.slug, action: "opened" }),
    }).catch(() => {});
  }, [guest.slug]);

  const firstName = guest.displayName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: guest.slug, ...form }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function addKid() {
    const first = kidForm.first.trim();
    const last = kidForm.last.trim();
    if (!first) {
      setKidError("A first name, please");
      return;
    }
    const tempId = Math.min(0, ...rsvpMembers.map((m) => m.id)) - 1;
    setRsvpMembers([
      ...rsvpMembers,
      {
        id: tempId,
        firstName: first,
        lastName: last,
        rsvpStatus: "coming",
        foodChoice: "",
        foodAllergies: "",
        isChild: true,
        isPlusOne: false,
        passportConfirmed: false,
        flightsBooked: false,
        departureDate: null,
        departureFlight: null,
        returnDate: null,
        returnFlight: null,
        hotelBooked: false,
      },
    ]);
    setKidForm({ first: "", last: "" });
    setKidError("");
  }

  function removeKid(tempId: number) {
    setRsvpMembers(rsvpMembers.filter((m) => m.id !== tempId));
  }

  async function handleRsvpSubmit() {
    setRsvpAttempted(true);
    setRsvpError("");
    if (getRsvpMissing().length > 0) return;

    setRsvpSubmitting(true);
    try {
      const members = rsvpMembers.map((m) => ({
        // Negative ids are children added in this session — insert, don't update
        id: m.id > 0 ? m.id : undefined,
        firstName: m.firstName,
        lastName: m.lastName,
        isChild: m.isChild,
        rsvpStatus: m.rsvpStatus || "not_coming",
        foodChoice: m.rsvpStatus === "coming" ? m.foodChoice : null,
        foodAllergies: m.rsvpStatus === "coming" ? m.foodAllergies : null,
      }));

      // Add plus one if applicable
      if (showPlusOne && plusOne.firstName) {
        members.push({
          id: undefined,
          isPlusOne: true,
          firstName: plusOne.firstName,
          lastName: plusOne.lastName,
          phone: plusOne.phone,
          email: plusOne.email,
          rsvpStatus: "coming",
          foodChoice: plusOne.foodChoice,
          foodAllergies: plusOne.foodAllergies,
        } as any);
      }

      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: guest.slug, members, kidsInterest }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Refresh local state from the server's member list (real ids for new
        // kids/plus-ones) so the travel checklist works without a reload
        if (Array.isArray(data.members)) {
          setRsvpMembers(
            data.members.map((m: any) => ({
              ...m,
              rsvpStatus: m.rsvpStatus || "",
              foodChoice: m.foodChoice || "",
              foodAllergies: m.foodAllergies || "",
            }))
          );
          setMemberChecklist(
            data.members
              .filter((m: any) => m.rsvpStatus === "coming")
              .map((m: any) => ({
                id: m.id,
                firstName: m.firstName,
                lastName: m.lastName,
                passportConfirmed: m.passportConfirmed || false,
                flightsBooked: m.flightsBooked || false,
                departureDate: m.departureDate || "",
                departureFlight: m.departureFlight || "",
                returnDate: m.returnDate || "",
                returnFlight: m.returnFlight || "",
                hotelBooked: m.hotelBooked || false,
              }))
          );
        }
        setRsvpSubmitted(true);
      } else {
        setRsvpError(data.error || "Something went wrong — please try again");
      }
    } catch {
      setRsvpError("Something went wrong — please try again");
    } finally {
      setRsvpSubmitting(false);
    }
  }

  async function changeMeal(memberId: number, newChoice: string) {
    setMealSavingId(memberId);
    try {
      const res = await fetch("/api/rsvp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: guest.slug, memberId, foodChoice: newChoice }),
      });
      if (res.ok) {
        setRsvpMembers(rsvpMembers.map((m) => (m.id === memberId ? { ...m, foodChoice: newChoice } : m)));
        setEditingMealId(null);
      }
    } finally {
      setMealSavingId(null);
    }
  }

  async function handleChecklistSubmit() {
    setChecklistSubmitting(true);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: guest.slug,
          ...checklist,
          memberChecklist: memberChecklist,
        }),
      });
      if (res.ok) setChecklistSubmitted(true);
    } finally {
      setChecklistSubmitting(false);
    }
  }

  function handleCalendar(type: "google" | "ics") {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: guest.slug, action: "calendar_saved" }),
    }).catch(() => {});

    if (type === "google") {
      const url =
        "https://calendar.google.com/calendar/render?action=TEMPLATE" +
        "&text=" + encodeURIComponent("Nathan & Lauren's Wedding") +
        "&dates=20270226/20270227" +
        "&details=" + encodeURIComponent("Nathan & Lauren's Wedding\n\nMore details at nathanandlauren.com") +
        "&location=" + encodeURIComponent("Dreams Sapphire Resort & Spa, Riviera Cancún, Mexico");
      window.open(url, "_blank");
    } else {
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NathanAndLauren//Wedding//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20270226",
        "DTEND;VALUE=DATE:20270227",
        "SUMMARY:Nathan & Lauren's Wedding",
        "DESCRIPTION:Nathan & Lauren's Wedding — Dreams Sapphire Resort & Spa\\, Riviera Cancún\\, Mexico\\nMore details at nathanandlauren.com",
        "LOCATION:Dreams Sapphire Resort & Spa, Riviera Cancún, Mexico",
        "STATUS:CONFIRMED",
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM",
        "TRIGGER:-P7D",
        "ACTION:DISPLAY",
        "DESCRIPTION:Reminder: Nathan & Lauren's Wedding is in one week!",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "nathan-and-lauren-wedding.ics";
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }

  const inputClass =
    "w-full px-4 py-3 bg-white border border-gold-pale rounded-none text-[15px] font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold transition-colors";

  return (
    <div className="min-h-dvh bg-sand flex items-center justify-center p-4 sm:p-8">
      <div className="bg-[#FFFDF9] max-w-[480px] w-full relative border border-gold-pale/60">
        {/* Corner accents */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t border-l border-gold" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t border-r border-gold" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b border-l border-gold" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b border-r border-gold" />

        {/* Gold top line */}
        <div className="absolute top-3 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="absolute bottom-3 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* Status strip */}
        {showStrip && (rsvpSubmitted || rsvpDeadlineDate) && (
          <div className="sticky top-2 z-20 mx-4 mt-4 px-4 py-3 bg-[#FBF3EA] border border-gold/30 shadow-sm flex items-center justify-center gap-x-3 gap-y-1 flex-wrap text-[12px] tracking-[1.5px] uppercase text-ink-soft">
            {!rsvpSubmitted ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-gold" />
                  <span>
                    RSVP by <b className="font-medium text-ink">{formatDeadline(rsvpDeadline)}</b>
                  </span>
                </span>
                {rsvpDaysLeft !== null && (
                  <span className="text-gold font-medium">
                    {rsvpDaysLeft} {rsvpDaysLeft === 1 ? "day" : "days"} left
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-[#6E8060] font-medium">✓ RSVP&apos;d</span>
                {anyoneComing && checklistTotal > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gold" />
                    <span>
                      Checklist <b className="font-medium text-ink">{checklistDone} of {checklistTotal}</b>
                    </span>
                  </span>
                )}
                {!anyoneComing && <span>We&apos;ll miss you</span>}
              </>
            )}
          </div>
        )}

        <div className="px-8 py-12 sm:px-10 sm:py-14 text-center">
          {/* Save the Date */}
          <p className="font-body font-normal text-[10px] tracking-[6px] uppercase text-gold mb-8 animate-fadeUp">
            Save the Date
          </p>

          {/* Personalized greeting */}
          <p className="font-body font-light text-xs tracking-[3px] uppercase text-ink-soft mb-6 animate-fadeUp animation-delay-100">
            {firstName}, you&apos;re invited to celebrate
          </p>

          {/* Names */}
          <div className="mb-6 animate-fadeUp animation-delay-200">
            <h1 className="font-display font-light text-[clamp(36px,10vw,46px)] leading-tight text-ink">
              Nathan
            </h1>
            <div className="flex items-center justify-center gap-4 my-1.5">
              <span className="w-12 h-px bg-gold" />
              <span className="font-display font-medium text-2xl text-gold">
                &
              </span>
              <span className="w-12 h-px bg-gold" />
            </div>
            <h1 className="font-display font-light text-[clamp(36px,10vw,46px)] leading-tight text-ink">
              Lauren
            </h1>
          </div>

          {/* Date */}
          <div className="flex items-center justify-center gap-6 mb-6 animate-fadeUp animation-delay-300">
            <span className="font-body font-light text-[11px] tracking-[3px] uppercase text-ink-soft">
              February
            </span>
            <div className="w-[76px] h-[76px] rounded-full border border-gold flex items-center justify-center">
              <span className="font-display text-[34px] text-ink">26</span>
            </div>
            <span className="font-body font-light text-[11px] tracking-[3px] uppercase text-ink-soft">
              2027
            </span>
          </div>

          {/* Animated waves */}
          <svg
            viewBox="0 0 200 24"
            className="w-44 mx-auto mb-6 animate-fadeUp animation-delay-400"
          >
            <path
              d="M10 12 Q50 2, 100 12 T190 12"
              fill="none"
              stroke="#C4956A"
              strokeWidth="0.5"
              opacity="0.6"
            >
              <animate
                attributeName="d"
                values="M10 12 Q50 2, 100 12 T190 12;M10 12 Q50 22, 100 12 T190 12;M10 12 Q50 2, 100 12 T190 12"
                dur="6s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M10 14 Q50 4, 100 14 T190 14"
              fill="none"
              stroke="#C4956A"
              strokeWidth="0.3"
              opacity="0.35"
            >
              <animate
                attributeName="d"
                values="M10 14 Q50 24, 100 14 T190 14;M10 14 Q50 4, 100 14 T190 14;M10 14 Q50 24, 100 14 T190 14"
                dur="6s"
                repeatCount="indefinite"
              />
            </path>
          </svg>

          {/* Location */}
          <div className="mb-6 animate-fadeUp animation-delay-500">
            <a
              href="https://maps.app.goo.gl/zKjtXDLcCCqqwTb57"
              target="_blank"
              rel="noopener"
              className="block group"
            >
              <p className="font-display italic text-xl text-ink mb-1 group-hover:text-gold transition-colors">
                Dreams Sapphire Resort & Spa
              </p>
              <p className="font-body font-light text-[11px] tracking-[3px] uppercase text-ink-faint">
                Riviera Cancún, Mexico
              </p>
            </a>
          </div>

          {/* Note from couple */}
          {note && (
            <div className="mb-8 animate-fadeUp animation-delay-500">
              <div className="w-8 h-px bg-gold mx-auto mb-4" />
              <p className="font-display italic text-[17px] text-ink-soft leading-relaxed px-4">
                &ldquo;{note}&rdquo;
              </p>
            </div>
          )}

          {/* Table number */}
          {guest.tableNumber && (
            <div className="mb-8 animate-fadeUp animation-delay-500">
              <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-2">
                Your table
              </p>
              <div className="w-16 h-16 rounded-full border border-gold mx-auto flex items-center justify-center">
                <span className="font-display text-2xl text-ink">{guest.tableNumber}</span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="w-10 h-px bg-gold mx-auto mb-8 animate-fadeUp animation-delay-600" />

          {/* Address form or thank you */}
          {(phase === "save_the_date" || !submitted) && (
          <div className="animate-fadeUp animation-delay-700">
            {submitted ? (
              <div className="py-4">
                <p className="font-body font-light text-sm text-ink-soft mb-1">
                  Thank you! We have your address.
                </p>
                <p className="font-body font-light text-xs text-ink-faint">
                  Your invitation is on its way soon.
                </p>
              </div>
            ) : (
              <>
                <p className="font-body font-light text-[11px] tracking-[2px] uppercase text-ink-soft mb-4">
                  Share your mailing address for the invitation
                </p>
                <form onSubmit={handleSubmit} className="space-y-3 text-left">
                  <input
                    type="text"
                    placeholder="Address line 1"
                    required
                    value={form.addressLine1}
                    onChange={(e) =>
                      setForm({ ...form, addressLine1: e.target.value })
                    }
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Address line 2 (optional)"
                    value={form.addressLine2}
                    onChange={(e) =>
                      setForm({ ...form, addressLine2: e.target.value })
                    }
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      required
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      required
                      value={form.state}
                      onChange={(e) =>
                        setForm({ ...form, state: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="ZIP code"
                      required
                      value={form.zip}
                      onChange={(e) =>
                        setForm({ ...form, zip: e.target.value })
                      }
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={form.country}
                      onChange={(e) =>
                        setForm({ ...form, country: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-gold text-white font-body font-medium text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Submit Address"}
                  </button>
                </form>
              </>
            )}
          </div>
          )}

          {/* RSVP Section */}
          {(phase === "rsvp" || phase === "checklist" || phase === "final") && (
            <div className="animate-fadeUp animation-delay-700">
              {/* Video */}
              {videoUrl && (
                <div className="mb-8">
                  <div className="aspect-video w-full">
                    {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                      <iframe
                        src={videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover bg-ink/5"
                      />
                    )}
                  </div>
                </div>
              )}

              {rsvpSubmitted ? (
                <div className="text-left">
                  <div className="border border-gold/30 bg-gold/5 p-5">
                    <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint text-center mb-2">
                      Your RSVP
                    </p>
                    <p className="font-body font-light text-xs text-ink-soft text-center mb-3">
                      {anyoneComing
                        ? "We can’t wait to celebrate with you in Cancún!"
                        : "We’ll miss you! Thank you for letting us know."}
                    </p>
                    {rsvpMembers.filter((m) => m.firstName).map((m) => (
                      <div key={m.id} className="flex items-center gap-3 flex-wrap py-2.5 border-b border-gold-pale/50 last:border-0">
                        <span className="font-body text-[15px] text-ink flex-1">
                          {m.firstName} {m.lastName}
                          {m.isChild && <span className="text-xs text-ink-faint ml-1.5">(child)</span>}
                        </span>
                        {m.rsvpStatus === "coming" ? (
                          editingMealId === m.id ? (
                            <div className="basis-full flex gap-2 pt-1">
                              {foodOptions.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => changeMeal(m.id, mealValue(opt))}
                                  disabled={mealSavingId === m.id}
                                  className={`flex-1 py-2 text-xs font-body tracking-[1px] uppercase transition-colors disabled:opacity-50 ${
                                    m.foodChoice === mealValue(opt) ? "bg-gold text-white" : "border border-gold-pale text-ink-soft hover:border-gold"
                                  }`}
                                >
                                  {mealSavingId === m.id ? "Saving..." : opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <>
                              <span className="font-display italic text-[17px] text-ink-soft">{mealLabel(m.foodChoice)}</span>
                              {mealChangeOpen && (
                                <button
                                  onClick={() => setEditingMealId(m.id)}
                                  className="font-body text-[10px] tracking-[1.5px] uppercase text-gold underline underline-offset-2"
                                >
                                  Change
                                </button>
                              )}
                            </>
                          )
                        ) : (
                          <span className="font-display italic text-[17px] text-ink-faint">Not attending</span>
                        )}
                      </div>
                    ))}
                    {kidsInterest && !rsvpMembers.some((m) => m.isChild && m.rsvpStatus === "coming") && (
                      <div className="flex items-center gap-3 py-2.5 border-b border-gold-pale/50 last:border-0">
                        <span className="font-body text-[15px] text-ink flex-1">Children</span>
                        <span className="font-display italic text-[17px] text-ink-soft">Interested — names to come</span>
                      </div>
                    )}
                    <p className="font-body font-light text-[12px] text-ink-faint text-center mt-3 leading-relaxed">
                      {anyoneComing ? (
                        mealChangeOpen ? (
                          <>
                            Meal changes open until{" "}
                            <b className="font-medium text-ink-soft">{mealDeadlineDate ? formatDeadline(mealChangeDeadline) : "further notice"}</b>.
                            Need to change who&apos;s coming? Text us anytime.
                          </>
                        ) : (
                          <>Dinner selections are locked in for the resort. Need anything? Text us anytime.</>
                        )
                      ) : (
                        <>Change of plans? Text us anytime.</>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <p className="font-body font-light text-[12px] tracking-[2px] uppercase text-ink-soft text-center mb-4">
                    RSVP for your household
                  </p>

                  {rsvpMembers.map((m, i) => (
                    <div key={m.id} className="border border-gold-pale/40 p-4 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <p className="font-body font-medium text-[15px] text-ink">
                          {m.firstName} {m.lastName}
                          {m.isChild && <span className="text-xs text-ink-faint ml-2">(child)</span>}
                        </p>
                        {m.id < 0 && (
                          <button
                            onClick={() => removeKid(m.id)}
                            className="font-body text-[10px] tracking-[1px] uppercase text-ink-faint hover:text-red-400"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {["coming", "not_coming"].map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              const arr = [...rsvpMembers];
                              arr[i] = { ...arr[i], rsvpStatus: status };
                              setRsvpMembers(arr);
                            }}
                            className={`flex-1 py-2 font-body text-[11px] tracking-[2px] uppercase transition-colors ${
                              m.rsvpStatus === status
                                ? status === "coming" ? "bg-gold text-white" : "bg-ink-soft text-white"
                                : "border border-gold-pale text-ink-soft hover:border-gold"
                            }`}
                          >
                            {status === "coming" ? "Joyfully Accept" : "Regretfully Decline"}
                          </button>
                        ))}
                      </div>

                      {m.rsvpStatus === "coming" && (
                        <div className="space-y-2">
                          <div>
                            <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint mb-1">Dinner selection</p>
                            <div className="flex gap-2">
                              {foodOptions.map((opt) => [opt.toLowerCase().replace(/\s+/g, "_"), opt]).map(([val, label]) => (
                                <button
                                  key={val}
                                  onClick={() => {
                                    const arr = [...rsvpMembers];
                                    arr[i] = { ...arr[i], foodChoice: val };
                                    setRsvpMembers(arr);
                                  }}
                                  className={`flex-1 py-2 text-xs font-body tracking-[1px] uppercase transition-colors ${
                                    m.foodChoice === val ? "bg-gold text-white" : "border border-gold-pale text-ink-soft hover:border-gold"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={m.foodAllergies}
                            onChange={(e) => {
                              const arr = [...rsvpMembers];
                              arr[i] = { ...arr[i], foodAllergies: e.target.value };
                              setRsvpMembers(arr);
                            }}
                            placeholder="Food allergies (if any)"
                            className={inputClass}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Plus one */}
                  {guest.plusOneAllowed && (
                    <div className="border border-gold-pale/40 p-4 space-y-3">
                      <label className="flex items-center gap-2 font-body text-[15px] text-ink cursor-pointer">
                        <input type="checkbox" checked={showPlusOne} onChange={(e) => setShowPlusOne(e.target.checked)} />
                        I&apos;d like to bring a plus one
                      </label>
                      {showPlusOne && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={plusOne.firstName} onChange={(e) => setPlusOne({ ...plusOne, firstName: e.target.value })} placeholder="First name" className={inputClass} />
                            <input type="text" value={plusOne.lastName} onChange={(e) => setPlusOne({ ...plusOne, lastName: e.target.value })} placeholder="Last name" className={inputClass} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={plusOne.phone} onChange={(e) => setPlusOne({ ...plusOne, phone: e.target.value })} placeholder="Phone" className={inputClass} />
                            <input type="text" value={plusOne.email} onChange={(e) => setPlusOne({ ...plusOne, email: e.target.value })} placeholder="Email" className={inputClass} />
                          </div>
                          <div>
                            <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint mb-1">Dinner selection</p>
                            <div className="flex gap-2">
                              {foodOptions.map((opt) => [opt.toLowerCase().replace(/\s+/g, "_"), opt]).map(([val, label]) => (
                                <button key={val} onClick={() => setPlusOne({ ...plusOne, foodChoice: val })} className={`flex-1 py-2 text-xs font-body tracking-[1px] uppercase transition-colors ${plusOne.foodChoice === val ? "bg-gold text-white" : "border border-gold-pale text-ink-soft hover:border-gold"}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <input type="text" value={plusOne.foodAllergies} onChange={(e) => setPlusOne({ ...plusOne, foodAllergies: e.target.value })} placeholder="Food allergies (if any)" className={inputClass} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Kids interest */}
                  <div className="border border-dashed border-gold-pale p-4 space-y-3">
                    <label className="flex items-center gap-2 font-body text-[15px] text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kidsInterest}
                        onChange={(e) => setKidsInterest(e.target.checked)}
                      />
                      I&apos;m interested in bringing my children
                    </label>
                    {kidsInterest && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={kidForm.first}
                            onChange={(e) => { setKidForm({ ...kidForm, first: e.target.value }); setKidError(""); }}
                            placeholder="First name"
                            className={inputClass}
                          />
                          <input
                            type="text"
                            value={kidForm.last}
                            onChange={(e) => setKidForm({ ...kidForm, last: e.target.value })}
                            placeholder="Last name"
                            className={inputClass}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={addKid}
                            className="px-5 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors"
                          >
                            Add
                          </button>
                          <span className={`font-body font-light text-[11px] ${kidError ? "text-red-400" : "text-ink-faint"}`}>
                            {kidError || "Add each child when you know their names — no rush"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleRsvpSubmit}
                    disabled={rsvpSubmitting}
                    className="w-full py-3.5 bg-gold text-white font-body font-medium text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
                  >
                    {rsvpSubmitting ? "Submitting..." : "Submit RSVP"}
                  </button>
                  {(rsvpError || rsvpMissing.length > 0) && (
                    <p className={`font-body font-light text-xs text-center ${rsvpAttempted || rsvpError ? "text-red-400" : "text-ink-faint"}`}>
                      {rsvpError ||
                        (rsvpAttempted
                          ? rsvpMissing[0]
                          : `${rsvpMissing.length} ${rsvpMissing.length === 1 ? "answer" : "answers"} to go`)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* The Weekend — event schedule, visible from the RSVP phase so guests
              can book flights around the full weekend (arrived/final phases show
              their own schedule in the live guide below) */}
          {(phase === "rsvp" || phase === "checklist") && eventSchedule.length > 0 && (
            <div className="mt-8 animate-fadeUp animation-delay-700">
              <div className="w-10 h-px bg-gold mx-auto mb-6" />
              <p className="font-body font-medium text-[11px] tracking-[5px] uppercase text-gold text-center mb-2">
                The Weekend
              </p>
              <p className="font-body font-light text-[13px] text-ink-soft text-center mb-4">
                Plan your flights around the whole weekend.
              </p>
              <div className="text-left">
                {eventSchedule.map((event, i) => (
                  <div key={i} className="border-b border-gold-pale/40 last:border-0 py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display font-medium text-[19px] text-ink">{event.name}</p>
                        <p className="font-body font-light text-[13px] text-ink-soft mt-0.5">
                          {event.location}
                        </p>
                        {event.notes && (
                          <p className="font-body font-light text-[13px] text-ink-faint mt-1 italic">
                            {event.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-body text-[13px] text-ink-soft">{event.date}</p>
                        <p className="font-display font-medium text-base text-gold">{event.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Travel Checklist — available the moment a household RSVPs yes,
              in any phase from rsvp onward (the handoff) */}
          {(phase === "rsvp" || phase === "checklist" || phase === "final") && rsvpSubmitted && anyoneComing && (
            <div className="mt-8 animate-fadeUp animation-delay-700">
              <div className="w-10 h-px bg-gold mx-auto mb-6" />

              {/* Countdown */}
              <div className="mb-8 text-center">
                <p className="font-body font-normal text-[10px] tracking-[6px] uppercase text-gold mb-4">
                  Counting down
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {[
                    { value: countdown.days, label: "Days" },
                    { value: countdown.hours, label: "Hrs" },
                    { value: countdown.minutes, label: "Min" },
                    { value: countdown.seconds, label: "Sec" },
                  ].map(({ value, label }, i) => (
                    <div key={label} className="flex items-center gap-2 sm:gap-3">
                      <div className="text-center">
                        <div className="w-14 sm:w-16 h-14 sm:h-16 border border-gold/40 flex items-center justify-center mb-1">
                          <span className="font-display text-xl sm:text-2xl text-ink tabular-nums">
                            {String(value).padStart(2, "0")}
                          </span>
                        </div>
                        <p className="font-body font-light text-[8px] tracking-[2px] uppercase text-ink-faint">{label}</p>
                      </div>
                      {i < 3 && <span className="font-display text-sm text-gold/30 mb-4">:</span>}
                    </div>
                  ))}
                </div>
              </div>

              {checklistSubmitted ? (
                <div className="py-4">
                  <p className="font-body font-light text-sm text-ink-soft mb-1">
                    Travel checklist submitted!
                  </p>
                  <p className="font-body font-light text-xs text-ink-faint">
                    You can update it anytime by revisiting this page.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <p className="font-body font-light text-[12px] tracking-[2px] uppercase text-ink-soft text-center mb-4">
                    Getting there
                  </p>

                  {/* Step 1 — room block card */}
                  {hasBookingCard && (
                    <div className="border border-gold/30 bg-gold/5 p-5">
                      <p className="font-body text-[11px] tracking-[2px] uppercase text-gold mb-2">
                        Step 1 — Book your room
                      </p>
                      <p className="font-body font-light text-[15px] text-ink-soft mb-4">
                        Book through our room block to stay with the group at our rate. The
                        group rate covers stays between Feb 2 and Mar 4 — come early or stay
                        late if you&apos;d like.
                      </p>
                      {roomBlockLink && (
                        <a href={roomBlockLink} target="_blank" rel="noopener" className="block py-3.5 text-center bg-gold text-white font-body font-medium text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors">
                          Book Your Room
                        </a>
                      )}
                      {roomBlockCode && (
                        <p className="font-body font-light text-[12px] text-ink-soft mt-3 leading-relaxed">
                          Group code:{" "}
                          <code className="font-body font-medium tracking-wide uppercase text-ink bg-white border border-gold-pale px-1.5 py-0.5">
                            {roomBlockCode}
                          </code>{" "}
                          — enter it in the promotional-code box if it isn&apos;t already
                          applied, or read it to the agent if you book by phone.
                        </p>
                      )}
                      {roomBlockDeadline && (
                        <p className="font-body text-[11px] tracking-[1.5px] uppercase text-gold mt-2">
                          Room block held until {formatDeadline(roomBlockDeadline)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Step 2 — flights card */}
                  <div className="border border-gold/30 bg-gold/5 p-5">
                    <p className="font-body text-[11px] tracking-[2px] uppercase text-gold mb-2">
                      Step {flightsStepNum} — Book your flights
                    </p>
                    <p className="font-body font-light text-[15px] text-ink-soft mb-4">
                      Fly into Cancún ({destinationAirport}) — most of the group arrives{" "}
                      {formatDeadline(travelDateStart) || travelDateStart} and heads home{" "}
                      {formatDeadline(travelDateEnd) || travelDateEnd}.
                    </p>
                    <button
                      onClick={() => {
                        if (!userAirport) {
                          findNearestAirport();
                          // Open with no origin for now, geolocation will update
                          window.open(getFlightsUrl(), "_blank");
                        } else {
                          window.open(getFlightsUrl(), "_blank");
                        }
                      }}
                      className="w-full py-3.5 text-center border-2 border-gold text-gold font-body font-medium text-[13px] tracking-[3px] uppercase hover:bg-gold hover:text-white transition-colors"
                    >
                      Search Flights
                    </button>
                  </div>

                  {/* Step 3 — checklist heading */}
                  <div className="pt-2">
                    <p className="font-body text-[11px] tracking-[2px] uppercase text-gold text-center mb-1">
                      Step {checklistStepNum} — Your checklist
                    </p>
                    <p className="font-body font-light text-[12px] text-ink-faint text-center mb-3">
                      Check things off as you book, then submit at the bottom — you can update it anytime.
                    </p>
                  </div>

                  {/* Per-person checklist */}
                  {memberChecklist.map((m, i) => (
                    <div key={m.id} className="border border-gold-pale/40 p-4 space-y-3">
                      <p className="font-body font-medium text-[15px] text-ink">{m.firstName} {m.lastName}</p>

                      <label className="flex items-center gap-2 font-body text-[15px] text-ink">
                        <input type="checkbox" checked={m.passportConfirmed} onChange={(e) => {
                          const arr = [...memberChecklist]; arr[i] = { ...arr[i], passportConfirmed: e.target.checked }; setMemberChecklist(arr);
                        }} />
                        Valid passport (expires after April 2027)
                      </label>

                      <label className="flex items-center gap-2 font-body text-[15px] text-ink">
                        <input type="checkbox" checked={m.flightsBooked} onChange={(e) => {
                          const arr = [...memberChecklist]; arr[i] = { ...arr[i], flightsBooked: e.target.checked }; setMemberChecklist(arr);
                        }} />
                        Flights booked
                      </label>
                      {m.flightsBooked && (
                        <div className="space-y-2 ml-6">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="font-body text-[9px] uppercase text-ink-faint">Departure date</label>
                              <input type="date" value={m.departureDate} onChange={(e) => {
                                const arr = [...memberChecklist]; arr[i] = { ...arr[i], departureDate: e.target.value }; setMemberChecklist(arr);
                              }} className={inputClass} />
                            </div>
                            <div>
                              <label className="font-body text-[9px] uppercase text-ink-faint">Flight #</label>
                              <input type="text" value={m.departureFlight} onChange={(e) => {
                                const arr = [...memberChecklist]; arr[i] = { ...arr[i], departureFlight: e.target.value }; setMemberChecklist(arr);
                              }} placeholder="e.g. AA 1234" className={inputClass} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="font-body text-[9px] uppercase text-ink-faint">Return date</label>
                              <input type="date" value={m.returnDate} onChange={(e) => {
                                const arr = [...memberChecklist]; arr[i] = { ...arr[i], returnDate: e.target.value }; setMemberChecklist(arr);
                              }} className={inputClass} />
                            </div>
                            <div>
                              <label className="font-body text-[9px] uppercase text-ink-faint">Flight #</label>
                              <input type="text" value={m.returnFlight} onChange={(e) => {
                                const arr = [...memberChecklist]; arr[i] = { ...arr[i], returnFlight: e.target.value }; setMemberChecklist(arr);
                              }} placeholder="e.g. AA 5678" className={inputClass} />
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="flex items-center gap-2 font-body text-[15px] text-ink">
                        <input type="checkbox" checked={m.hotelBooked} onChange={(e) => {
                          const arr = [...memberChecklist]; arr[i] = { ...arr[i], hotelBooked: e.target.checked }; setMemberChecklist(arr);
                        }} />
                        Hotel booked
                      </label>
                    </div>
                  ))}

                  {/* Household-level checklist */}
                  <div className="border border-gold-pale/40 p-4 space-y-3">
                    <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Household details</p>

                    <label className="flex items-center gap-2 font-body text-xs text-ink-soft">
                      <input type="checkbox" checked={!checklist.hotelInRoomBlock} onChange={(e) => setChecklist({ ...checklist, hotelInRoomBlock: !e.target.checked })} />
                      We booked outside the room block
                    </label>

                    <label className="flex items-center gap-2 font-body text-[15px] text-ink">
                      <input type="checkbox" checked={checklist.transportNeeded} onChange={(e) => setChecklist({ ...checklist, transportNeeded: e.target.checked })} />
                      We need airport transportation
                    </label>

                    <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint mt-2">Travel dates</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-body text-[9px] uppercase text-ink-faint">Arrival</label>
                        <input type="date" value={checklist.arrivalDate} onChange={(e) => setChecklist({ ...checklist, arrivalDate: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="font-body text-[9px] uppercase text-ink-faint">Departure</label>
                        <input type="date" value={checklist.departureDate} onChange={(e) => setChecklist({ ...checklist, departureDate: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                  </div>

                  {/* Emergency contact */}
                  <div className="border border-gold-pale/40 p-4 space-y-3">
                    <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Emergency contact</p>
                    <input type="text" value={checklist.emergencyContact} onChange={(e) => setChecklist({ ...checklist, emergencyContact: e.target.value })} placeholder="Name & phone number" className={inputClass} />
                  </div>

                  {/* Fun stuff */}
                  <div className="border border-gold-pale/40 p-4 space-y-3">
                    <input type="text" value={checklist.songRequest} onChange={(e) => setChecklist({ ...checklist, songRequest: e.target.value })} placeholder="Song request for the DJ" className={inputClass} />
                    <textarea
                      rows={3}
                      value={checklist.messageToCouple}
                      onChange={(e) => setChecklist({ ...checklist, messageToCouple: e.target.value })}
                      placeholder="A message for Nathan & Lauren..."
                      className={inputClass + " resize-none"}
                    />
                  </div>

                  <button
                    onClick={handleChecklistSubmit}
                    disabled={checklistSubmitting}
                    className="w-full py-3.5 bg-gold text-white font-body font-medium text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
                  >
                    {checklistSubmitting ? "Submitting..." : "Submit Checklist"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Arrived / Live Event Guide */}
          {(phase === "arrived" || phase === "final") && (
            <div className="mt-8 animate-fadeUp animation-delay-700">
              <div className="w-10 h-px bg-gold mx-auto mb-6" />

              <p className="font-body font-normal text-[10px] tracking-[6px] uppercase text-gold text-center mb-6">
                Welcome to Cancún
              </p>

              {/* Resort map */}
              {resortMapUrl && (
                <a
                  href={resortMapUrl}
                  target="_blank"
                  rel="noopener"
                  className="block py-3.5 text-center bg-gold text-white font-body font-medium text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors mb-4"
                >
                  View Resort Map
                </a>
              )}

              {/* Event schedule */}
              {eventSchedule.length > 0 && (
                <div className="space-y-0">
                  <p className="font-body font-light text-[12px] tracking-[2px] uppercase text-ink-soft text-center mb-4">
                    Schedule of events
                  </p>
                  {eventSchedule.map((event, i) => (
                    <div key={i} className="border-b border-gold-pale/40 last:border-0 py-4 first:pt-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display font-medium text-[19px] text-ink">{event.name}</p>
                          <p className="font-body font-light text-[13px] text-ink-soft mt-0.5">
                            {event.location}
                          </p>
                          {event.notes && (
                            <p className="font-body font-light text-[13px] text-ink-faint mt-1 italic">
                              {event.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-body text-[13px] text-ink-soft">{event.date}</p>
                          <p className="font-display font-medium text-base text-gold">{event.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Table number (if enabled) */}
              {guest.tableNumber && (
                <div className="mt-6 text-center">
                  <p className="font-body font-light text-[10px] tracking-[3px] uppercase text-ink-faint mb-2">
                    Your table
                  </p>
                  <div className="w-16 h-16 rounded-full border border-gold mx-auto flex items-center justify-center">
                    <span className="font-display text-2xl text-ink">{guest.tableNumber}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Calendar buttons */}
          <div className="mt-10 mb-2 animate-fadeUp animation-delay-800">
            <div className="border border-gold/30 bg-gold/5 p-6 text-center">
              {/* Calendar icon */}
              <div className="w-12 h-12 mx-auto mb-3 border border-gold/40 flex flex-col items-center justify-center">
                <span className="font-body text-[8px] tracking-[2px] uppercase text-gold leading-none">Feb</span>
                <span className="font-display text-lg text-ink leading-tight">26</span>
              </div>
              <p className="font-display italic text-lg text-ink mb-1">
                Don&apos;t forget to save the date
              </p>
              <p className="font-body font-light text-xs text-ink-soft mb-5">
                Add our wedding to your calendar so you don&apos;t miss it
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleCalendar("google")}
                  className="flex-1 max-w-[180px] py-3 bg-gold text-white font-body text-[11px] tracking-[3px] uppercase hover:bg-gold-light transition-colors"
                >
                  Google Calendar
                </button>
                <button
                  onClick={() => handleCalendar("ics")}
                  className="flex-1 max-w-[180px] py-3 border-2 border-gold text-gold font-body text-[11px] tracking-[3px] uppercase hover:bg-gold hover:text-white transition-colors"
                >
                  Apple / Outlook
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeUp {
          animation: fadeUp 0.8s ease forwards;
          opacity: 0;
        }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.25s; }
        .animation-delay-300 { animation-delay: 0.4s; }
        .animation-delay-400 { animation-delay: 0.55s; }
        .animation-delay-500 { animation-delay: 0.65s; }
        .animation-delay-600 { animation-delay: 0.75s; }
        .animation-delay-700 { animation-delay: 0.85s; }
        .animation-delay-800 { animation-delay: 0.95s; }
      `}</style>
    </div>
  );
}
