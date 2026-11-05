import { useState } from "react";
import { Star } from "lucide-react";
import { STAR_LABELS } from "@/lib/tags";

export function StarGate({ onRate }: { onRate: (rating: number) => void }) {
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);
  const active = hover || picked;

  function choose(n: number) {
    if (picked) return;
    setPicked(n);
    window.setTimeout(() => onRate(n), 320);
  }

  return (
    <section data-testid="star-gate" className="px-5 pb-10 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#B45309]">Takes 20 seconds · No login</p>
      <h2 className="mt-2 font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#1C1917]">
        How was your dining experience today?
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">
        Tap a star. Honest answers help our kitchen get better every day.
      </p>

      <div
        className="mt-8 rounded-3xl border border-[#EFEAE1] bg-white p-5 shadow-[0_12px_40px_-20px_rgba(120,53,15,0.35)]"
        onMouseLeave={() => setHover(0)}
      >
        <div className="flex justify-between" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={picked === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              data-testid={`star-${n}-button`}
              onMouseEnter={() => setHover(n)}
              onClick={() => choose(n)}
              className="grid size-14 place-items-center rounded-2xl transition-[transform,background-color] duration-150 hover:scale-110 hover:bg-[#FFFBEB] active:scale-95"
            >
              <Star
                className={`size-10 transition-[color,fill] duration-150 ${
                  n <= active ? "fill-[#F59E0B] text-[#F59E0B]" : "fill-transparent text-[#D6D3D1]"
                } ${picked === n ? "animate-star-pop" : ""}`}
                strokeWidth={1.6}
              />
            </button>
          ))}
        </div>
        <p
          data-testid="star-label"
          className="mt-4 h-6 text-center font-heading text-lg font-medium italic text-[#78350F]"
        >
          {STAR_LABELS[active] ?? ""}
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-[#78716C]">
        We never ask for your name, phone or email.
      </p>
    </section>
  );
}
