"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-sand flex items-center justify-center p-6">
      <div className="bg-[#FAF4EF] max-w-[420px] w-full border border-gold-pale/60 p-10 text-center shadow-[0_2px_20px_rgba(36,76,58,0.10)]">
        <p className="font-body font-normal text-[10px] tracking-[6px] uppercase text-gold mb-6">
          Lauren &amp; Nathan
        </p>
        <p className="font-display italic text-2xl text-ink mb-3">
          Something hiccuped
        </p>
        <p className="font-body font-light text-[14px] text-ink-soft mb-8 leading-relaxed">
          Give it another try — and if it keeps happening, text Nathan &amp;
          Lauren and they&apos;ll sort it out.
        </p>
        <button
          onClick={reset}
          className="py-3 px-8 bg-gold-deep text-white font-body font-medium text-[12px] tracking-[3px] uppercase hover:bg-gold-deep/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
