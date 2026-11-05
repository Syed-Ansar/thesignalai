import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArcadeButton, GhostButton, SPRING_POP } from "@/components/guest/GuestKit";
import { cookingLines } from "@/lib/tags";

/** Restaurant loading splash. */
export function SplashScreen() {
  return (
    <div data-testid="guest-loading" className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
      <div className="animate-bounce-soft text-[72px] leading-none" aria-hidden>
        🍽️
      </div>
      <p className="mt-6 font-display text-[22px] font-bold tracking-[-0.02em] text-[var(--g-ink)]">Setting your table…</p>
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2.5 animate-bounce-soft rounded-full bg-[var(--g-accent)]" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

/** Full-screen "AI is cooking" loader shown while the draft is written. */
export function CookingScreen({ dishes }: { dishes: string[] }) {
  const lines = cookingLines(dishes);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % lines.length), 950);
    return () => window.clearInterval(t);
  }, [lines.length]);

  return (
    <section data-testid="cooking-screen" className="flex flex-1 flex-col items-center justify-center px-[var(--g-pad)] py-16 text-center" aria-live="polite">
      <div className="relative">
        {[0, 1, 2].map((s) => (
          <span
            key={s}
            aria-hidden
            className="absolute -top-6 block size-5 animate-steam rounded-full bg-[var(--g-muted)]/40 blur-[3px]"
            style={{ left: `${26 + s * 22}%`, animationDelay: `${s * 0.5}s` }}
          />
        ))}
        <div className="grid size-[150px] place-items-center rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--g-accent)_22%,transparent)_0%,transparent_70%)]">
          <span className="animate-wiggle text-[86px] leading-none" aria-hidden>
            🥘
          </span>
        </div>
      </div>
      <h2 className="mt-4 font-display text-[26px] font-bold leading-tight tracking-[-0.03em]">Chef AI is cooking your post</h2>
      <div className="mt-2 h-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p key={i} data-testid="cooking-line" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.25 }} className="text-[15px] font-medium text-[var(--g-muted)]">
            {lines[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-8 h-3 w-full max-w-[260px] overflow-hidden rounded-full bg-[var(--g-line)]">
        <motion.div className="h-full rounded-full bg-[var(--g-accent)]" initial={{ width: "6%" }} animate={{ width: "94%" }} transition={{ duration: 3.2, ease: "easeOut" }} />
      </div>
      <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--g-muted)]">+30 coins on the way</p>
    </section>
  );
}

export interface ScreenAction {
  label: ReactNode;
  onClick: () => void;
  testId: string;
  primary?: boolean;
}

/** Friendly full-screen error / empty state with recovery actions. */
export function ErrorScreen({ emoji, title, body, actions, testId }: { emoji: string; title: string; body: string; actions: ScreenAction[]; testId: string }) {
  return (
    <section data-testid={testId} className="flex flex-1 flex-col items-center justify-center px-[var(--g-pad)] py-14 text-center">
      <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING_POP} className="grid size-[120px] place-items-center rounded-[32px] bg-[var(--g-card)] text-[64px] leading-none shadow-[0_20px_40px_-24px_rgba(0,0,0,0.4)] ring-1 ring-[var(--g-line)]" aria-hidden>
        {emoji}
      </motion.div>
      <h2 data-testid={`${testId}-title`} className="mt-7 max-w-[320px] font-display text-[25px] font-bold leading-tight tracking-[-0.03em] text-[var(--g-ink)]">
        {title}
      </h2>
      <p className="mt-2 max-w-[320px] text-[15px] leading-relaxed text-[var(--g-muted)]">{body}</p>
      <div className="mt-8 flex w-full max-w-[340px] flex-col gap-3">
        {actions.map((a) =>
          a.primary ? (
            <ArcadeButton key={a.testId} data-testid={a.testId} onClick={a.onClick}>
              {a.label}
            </ArcadeButton>
          ) : (
            <GhostButton key={a.testId} data-testid={a.testId} onClick={a.onClick} className="w-full">
              {a.label}
            </GhostButton>
          ),
        )}
      </div>
    </section>
  );
}
