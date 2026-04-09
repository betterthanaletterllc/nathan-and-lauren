"use client";

import { useEffect, useState } from "react";

interface Props {
  guest: { slug: string; name: string; addressSubmitted: boolean };
  note: string;
}

export default function GuestPageClient({ guest, note }: Props) {
  const [submitted, setSubmitted] = useState(guest.addressSubmitted);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

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
        "&dates=20270227/20270228" +
        "&details=" + encodeURIComponent("Nathan & Lauren's Wedding\n\nMore details at nathanandlauren.com") +
        "&location=" + encodeURIComponent("Cancún, Mexico");
      window.open(url, "_blank");
    } else {
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NathanAndLauren//Wedding//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20270227",
        "DTEND;VALUE=DATE:20270228",
        "SUMMARY:Nathan & Lauren's Wedding",
        "DESCRIPTION:Nathan & Lauren's Wedding — Cancún\\, Mexico\\nMore details at nathanandlauren.com",
        "LOCATION:Cancún, Mexico",
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
              <span className="font-display text-[34px] text-ink">27</span>
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
            <p className="font-display italic text-xl text-ink mb-1">
              Cancún, Mexico
            </p>
            <p className="font-body font-light text-[11px] tracking-[3px] uppercase text-ink-faint">
              All-inclusive resort · details to follow
            </p>
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

          {/* Divider */}
          <div className="w-10 h-px bg-gold mx-auto mb-8 animate-fadeUp animation-delay-600" />

          {/* Address form or thank you */}
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
