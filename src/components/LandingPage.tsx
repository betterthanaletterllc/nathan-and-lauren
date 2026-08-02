"use client";

import { useEffect, useState } from "react";

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  function getTimeLeft(target: Date) {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function LandingPage() {
  const weddingDate = new Date("2027-02-26T00:00:00");
  const { days, hours, minutes, seconds } = useCountdown(weddingDate);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Find your invitation
  const [findQuery, setFindQuery] = useState("");
  const [findError, setFindError] = useState("");
  const [finding, setFinding] = useState(false);

  async function handleFind(e: React.FormEvent) {
    e.preventDefault();
    if (!findQuery.trim() || finding) return;
    setFinding(true);
    setFindError("");
    try {
      const res = await fetch("/api/find-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: findQuery }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.slug) {
        window.location.href = `/guest/${data.slug}`;
      } else if (res.status === 429) {
        setFindError("Too many tries — give it a minute and try again.");
        setFinding(false);
      } else {
        setFindError("Hmm, we couldn’t find that one — double-check the spelling, or text Nathan & Lauren.");
        setFinding(false);
      }
    } catch {
      setFindError("Something went wrong — please try again.");
      setFinding(false);
    }
  }

  return (
    <div className="min-h-dvh bg-sand flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-b from-gold/[0.03] to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-t from-gold/[0.02] to-transparent" />
      </div>

      <div className="relative max-w-lg w-full text-center">
        {/* Top ornament */}
        <div className="flex items-center justify-center gap-4 mb-10 animate-fadeUp">
          <span className="w-16 h-px bg-gradient-to-r from-transparent to-gold/60" />
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gold/50" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
          </svg>
          <span className="w-16 h-px bg-gradient-to-l from-transparent to-gold/60" />
        </div>

        {/* Names */}
        <div className="animate-fadeUp animation-delay-100">
          <p className="font-body font-normal text-[10px] tracking-[8px] uppercase text-gold mb-6">
            The wedding of
          </p>
          <h1 className="font-display font-light text-[clamp(42px,12vw,64px)] leading-[1.1] text-ink mb-1">
            Nathan
          </h1>
          <div className="flex items-center justify-center gap-5 my-3">
            <span className="w-14 h-px bg-gold" />
            <span className="font-display font-medium text-[34px] text-gold">&</span>
            <span className="w-14 h-px bg-gold" />
          </div>
          <h1 className="font-display font-light text-[clamp(42px,12vw,64px)] leading-[1.1] text-ink">
            Lauren
          </h1>
        </div>

        {/* Date & Location */}
        <div className="mt-8 mb-10 animate-fadeUp animation-delay-200">
          <p className="font-body font-light text-sm tracking-[4px] uppercase text-ink-soft">
            February 26, 2027
          </p>
          <a
            href="https://maps.app.goo.gl/zKjtXDLcCCqqwTb57"
            target="_blank"
            rel="noopener"
            className="block mt-2 group"
          >
            <p className="font-display italic text-lg text-ink-soft group-hover:text-gold transition-colors">
              Dreams Sapphire Resort & Spa
            </p>
            <p className="font-body font-light text-xs tracking-[3px] uppercase text-ink-faint mt-0.5">
              Riviera Cancún, Mexico
            </p>
          </a>
        </div>

        {/* Animated waves */}
        <svg
          viewBox="0 0 300 24"
          className="w-56 mx-auto mb-10 animate-fadeUp animation-delay-300"
        >
          <path
            d="M10 12 Q75 2, 150 12 T290 12"
            fill="none"
            stroke="#C4956A"
            strokeWidth="0.5"
            opacity="0.5"
          >
            <animate
              attributeName="d"
              values="M10 12 Q75 2, 150 12 T290 12;M10 12 Q75 22, 150 12 T290 12;M10 12 Q75 2, 150 12 T290 12"
              dur="6s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M10 14 Q75 4, 150 14 T290 14"
            fill="none"
            stroke="#C4956A"
            strokeWidth="0.3"
            opacity="0.3"
          >
            <animate
              attributeName="d"
              values="M10 14 Q75 24, 150 14 T290 14;M10 14 Q75 4, 150 14 T290 14;M10 14 Q75 24, 150 14 T290 14"
              dur="6s"
              repeatCount="indefinite"
            />
          </path>
        </svg>

        {/* Countdown */}
        <div className="animate-fadeUp animation-delay-400">
          <p className="font-body font-normal text-[10px] tracking-[6px] uppercase text-gold mb-6">
            Counting down
          </p>

          {mounted ? (
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              {[
                { value: days, label: "Days" },
                { value: hours, label: "Hours" },
                { value: minutes, label: "Minutes" },
                { value: seconds, label: "Seconds" },
              ].map(({ value, label }, i) => (
                <div key={label} className="flex items-center gap-3 sm:gap-5">
                  <div className="text-center">
                    <div className="w-[68px] sm:w-[80px] h-[68px] sm:h-[80px] border border-gold/40 flex items-center justify-center mb-2">
                      <span className="font-display text-3xl sm:text-4xl text-ink tabular-nums">
                        {String(value).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="font-body font-light text-[9px] tracking-[3px] uppercase text-ink-faint">
                      {label}
                    </p>
                  </div>
                  {i < 3 && (
                    <span className="font-display text-xl text-gold/40 mb-5">:</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[96px]" />
          )}
        </div>

        {/* Find your invitation */}
        <div className="mt-12 border border-gold/30 bg-gold/5 p-6 sm:p-7 text-left animate-fadeUp animation-delay-500">
          <p className="font-body font-normal text-[10px] tracking-[4px] uppercase text-gold text-center mb-2">
            Find your invitation
          </p>
          <p className="font-body font-light text-xs text-ink-soft text-center mb-4">
            Look yourself up to see your RSVP, travel details, and the weekend schedule.
          </p>
          <form onSubmit={handleFind} className="flex gap-2">
            <input
              type="text"
              value={findQuery}
              onChange={(e) => { setFindQuery(e.target.value); setFindError(""); }}
              placeholder="Name or phone number"
              aria-label="Your name or phone number"
              className="flex-1 min-w-0 px-4 py-3 bg-white border border-gold-pale text-sm font-body font-light text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={finding}
              className="px-6 py-3 bg-gold text-white font-body font-normal text-[12px] tracking-[3px] uppercase hover:bg-gold-light transition-colors disabled:opacity-60"
            >
              {finding ? "..." : "Find"}
            </button>
          </form>
          {findError && (
            <p className="font-body font-light text-xs text-[#A0522D] text-center mt-3">{findError}</p>
          )}
        </div>

        {/* Bottom ornament */}
        <div className="flex items-center justify-center gap-4 mt-12 animate-fadeUp animation-delay-500">
          <span className="w-16 h-px bg-gradient-to-r from-transparent to-gold/60" />
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gold/50" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
          </svg>
          <span className="w-16 h-px bg-gradient-to-l from-transparent to-gold/60" />
        </div>
      </div>

      {/* Admin login - bottom of page */}
      <a
        href="/dashboard"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 font-body font-light text-[10px] tracking-[2px] uppercase text-ink-faint/30 hover:text-ink-faint transition-colors"
      >
        Manage
      </a>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 1s ease forwards;
          opacity: 0;
        }
        .animation-delay-100 { animation-delay: 0.15s; }
        .animation-delay-200 { animation-delay: 0.35s; }
        .animation-delay-300 { animation-delay: 0.55s; }
        .animation-delay-400 { animation-delay: 0.75s; }
        .animation-delay-500 { animation-delay: 0.95s; }
      `}</style>
    </div>
  );
}
