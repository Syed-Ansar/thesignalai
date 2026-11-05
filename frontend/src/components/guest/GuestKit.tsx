import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowLeft, Check, Star, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { STAR_FACES, STAR_LABELS } from "@/lib/tags";

export const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 28 } as const;
export const SPRING_POP = { type: "spring", stiffness: 500, damping: 15 } as const;
export const SPRING_LEVEL = { type: "spring", stiffness: 300, damping: 30 } as const;

/** Chunky arcade button: solid accent with a pressed-down bottom edge. */
export function ArcadeButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={`relative inline-flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[var(--g-btn-r)] bg-[var(--g-accent)] px-6 font-display text-[16px] font-bold tracking-[0.01em] text-[var(--g-on-accent)] shadow-[0_5px_0_0_color-mix(in_srgb,var(--g-accent)_62%,#000)] transition-[transform,box-shadow,opacity] duration-100 hover:brightness-105 active:translate-y-[4px] active:shadow-[0_1px_0_0_color-mix(in_srgb,var(--g-accent)_62%,#000)] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0_0_color-mix(in_srgb,var(--g-accent)_62%,#000)] ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-[var(--g-btn-r)] border-2 border-[var(--g-line)] bg-[var(--g-card)] px-4 text-[14px] font-semibold text-[var(--g-card-ink)] transition-[border-color,transform] duration-150 hover:border-[var(--g-accent)] active:scale-[0.97] disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}

export function TextButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-[14px] font-semibold text-[var(--g-muted)] underline-offset-4 transition-colors duration-150 hover:text-[var(--g-ink)] hover:underline disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}

export function LevelHead({ kicker, title, sub }: { kicker: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <span data-testid="level-kicker" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--g-ink)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--g-bg)]">
        {kicker}
      </span>
      <h2 data-testid="level-title" className="mt-3 font-display text-[28px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[30px]">
        {title}
      </h2>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-[var(--g-muted)]">{sub}</p>}
    </div>
  );
}

/** Sticky bottom action dock that fades into the page. */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-[var(--g-pad)] mt-auto bg-[linear-gradient(to_top,var(--g-bg)_70%,transparent)] px-[var(--g-pad)] pb-[max(1.1rem,env(safe-area-inset-bottom))] pt-7">
      {children}
    </div>
  );
}

export function Tile({ label, emoji, selected, onClick, testId }: { label: string; emoji: string; selected: boolean; onClick: () => void; testId: string }) {
  return (
    <motion.button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      transition={SPRING_SNAPPY}
      className={`relative flex min-h-[100px] w-full flex-col items-start justify-between gap-2 rounded-[var(--g-card-r)] border-2 p-3.5 text-left text-[var(--g-card-ink)] transition-[background-color,border-color,box-shadow] duration-200 ${
        selected
          ? "border-[var(--g-accent)] bg-[color-mix(in_srgb,var(--g-accent)_11%,var(--g-card))] shadow-[0_6px_0_-2px_color-mix(in_srgb,var(--g-accent)_40%,transparent)]"
          : "border-[var(--g-line)] bg-[var(--g-card)] shadow-[0_4px_0_-2px_var(--g-line)]"
      }`}
    >
      <motion.span aria-hidden animate={selected ? { scale: [1, 1.4, 1], rotate: [0, -14, 0] } : { scale: 1, rotate: 0 }} transition={{ duration: 0.4 }} className="text-[30px] leading-none">
        {emoji}
      </motion.span>
      <span className="text-[14px] font-semibold leading-snug">{label}</span>
      <AnimatePresence>
        {selected && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_POP} className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-[var(--g-accent)] text-[var(--g-on-accent)]">
            <Check className="size-3.5" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function Chip({ label, emoji, selected, onClick, testId }: { label: string; emoji?: string; selected: boolean; onClick: () => void; testId: string }) {
  return (
    <motion.button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={SPRING_SNAPPY}
      className={`inline-flex min-h-[var(--g-tap)] items-center gap-2 rounded-[var(--g-chip-r)] border-2 px-4 text-[14px] font-semibold transition-[background-color,color,border-color] duration-150 ${
        selected
          ? "border-[var(--g-accent)] bg-[var(--g-accent)] text-[var(--g-on-accent)]"
          : "border-[var(--g-line)] bg-[var(--g-card)] text-[var(--g-card-ink)] hover:border-[var(--g-accent)]"
      }`}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      {label}
    </motion.button>
  );
}

export interface Pop {
  id: number;
  amount: number;
}

interface HudProps {
  name: string;
  location: string;
  coins: number;
  pops: Pop[];
  rail: string[];
  current: number;
  onBack?: () => void;
}

export function Hud({ name, location, coins, pops, rail, current, onBack }: HudProps) {
  return (
    <header data-testid="guest-hud" className="sticky top-0 z-20 border-b border-[var(--g-line)] bg-[color-mix(in_srgb,var(--g-bg)_82%,transparent)] px-[var(--g-pad)] pb-3 pt-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <AnimatePresence initial={false}>
          {onBack && (
            <motion.button
              type="button"
              data-testid="hud-back-button"
              aria-label="Go back"
              onClick={onBack}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 40, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="grid h-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--g-line)] bg-[var(--g-card)] text-[var(--g-card-ink)] transition-[border-color] duration-150 hover:border-[var(--g-accent)]"
            >
              <ArrowLeft className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
        <div className="min-w-0 flex-1">
          <h1 data-testid="guest-restaurant-name" className="truncate font-display text-[19px] font-bold leading-tight tracking-[-0.02em]">
            {name}
          </h1>
          {location && (
            <p data-testid="guest-restaurant-location" className="truncate text-[12px] font-medium text-[var(--g-muted)]">
              {location}
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <div data-testid="hud-coins" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--g-ink)] py-1.5 pl-1.5 pr-3 text-[var(--g-bg)] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)]">
            <span aria-hidden className="grid size-6 animate-coin-spin place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#FDE68A,#F59E0B_60%,#B45309)] text-[11px] font-black text-[#78350F] ring-2 ring-[#FCD34D]/50">
              ★
            </span>
            <motion.span key={coins} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING_POP} data-testid="hud-coins-count" className="font-display text-[15px] font-bold tabular-nums">
              {coins}
            </motion.span>
            <span className="sr-only">coins</span>
          </div>
          <AnimatePresence>
            {pops.map((p) => (
              <motion.span
                key={p.id}
                data-testid="coin-pop"
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, y: 20, scale: 1 }}
                exit={{ opacity: 0, y: 34, scale: 0.8 }}
                transition={SPRING_POP}
                className="pointer-events-none absolute right-0 top-full whitespace-nowrap rounded-full bg-[#FBBF24] px-2 py-0.5 font-display text-[12px] font-black text-[#78350F] shadow-md"
              >
                +{p.amount}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div data-testid="level-rail" className="mt-3 flex gap-1.5" aria-label={`Level ${current + 1} of ${rail.length}`}>
        {rail.map((label, i) => (
          <div key={label} className="min-w-0 flex-1">
            <div className="relative h-2 overflow-hidden rounded-full bg-[var(--g-line)]">
              <motion.div className="absolute inset-y-0 left-0 rounded-full bg-[var(--g-accent)]" initial={false} animate={{ width: i <= current ? "100%" : "0%" }} transition={SPRING_LEVEL} />
              {i === current && <span aria-hidden className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.65)_50%,transparent_100%)] bg-[length:200%_100%]" />}
            </div>
            <p className={`mt-1 truncate text-[10px] font-bold uppercase tracking-[0.1em] ${i === current ? "text-[var(--g-ink)]" : "text-[var(--g-muted)]"}`}>{label}</p>
          </div>
        ))}
      </div>
    </header>
  );
}

export function OfflineBanner({ online }: { online: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {!online && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div data-testid="offline-banner" role="status" className="flex items-center gap-2 bg-[#451A03] px-[var(--g-pad)] py-2.5 text-[13px] font-medium text-[#FEF3C7]">
            <WifiOff className="size-4 shrink-0" /> You are offline. Your review draft will still work locally.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RateStars({ onRate }: { onRate: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);
  const active = hover || picked;
  return (
    <div className="rounded-[var(--g-card-r)] bg-[var(--g-card)] px-4 pb-5 pt-6 text-[var(--g-card-ink)] shadow-[0_24px_50px_-30px_rgba(0,0,0,0.35)] ring-1 ring-[var(--g-line)]" onMouseLeave={() => setHover(0)}>
      <motion.div key={active} data-testid="rate-face" initial={{ scale: 0.5, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING_POP} className="text-center text-[68px] leading-none" aria-hidden>
        {STAR_FACES[active]}
      </motion.div>
      <p data-testid="star-label" className="mt-3 h-6 text-center font-display text-[17px] font-bold">
        {STAR_LABELS[active]}
      </p>
      <div className="mt-4 flex justify-between" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={picked === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            data-testid={`star-${n}-button`}
            onMouseEnter={() => setHover(n)}
            whileTap={{ scale: 0.8 }}
            whileHover={{ scale: 1.12, rotate: -6 }}
            transition={SPRING_SNAPPY}
            onClick={() => {
              if (picked) return;
              setPicked(n);
              window.setTimeout(() => onRate(n), 480);
            }}
            className="grid size-[56px] place-items-center rounded-2xl"
          >
            <Star
              strokeWidth={1.6}
              className={`size-11 transition-[color,fill] duration-150 ${n <= active ? "fill-[#F59E0B] text-[#D97706]" : "fill-transparent text-[#A8A29E]"} ${picked && n <= picked ? "animate-star-pop" : ""}`}
              style={picked && n <= picked ? { animationDelay: `${n * 50}ms` } : undefined}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["var(--g-accent)", "#FBBF24", "#FFFFFF", "#F472B6", "#34D399", "#60A5FA"];

export function Confetti() {
  return (
    <div aria-hidden data-testid="confetti" className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {Array.from({ length: 34 }).map((_, i) => (
        <span
          key={i}
          className="absolute -top-4 block animate-confetti rounded-[2px]"
          style={{
            left: `${(i * 29) % 100}%`,
            width: i % 3 ? 8 : 12,
            height: i % 3 ? 12 : 6,
            animationDelay: `${(i % 7) * 0.09}s`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          }}
        />
      ))}
    </div>
  );
}
