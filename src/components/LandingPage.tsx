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
            <span className="font-display italic font-light text-3xl text-gold">&</span>
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
          <p className="font-display italic text-lg text-ink-soft mt-1">
            Cancún, Mexico
          </p>
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
