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
}

interface Props {
  guest: {
    slug: string;
    name: string;
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
}

export default function GuestPageClient({ guest, members: initialMembers, note, phase, videoUrl, roomBlockLink }: Props) {
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

  // Checklist state
  const [checklist, setChecklist] = useState({
    passportConfirmed: guest.passportConfirmed,
    flightsBooked: guest.flightsBooked,
    flightDetails: guest.flightDetails || "",
    hotelBooked: guest.hotelBooked,
    hotelInRoomBlock: guest.hotelInRoomBlock ?? true,
    transportNeeded: guest.transportNeeded ?? false,
    arrivalDate: guest.arrivalDate || "",
    departureDate: guest.departureDate || "",
    emergencyContact: guest.emergencyContact || "",
    songRequest: guest.songRequest || "",
    messageToCouple: guest.messageToCouple || "",
  });
  const [checklistSubmitting, setChecklistSubmitting] = useState(false);

  // Track open on mount
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: guest.slug, action: "opened" }),
    }).catch(() => {});
  }, [guest.slug]);

  const firstName = guest.name.split(/\s*&\s*|\s+and\s+/i)[0].trim();

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

  async function handleRsvpSubmit() {
    setRsvpSubmitting(true);
    try {
      const members = rsvpMembers.map((m) => ({
        id: m.id,
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
        body: JSON.stringify({ slug: guest.slug, members }),
      });
      if (res.ok) setRsvpSubmitted(true);
    } finally {
      setRsvpSubmitting(false);
    }
  }

  async function handleChecklistSubmit() {
    setChecklistSubmitting(true);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: guest.slug, ...checklist }),
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
    "w-full px-4 py-3 bg-white border border-gold-pale rounded-none text-sm font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold transition-colors";

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
              <span className="font-display italic font-light text-2xl text-gold">
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
              <p className="font-display italic text-base text-ink-soft leading-relaxed px-4">
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
                    className="w-full py-3.5 bg-gold text-white font-body font-normal text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
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
              {videoUrl && !rsvpSubmitted && (
                <div className="mb-8">
                  <div className="aspect-video w-full">
                    <iframe
                      src={videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {rsvpSubmitted ? (
                <div className="py-4">
                  <p className="font-body font-light text-sm text-ink-soft mb-1">
                    Thank you for your RSVP!
                  </p>
                  <p className="font-body font-light text-xs text-ink-faint">
                    {rsvpMembers.filter((m) => m.rsvpStatus === "coming").length > 0
                      ? `We can't wait to celebrate with you in Cancún!`
                      : "We'll miss you! Thank you for letting us know."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <p className="font-body font-light text-[11px] tracking-[2px] uppercase text-ink-soft text-center mb-4">
                    RSVP for your household
                  </p>

                  {rsvpMembers.map((m, i) => (
                    <div key={m.id} className="border border-gold-pale/40 p-4 space-y-3">
                      <p className="font-body font-medium text-sm text-ink">
                        {m.firstName} {m.lastName}
                        {m.isChild && <span className="text-xs text-ink-faint ml-2">(child)</span>}
                      </p>

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
                              {[["salmon", "Salmon"], ["chicken_fettuccine", "Chicken Fettuccine"]].map(([val, label]) => (
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
                      <label className="flex items-center gap-2 font-body text-sm text-ink cursor-pointer">
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
                              {[["salmon", "Salmon"], ["chicken_fettuccine", "Chicken Fettuccine"]].map(([val, label]) => (
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

                  <button
                    onClick={handleRsvpSubmit}
                    disabled={rsvpSubmitting || rsvpMembers.some((m) => !m.rsvpStatus)}
                    className="w-full py-3.5 bg-gold text-white font-body font-normal text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
                  >
                    {rsvpSubmitting ? "Submitting..." : "Submit RSVP"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Travel Checklist */}
          {(phase === "checklist" || phase === "final") && rsvpSubmitted && rsvpMembers.some((m) => m.rsvpStatus === "coming") && (
            <div className="mt-8 animate-fadeUp animation-delay-700">
              <div className="w-10 h-px bg-gold mx-auto mb-8" />

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
                  <p className="font-body font-light text-[11px] tracking-[2px] uppercase text-ink-soft text-center mb-4">
                    Travel checklist
                  </p>

                  {/* Hotel */}
                  <div className="border border-gold-pale/40 p-4 space-y-3">
                    <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Hotel</p>
                    {roomBlockLink && (
                      <a href={roomBlockLink} target="_blank" rel="noopener" className="block py-2.5 text-center bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors">
                        Book Your Room
                      </a>
                    )}
                    <label className="flex items-center gap-2 font-body text-sm text-ink">
                      <input type="checkbox" checked={checklist.hotelBooked} onChange={(e) => setChecklist({ ...checklist, hotelBooked: e.target.checked })} />
                      I have booked my hotel
                    </label>
                    {checklist.hotelBooked && (
                      <label className="flex items-center gap-2 font-body text-xs text-ink-soft ml-6">
                        <input type="checkbox" checked={!checklist.hotelInRoomBlock} onChange={(e) => setChecklist({ ...checklist, hotelInRoomBlock: !e.target.checked })} />
                        I booked outside the room block
                      </label>
                    )}
                  </div>

                  {/* Passport */}
                  <div className="border border-gold-pale/40 p-4">
                    <label className="flex items-center gap-2 font-body text-sm text-ink">
                      <input type="checkbox" checked={checklist.passportConfirmed} onChange={(e) => setChecklist({ ...checklist, passportConfirmed: e.target.checked })} />
                      I have a valid passport (expires after April 2027)
                    </label>
                  </div>

                  {/* Flights */}
                  <div className="border border-gold-pale/40 p-4 space-y-3">
                    <label className="flex items-center gap-2 font-body text-sm text-ink">
                      <input type="checkbox" checked={checklist.flightsBooked} onChange={(e) => setChecklist({ ...checklist, flightsBooked: e.target.checked })} />
                      I have booked my flights
                    </label>
                    {checklist.flightsBooked && (
                      <input type="text" value={checklist.flightDetails} onChange={(e) => setChecklist({ ...checklist, flightDetails: e.target.value })} placeholder="Flight number(s) and dates" className={inputClass} />
                    )}
                  </div>

                  {/* Dates & Transport */}
                  <div className="border border-gold-pale/40 p-4 space-y-3">
                    <p className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">Travel dates</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" value={checklist.arrivalDate} onChange={(e) => setChecklist({ ...checklist, arrivalDate: e.target.value })} className={inputClass} />
                      <input type="date" value={checklist.departureDate} onChange={(e) => setChecklist({ ...checklist, departureDate: e.target.value })} className={inputClass} />
                    </div>
                    <label className="flex items-center gap-2 font-body text-sm text-ink">
                      <input type="checkbox" checked={checklist.transportNeeded} onChange={(e) => setChecklist({ ...checklist, transportNeeded: e.target.checked })} />
                      I need airport transportation
                    </label>
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
                    className="w-full py-3.5 bg-gold text-white font-body font-normal text-[13px] tracking-[3px] uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
                  >
                    {checklistSubmitting ? "Submitting..." : "Submit Checklist"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Calendar buttons */}
          <div className="mt-8 animate-fadeUp animation-delay-800">
            <p className="font-body font-light text-[11px] tracking-[2px] uppercase text-ink-faint mb-3">
              Add to your calendar
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleCalendar("google")}
                className="px-5 py-2.5 border border-gold-pale text-gold font-body text-[11px] tracking-[2px] uppercase hover:bg-sand hover:border-gold transition-colors"
              >
                Google
              </button>
              <button
                onClick={() => handleCalendar("ics")}
                className="px-5 py-2.5 border border-gold-pale text-gold font-body text-[11px] tracking-[2px] uppercase hover:bg-sand hover:border-gold transition-colors"
              >
                Apple / Outlook
              </button>
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
